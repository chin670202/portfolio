/**
 * 把資產變化記錄的「債券市價」與「債券面額」拆成獨立欄位。
 *
 * 問題：部位總額是彙總值，2026/07/17 前用市價、之後改用面額（見既有的 債券計價基準 欄），
 * 兩段基準不同，直接比對或畫趨勢圖會在切換點出現假性落差。
 *
 * 方法：還原匯率30部位總額 與 部位總額 用的是同一批持倉，只有匯率不同（30 vs 當時匯率），
 * 台幣資產（ETF 等）在相減時會消掉，因此
 *
 *     USD 部位 = (部位總額 − 還原匯率30部位總額) / (匯率 − 30)
 *
 * 這是代數恆等式，不是估計。USD 部位 = 債券 + 其它資產(USD)，
 * 其中其它資產(USD) 由 7 筆「面額」列反解得出（該列債券必為面額 1,800,000 USD）。
 *
 * 驗證：面額列回推的隱含債券報價為 99.8~100.2（理論值 100），誤差 <0.3%。
 *      2026 年市價列回推 102.1~106.8，與 9 檔債券買入價（97~113、加權均價 103.3）相符。
 *      2025 年市價列回推 121~145 —— 超出合理範圍，代表當時持倉不是現在這 9 檔，故面額不填。
 *
 * 用法：
 *   node scripts/split-bond-valuation.cjs --in live_chin.json --out out.json
 *   node scripts/split-bond-valuation.cjs --user chin [--write] [--remote]
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const WRANGLER = path.join(__dirname, '..', 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d }
const USER = arg('user', 'chin')
const IN = arg('in', null)
const OUT = arg('out', null)
const WRITE = argv.includes('--write')
const REMOTE = argv.includes('--remote')

const BOND_PAR_PER_UNIT = 100
const FIXED_RATE = 30
// 債券面額另外以固定匯率 31 呈現，排除匯率波動，變動只反映持倉本身
const PAR_DISPLAY_RATE = 31
// 隱含報價落在此區間才視為「持倉與當期相同」，否則面額不填
const PLAUSIBLE_PRICE = [90, 120]

function d1(sql) {
  const out = execFileSync(process.execPath,
    [WRANGLER, 'd1', 'execute', 'portfolio-db', REMOTE ? '--remote' : '--local', '--json', '--command', sql],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, cwd: path.join(__dirname, '..'), env: { ...process.env, CI: '1' } })
  return JSON.parse(out.slice(out.indexOf('[')))
}

/** 修復 UTF-8 損毀的欄名（值完好，只有 key 出現 U+FFFD） */
const CANONICAL = ['記錄時間', '美元匯率', '債券計價基準', '部位總額', '負債總額', '還原匯率30部位總額',
  '當時匯率部位總額萬', '台幣負債總額萬', '當時匯率資產總和萬', '還原匯率30部位總額萬', '還原匯率30資產總額萬']

/**
 * 一個損毀的中文字在 UTF-8 下是 3 個位元組，解碼後會變成連續多個 U+FFFD，
 * 所以比對時把「一段連續的 U+FFFD」當成剛好一個未知字元。
 */
function keyMatches(broken, canonical) {
  let i = 0, j = 0
  while (i < broken.length && j < canonical.length) {
    if (broken[i] === '�') {
      while (i < broken.length && broken[i] === '�') i++
      j++                       // 整段 U+FFFD 只吃掉正確欄名的一個字
    } else {
      if (broken[i] !== canonical[j]) return false
      i++; j++
    }
  }
  return i === broken.length && j === canonical.length
}

function repairKeys(rec) {
  const fixes = []
  for (const key of Object.keys(rec)) {
    if (!key.includes('�')) continue
    const hit = CANONICAL.filter(c => keyMatches(key, c))
    if (hit.length === 1) {
      rec[hit[0]] = rec[key]
      delete rec[key]
      fixes.push(key + ' → ' + hit[0])
    } else {
      fixes.push(key + ' → (無法唯一判定，保留原樣)')
    }
  }
  return fixes
}

