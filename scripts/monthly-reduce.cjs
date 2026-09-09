/**
 * 把資產變化記錄從每週縮成每月：每個月只保留「資料正確的最後一列」。
 *
 * 「資料正確」的判定（三關，任一不過就往前找同月的上一列）：
 *   1. 必要欄位齊全且為數值（含 UTF-8 損毀欄名 —— 先修復再判斷）
 *   2. 隱含債券報價落在合理區間 —— 由 (部位總額 − 還原匯率30部位總額)/(匯率−30) 推得。
 *      抓價失敗會讓某些債券歸零，報價會明顯偏離。
 *   3. 台幣計價資產不是相對前後鄰居的離群值 —— 抓價失敗常只影響部分商品，
 *      造成單列暴衝/暴跌而前後正常。用「與前後鄰居中位數的偏離幅度」判定。
 *
 * 用法：
 *   node scripts/monthly-reduce.cjs --in a.json --out b.json     # 檔案進出
 *   node scripts/monthly-reduce.cjs --user chin [--write] [--remote]
 *   --keep-all-valid   只丟壞列，不做每月縮減（想先看資料品質時用）
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const WRANGLER = path.join(__dirname, '..', 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d }
const USER = arg('user', 'chin')
const IN = arg('in', null), OUT = arg('out', null)
const WRITE = argv.includes('--write'), REMOTE = argv.includes('--remote')
const KEEP_ALL = argv.includes('--keep-all-valid')

const FIXED_RATE = 30
const PRICE_RANGE = [90, 120]      // 隱含債券報價合理區間
const TWD_OUTLIER = 0.10           // 台幣資產偏離鄰居中位數超過 10% 視為離群

const CANONICAL = ['記錄時間', '美元匯率', '債券計價基準', '部位總額', '負債總額', '還原匯率30部位總額',
  '當時匯率部位總額萬', '台幣負債總額萬', '當時匯率資產總和萬', '還原匯率30部位總額萬', '還原匯率30資產總額萬']
const REQUIRED = ['記錄時間', '美元匯率', '部位總額', '負債總額', '還原匯率30部位總額']

function d1(sql, file) {
  const a = [WRANGLER, 'd1', 'execute', 'portfolio-db', REMOTE ? '--remote' : '--local', '--json']
  a.push(file ? '--file' : '--command', file || sql)
  const out = execFileSync(process.execPath, a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    cwd: path.join(__dirname, '..'), env: { ...process.env, CI: '1' } })
  return JSON.parse(out.slice(out.indexOf('[')))
}

function keyMatches(broken, canonical) {
  let i = 0, j = 0
  while (i < broken.length && j < canonical.length) {
    if (broken[i] === '\uFFFD') { while (i < broken.length && broken[i] === '\uFFFD') i++; j++ }
    else { if (broken[i] !== canonical[j]) return false; i++; j++ }
  }
  return i === broken.length && j === canonical.length
}

function repairKeys(rec) {
  const fixes = []
  for (const key of Object.keys(rec)) {
    if (!key.includes('\uFFFD')) continue
    const hit = CANONICAL.filter(c => keyMatches(key, c))
    if (hit.length === 1) { rec[hit[0]] = rec[key]; delete rec[key]; fixes.push(`${key} → ${hit[0]}`) }
  }
  return fixes
}

const monthOf = (r) => r.記錄時間.slice(0, 7)          // "2026/08"
const usdPos = (r) => (r.部位總額 - r.還原匯率30部位總額) / (r.美元匯率 - FIXED_RATE)
const twdAssets = (r) => r.部位總額 - usdPos(r) * r.美元匯率
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }

function main() {
  let data
  if (IN) data = JSON.parse(fs.readFileSync(IN, 'utf8'))
  else {
    const row = d1(`SELECT data FROM portfolios WHERE user = '${USER}'`)[0]?.results?.[0]
    if (!row) { console.error(`找不到 user=${USER}`); process.exit(1) }
    data = JSON.parse(row.data)
  }

  const recs = (data.資產變化記錄 || []).slice()
  const parUsd = (data.股票 || []).reduce((s, b) => s + (b.持有單位 || 0) * 100, 0)

  // 0. 修復損毀欄名
  let repaired = 0
  for (const r of recs) if (repairKeys(r).length) repaired++
  if (repaired) console.log(`欄名修復：${repaired} 列\n`)

  // 1+2. 逐列健檢
  const twdSeries = recs.map(twdAssets)
  const diag = recs.map((r, i) => {
    const reasons = []
    for (const k of REQUIRED) if (typeof r[k] !== 'number' && k !== '記錄時間') reasons.push(`${k} 非數值`)
    if (!r.記錄時間) reasons.push('缺記錄時間')

    const px = parUsd ? (usdPos(r) / parUsd * 100) : NaN
    // 只有在持倉可比對（台幣資產 > 0，即 2026 之後的結構）時才用報價判定
    const hasTwd = twdSeries[i] > 1e6
    if (hasTwd && Number.isFinite(px) && (px < PRICE_RANGE[0] || px > PRICE_RANGE[1]))
      reasons.push(`隱含報價 ${px.toFixed(1)} 偏離常軌`)

    // 3. 台幣資產離群（比對前後各最多 2 列的中位數）
    const nb = [i - 2, i - 1, i + 1, i + 2].filter(j => j >= 0 && j < recs.length).map(j => twdSeries[j])
    if (hasTwd && nb.length >= 2) {
      const m = median(nb)
      if (m > 1e6) {
        const dev = Math.abs(twdSeries[i] - m) / m
        if (dev > TWD_OUTLIER) reasons.push(`台幣資產偏離鄰居 ${(dev * 100).toFixed(1)}%`)
      }
    }
    return { rec: r, ok: reasons.length === 0, reasons, twd: twdSeries[i], px }
  })

  const bad = diag.filter(d => !d.ok)
  console.log(`=== 健檢：${recs.length} 列中 ${bad.length} 列有疑慮 ===`)
  for (const b of bad) console.log(`  ${b.rec.記錄時間}  ${b.reasons.join('; ')}`)
  console.log()

  // 4. 每月取「正確的最後一列」
  const byMonth = new Map()
  for (const d of diag) {
    const m = monthOf(d.rec)
    if (!byMonth.has(m)) byMonth.set(m, [])
    byMonth.get(m).push(d)
  }

  const kept = []
  console.log('=== 每月挑選 ===')
  for (const [m, list] of [...byMonth.entries()].sort()) {
    let pick = null
    for (let i = list.length - 1; i >= 0; i--) if (list[i].ok) { pick = list[i]; break }
    const dropped = list.filter(x => x !== pick).map(x => x.rec.記錄時間.slice(8))
    if (pick) {
      kept.push(pick.rec)
      const fellBack = list[list.length - 1] !== pick
      console.log(`  ${m}  留 ${pick.rec.記錄時間}` +
        (fellBack ? `  ← 最後一列 ${list[list.length - 1].rec.記錄時間} 未過健檢，往前取` : '') +
        (dropped.length ? `   (捨 ${dropped.join(',')})` : ''))
    } else {
      console.log(`  ${m}  ⚠ 整月都沒有通過健檢的列 —— 全月保留原樣以免遺失`)
      list.forEach(x => kept.push(x.rec))
    }
  }

  const result = KEEP_ALL ? diag.filter(d => d.ok).map(d => d.rec) : kept
  result.sort((a, b) => a.記錄時間.localeCompare(b.記錄時間))
  data.資產變化記錄 = result

  console.log(`\n${recs.length} 列 → ${result.length} 列`)

  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(data, null, 2)); console.log(`已寫出 ${OUT}`) }
  if (WRITE) {
    const tmp = path.join(__dirname, '..', '.wrangler', `_reduce_${Date.now()}.sql`)
    fs.writeFileSync(tmp, `UPDATE portfolios SET data = '${JSON.stringify(data).replace(/'/g, "''")}', updated_at = ${Date.now()} WHERE user = '${USER}';`)
    d1(null, tmp); fs.unlinkSync(tmp)
    console.log(`已寫入 D1（${REMOTE ? 'remote' : 'local'}）`)
  }
  if (!OUT && !WRITE) console.log('(未指定 --out / --write，僅預覽)')
}

main()
