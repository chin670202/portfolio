/**
 * 後端價格抓取服務
 * 從 src/services/api.js 移植，去除所有 CORS proxy（Worker 直接 fetch）
 */

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

// ============================================================
// 美元匯率
// ============================================================

export async function getUsdTwdRate() {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/USDTWD=X'
  const response = await fetch(url, { headers: DEFAULT_HEADERS })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const data = await response.json()
  const rate = data.chart?.result?.[0]?.meta?.regularMarketPrice
  if (!rate) throw new Error('無法取得匯率')
  return Math.round(rate * 10000) / 10000
}

// ============================================================
// 債券價格（ING Wertpapiere API，回傳法蘭克福交易所報價）
// ============================================================

export async function getBondPrice(isin) {
  const url = `https://component-api.wertpapiere.ing.de/api/v1/components/instrumentheader/${isin}`
  const response = await fetch(url, { headers: DEFAULT_HEADERS })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const data = await response.json()
  const price = data?.price
  return (price != null && !isNaN(price)) ? Math.round(price * 1000) / 1000 : null
}

// ============================================================
// 台股 / ETF 價格
// ============================================================

function isTWSE(stockCode) {
  if (/^00\d{3}B$/.test(stockCode)) return false
  return true
}

async function getStockPriceFromYahoo(stockCode) {
  const suffix = isTWSE(stockCode) ? '.TW' : '.TWO'
  const url = `https://tw.stock.yahoo.com/quote/${stockCode}${suffix}`
  const response = await fetch(url, { headers: DEFAULT_HEADERS })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const content = await response.text()
  const priceMatch = content.match(/<span[^>]*class="[^"]*Fz\(32px\)[^"]*"[^>]*>([\d,.]+)<\/span>/)
  if (!priceMatch) throw new Error('無法解析價格')

  const price = parseFloat(priceMatch[1].replace(/,/g, ''))
  return Math.round(price * 1000) / 1000
}

async function getStockPriceFromTWSE(stockCode) {
  const market = isTWSE(stockCode) ? 'tse' : 'otc'
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${market}_${stockCode}.tw`
  const response = await fetch(url, { headers: DEFAULT_HEADERS })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const data = await response.json()
  if (data.msgArray?.[0]?.z && data.msgArray[0].z !== '-') {
    return parseFloat(data.msgArray[0].z)
  }
  if (data.msgArray?.[0]?.y) {
    return parseFloat(data.msgArray[0].y)
  }
  throw new Error('無法取得價格')
}

export async function getStockPrice(stockCode) {
  // Yahoo Finance → TWSE fallback
  try {
    return await getStockPriceFromYahoo(stockCode)
  } catch (e) {
    // fallback
  }
  try {
    return await getStockPriceFromTWSE(stockCode)
  } catch (e) {
    return null
  }
}

// ============================================================
// 美股價格
// ============================================================

export async function getUsStockPrice(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
  const response = await fetch(url, { headers: DEFAULT_HEADERS })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const data = await response.json()
  const price = data.chart?.result?.[0]?.meta?.regularMarketPrice
  if (!price) throw new Error('無法取得價格')
  return Math.round(price * 100) / 100
}

// ============================================================
// 加密貨幣價格（CoinGecko）
// ============================================================

const CRYPTO_MAPPING = { 'BTC/TWD': 'bitcoin', 'ETH/TWD': 'ethereum' }

export async function getCryptoPrice(coinId) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=twd`
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json', ...DEFAULT_HEADERS }
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const data = await response.json()
  if (!data[coinId]?.twd) throw new Error('查無資料')
  return data[coinId].twd
}

// ============================================================
// 整合：抓取所有價格
// ============================================================

/**
 * 對 portfolio data 中的所有商品抓取即時價格
 * @returns {{ usdRate, prices: { [symbol]: number }, errors: string[] }}
 */
export async function fetchAllPrices(portfolioData) {
  const errors = []
  const prices = {}

  // 1. 匯率
  let usdRate = null
  try {
    usdRate = await getUsdTwdRate()
  } catch (e) {
    errors.push(`匯率: ${e.message}`)
    usdRate = portfolioData.匯率?.美元匯率 || 30
  }

  const tasks = []

  // 2. 債券
  for (const bond of (portfolioData.股票 || [])) {
    tasks.push((async () => {
      try {
        const price = await getBondPrice(bond.代號)
        if (price !== null) prices[bond.代號] = price
        else errors.push(`債券 ${bond.代號}: 無法取得價格`)
      } catch (e) {
        errors.push(`債券 ${bond.代號}: ${e.message}`)
      }
    })())
  }

  // 3. ETF
  for (const etf of (portfolioData.ETF || [])) {
    tasks.push((async () => {
      try {
        const price = await getStockPrice(etf.代號)
        if (price !== null) prices[etf.代號] = price
        else errors.push(`ETF ${etf.代號}: 無法取得價格`)
      } catch (e) {
        errors.push(`ETF ${etf.代號}: ${e.message}`)
      }
    })())
  }

  // 4. 其它資產
  for (const asset of (portfolioData.其它資產 || [])) {
    tasks.push((async () => {
      try {
        const coinId = CRYPTO_MAPPING[asset.代號]
        if (coinId) {
          prices[asset.代號] = await getCryptoPrice(coinId)
        } else if (/^[A-Z]+$/.test(asset.代號)) {
          prices[asset.代號] = await getUsStockPrice(asset.代號)
        } else if (/^\d/.test(asset.代號)) {
          const price = await getStockPrice(asset.代號)
          if (price !== null) prices[asset.代號] = price
          else errors.push(`台股 ${asset.代號}: 無法取得價格`)
        }
      } catch (e) {
        errors.push(`資產 ${asset.代號}: ${e.message}`)
      }
    })())
  }

  await Promise.allSettled(tasks)

  return { usdRate, prices, errors }
}
