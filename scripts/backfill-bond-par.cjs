/**
 * 回填資產變化記錄的「債券面額」欄位。
 *
 * 背景：資產變化記錄只存彙總數字，沒有債券明細，所以市價/面額無法從記錄本身拆開。
 * 但面額 = 持有單位 × 100，不受行情影響 —— 只要能證明某段期間持倉沒變動，
 * 就能用當期持倉精確回填該區間，其餘一律標 unknown，不臆測。
 *
 * 持倉未變動的佐證（git 歷史，public/data/chin.json 共 16 個可解析版本）：
 *   2026-01-10 ~ 2026-03-02 皆為 9 檔 × 2000 單位 = 面額 1,800,000 USD
 * 2026-03-03「全面 DB 化」後該檔案不再進版控，之後的持倉需另從 backups 表確認。
 *
 * 用法：
 *   node scripts/backfill-bond-par.cjs --user chin --since 2026/01/01 [--until 2026/03/02] [--write]
 *   不加 --write 只做 dry-run，印出將寫入的值。
 */

const { execFileSync } = require('child_process')
const path = require('path')
// 直接呼叫 wrangler 的 JS entry，避開 Windows 上 .cmd 的 spawn 限制與 shell 引號問題
const WRANGLER = path.join(__dirname, '..', 'node_modules', 'wrangler', 'bin', 'wrangler.js')

const argv = process.argv.slice(2)
const arg = (name, def) => {
  const i = argv.indexOf('--' + name)
  return i >= 0 ? argv[i + 1] : def
}
const USER = arg('user', 'chin')
const SINCE = arg('since', null)
const UNTIL = arg('until', null)
const WRITE = argv.includes('--write')
const REMOTE = argv.includes('--remote')

const BOND_PAR_PER_UNIT = 100

function d1(sql) {
  const args = [WRANGLER, 'd1', 'execute', 'portfolio-db', REMOTE ? '--remote' : '--local',
                '--json', '--command', sql]
  const out = execFileSync(process.execPath, args, {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    cwd: path.join(__dirname, '..'), env: { ...process.env, CI: '1' }
  })
  return JSON.parse(out.slice(out.indexOf('[')))
}

const toDate = (s) => s ? new Date(s.replace(/\//g, '-')) : null
const inRange = (rec) => {
  const t = toDate(rec.記錄時間)
  if (SINCE && t < toDate(SINCE)) return false
  if (UNTIL && t > toDate(UNTIL)) return false
  return true
}

function main() {
  const res = d1(`SELECT data FROM portfolios WHERE user = '${USER}'`)
  const row = res[0]?.results?.[0]
  if (!row) { console.error(`找不到 user=${USER} 的 portfolio`); process.exit(1) }

  const data = JSON.parse(row.data)
  const bonds = data.股票 || []
  const parUsd = bonds.reduce((s, b) => s + (b.持有單位 || 0) * BOND_PAR_PER_UNIT, 0)

  console.log(`user=${USER}  當期債券 ${bonds.length} 檔，面額合計 ${parUsd.toLocaleString()} USD`)
  console.log(`回填區間：${SINCE || '(不限)'} ~ ${UNTIL || '(不限)'}\n`)

  const records = data.資產變化記錄 || []
  let filled = 0, marked = 0

  for (const rec of records) {
    if (rec.債券計價基準 === 'actual') continue          // 快照當下算出的，不覆蓋
    if (inRange(rec)) {
      const parTwd = parUsd * rec.美元匯率
      rec.債券面額美元 = parUsd
      rec.債券面額台幣 = Math.round(parTwd)
      rec.債券面額萬 = Math.round(parTwd / 10000).toString()
      rec.債券計價基準 = 'backfilled'
      filled++
      console.log(`  ${rec.記錄時間}  匯率 ${rec.美元匯率}  →  面額 ${rec.債券面額萬} 萬   [backfilled]`)
    } else {
      rec.債券計價基準 = 'unknown'
      marked++
      console.log(`  ${rec.記錄時間}  匯率 ${rec.美元匯率}  →  --                [unknown]`)
    }
  }

  console.log(`\n回填 ${filled} 筆、標記 unknown ${marked} 筆`)

  if (!WRITE) { console.log('\n(dry-run — 加 --write 才會實際寫入)'); return }

  const json = JSON.stringify(data).replace(/'/g, "''")
  d1(`UPDATE portfolios SET data = '${json}', updated_at = ${Date.now()} WHERE user = '${USER}'`)
  console.log('已寫入 D1' + (REMOTE ? '（remote）' : '（local）'))
}

main()