function main() {
  let data
  if (IN) {
    data = JSON.parse(fs.readFileSync(IN, 'utf8'))
  } else {
    const row = d1(`SELECT data FROM portfolios WHERE user = '${USER}'`)[0]?.results?.[0]
    if (!row) { console.error(`找不到 user=${USER}`); process.exit(1) }
    data = JSON.parse(row.data)
  }

  const parUsd = (data.股票 || []).reduce((s, b) => s + (b.持有單位 || 0) * BOND_PAR_PER_UNIT, 0)
  const records = data.資產變化記錄 || []

  // --- 0. 先修欄名 ---
  console.log('=== 欄名修復 ===')
  let repaired = 0
  for (const r of records) {
    const f = repairKeys(r)
    if (f.length) { repaired++; console.log(`  ${r.記錄時間}: ${f.join(', ')}`) }
  }
  console.log(repaired ? `  共修復 ${repaired} 列\n` : '  無損毀\n')

  const usdPosition = (r) => (r.部位總額 - r.還原匯率30部位總額) / (r.美元匯率 - FIXED_RATE)

  // --- 1. 由面額列反解「其它資產(USD)」 ---
  const parRows = records.filter(r => r.債券計價基準 === '面額')
  if (!parRows.length) { console.error('沒有面額基準的列，無法校準'); process.exit(1) }
  const others = parRows.map(r => usdPosition(r) - parUsd).sort((a, b) => a - b)
  const otherUsd = others[Math.floor(others.length / 2)]
  console.log('=== 校準 ===')
  console.log(`  當期債券面額 : ${parUsd.toLocaleString()} USD (${(data.股票 || []).length} 檔)`)
  console.log(`  面額基準列   : ${parRows.length} 筆`)
  console.log(`  其它資產(USD): ${Math.round(otherUsd).toLocaleString()} (中位數, 全距 ${Math.round(others[0]).toLocaleString()}~${Math.round(others.at(-1)).toLocaleString()})\n`)

  // --- 2. 逐列拆分 ---
  const toWan = (v) => Math.round(v / 10000).toString()
  const stat = { actual: 0, derived: 0, unknown: 0 }

  for (const r of records) {
    const rate = r.美元匯率
    const isParBasis = r.債券計價基準 === '面額'
    const bondUsd = usdPosition(r) - otherUsd
    const impliedPrice = bondUsd / parUsd * 100
    const holdingsMatch = impliedPrice >= PLAUSIBLE_PRICE[0] && impliedPrice <= PLAUSIBLE_PRICE[1]

    // 面額：持倉可確認時才填
    if (holdingsMatch) {
      r.債券面額美元 = parUsd
      r.債券面額台幣 = Math.round(parUsd * rate)          // 當時匯率，供面額基準資產計算用
      r.債券面額萬 = toWan(parUsd * rate)
      r.債券面額匯率31 = Math.round(parUsd * PAR_DISPLAY_RATE)
      r.債券面額匯率31萬 = toWan(parUsd * PAR_DISPLAY_RATE)
    } else {
      delete r.債券面額美元; delete r.債券面額台幣; delete r.債券面額萬
      delete r.債券面額匯率31; delete r.債券面額匯率31萬
    }

    // 市價：面額基準的列當時沒存市價，無法還原
    if (!isParBasis && holdingsMatch) {
      r.債券市價台幣 = Math.round(bondUsd * rate)
      r.債券市價萬 = toWan(bondUsd * rate)
      r.債券隱含報價 = Number(impliedPrice.toFixed(2))
    } else if (!isParBasis) {
      r.債券市價台幣 = Math.round(bondUsd * rate)
      r.債券市價萬 = toWan(bondUsd * rate)
      r.債券隱含報價 = Number(impliedPrice.toFixed(2))
    } else {
      delete r.債券市價台幣; delete r.債券市價萬; delete r.債券隱含報價
    }

    // 統一到「面額基準」的部位總額 —— 讓趨勢圖跨切換點連續
    if (holdingsMatch) {
      const posPar = isParBasis ? r.部位總額 : r.部位總額 - r.債券市價台幣 + r.債券面額台幣
      r.部位總額面額基準 = Math.round(posPar)
      r.部位總額面額基準萬 = toWan(posPar)
      r.淨值面額基準萬 = toWan(posPar - r.負債總額)

      // 面額 @ 固定匯率 31：台幣資產照舊，美元部位一律用面額並以 31 換算，
      // 同時剝掉「行情」與「匯率」兩層雜訊，變動只反映持倉與台幣資產本身。
      // 負債是台幣計價，不做匯率換算。
      const twdPart = r.部位總額 - usdPosition(r) * rate
      const posPar31 = twdPart + (parUsd + otherUsd) * PAR_DISPLAY_RATE
      r.資產面額匯率31 = Math.round(posPar31)
      r.資產面額匯率31萬 = toWan(posPar31)
      r.淨值面額匯率31萬 = toWan(posPar31 - r.負債總額)
    } else {
      delete r.部位總額面額基準; delete r.部位總額面額基準萬; delete r.淨值面額基準萬
      delete r.資產面額匯率31; delete r.資產面額匯率31萬; delete r.淨值面額匯率31萬
    }

    r.債券數據來源 = isParBasis ? 'actual' : (holdingsMatch ? 'derived' : 'unknown')
    stat[r.債券數據來源]++
  }

  // --- 3. 輸出 ---
  console.log('=== 結果 ===')
  console.log('日期        匯率     基準  面額(萬)  市價(萬)  差(萬)  隱含報價  來源')
  for (const r of records) {
    console.log(
      r.記錄時間.padEnd(11), String(r.美元匯率).padEnd(8),
      (r.債券計價基準 === '面額' ? '面額' : '市價'),
      String(r.債券面額萬 ?? '--').padStart(8),
      String(r.債券市價萬 ?? '--').padStart(9),
      String(r.債券面額萬 && r.債券市價萬 ? (+r.債券市價萬 - +r.債券面額萬) : '--').padStart(6),
      String(r.債券隱含報價 ?? '--').padStart(9),
      '  ' + r.債券數據來源)
  }
  console.log(`\nactual ${stat.actual} / derived ${stat.derived} / unknown ${stat.unknown}`)

  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(data, null, 2)); console.log(`\n已寫出 ${OUT}`) }
  if (WRITE) {
    d1(`UPDATE portfolios SET data = '${JSON.stringify(data).replace(/'/g, "''")}', updated_at = ${Date.now()} WHERE user = '${USER}'`)
    console.log(`\n已寫入 D1（${REMOTE ? 'remote' : 'local'}）`)
  }
  if (!OUT && !WRITE) console.log('\n(未指定 --out / --write，僅顯示)')
}

main()
