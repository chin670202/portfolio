/**
 * 資產快照計算
 * 從 src/services/calculator.js 簡化移植，只計算快照需要的欄位
 */

/**
 * 取得台灣時間的今日日期字串
 * @returns {string} YYYY/MM/DD
 */
function getTodayTW() {
  const now = new Date(Date.now() + 8 * 3600 * 1000) // UTC+8
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
}

/**
 * 計算資產快照
 * @param {Object} data - portfolio JSON 資料
 * @param {{ usdRate: number, prices: Object }} priceResult - fetchAllPrices 結果
 * @returns {Object} 一筆資產變化記錄
 */
export function calculateSnapshot(data, priceResult) {
  const { usdRate, prices } = priceResult

  // 取得商品的最新價格（優先用剛抓到的，fallback 到 JSON 中的舊值）
  const getPrice = (symbol, fallback) => prices[symbol] ?? fallback ?? 0

  // ---- 部位總額（當時匯率）----

  // 債券：最新價格 × 持有單位 × usdRate
  let bondTotal = 0
  for (const bond of (data.股票 || [])) {
    const price = getPrice(bond.代號, bond.最新價格)
    bondTotal += price * (bond.持有單位 || 0) * usdRate
  }

  // ETF：最新價格 × 持有單位
  let etfTotal = 0
  for (const etf of (data.ETF || [])) {
    const price = getPrice(etf.代號, etf.最新價格)
    etfTotal += price * (etf.持有單位 || 0)
  }

  // 其它資產：依幣別計算
  let otherTotal = 0
  for (const asset of (data.其它資產 || [])) {
    const price = getPrice(asset.代號, asset.最新價格)
    const qty = asset.持有單位 || 0
    const isTwd = asset.代號.includes('/TWD') || /^\d/.test(asset.代號)
    otherTotal += isTwd ? (price * qty) : (price * qty * usdRate)
  }

  const 部位總額 = Math.round(bondTotal + etfTotal + otherTotal)

  // ---- 負債總額 ----
  let 負債總額 = 0
  for (const loan of (data.貸款 || [])) {
    負債總額 += loan.貸款餘額 || 0
  }
  負債總額 = Math.round(負債總額)

  // ---- 還原匯率30 部位總額 ----
  const fixedRate = 30

  let bondTotal30 = 0
  for (const bond of (data.股票 || [])) {
    const price = getPrice(bond.代號, bond.最新價格)
    bondTotal30 += price * (bond.持有單位 || 0) * fixedRate
  }

  let otherTotal30 = 0
  for (const asset of (data.其它資產 || [])) {
    const price = getPrice(asset.代號, asset.最新價格)
    const qty = asset.持有單位 || 0
    const isTwd = asset.代號.includes('/TWD') || /^\d/.test(asset.代號)
    otherTotal30 += isTwd ? (price * qty) : (price * qty * fixedRate)
  }

  const 還原匯率30部位總額 = Math.round(bondTotal30 + etfTotal + otherTotal30)

  // ---- 萬元字串 ----
  const toWan = (v) => Math.round(v / 10000).toString()

  return {
    記錄時間: getTodayTW(),
    美元匯率: usdRate,
    部位總額,
    負債總額,
    還原匯率30部位總額,
    當時匯率部位總額萬: toWan(部位總額),
    台幣負債總額萬: toWan(負債總額),
    當時匯率資產總和萬: toWan(部位總額 - 負債總額),
    還原匯率30部位總額萬: toWan(還原匯率30部位總額),
    還原匯率30資產總額萬: toWan(還原匯率30部位總額 - 負債總額)
  }
}
