/**
 * 投資資料抓取 API 服務
 *
 * 注意：由於瀏覽器 CORS 限制，直接從前端抓取外部網站資料會被擋
 * 這些函式設計為可在以下環境使用：
 * 1. Google Apps Script (原始設計)
 * 2. Node.js 後端服務
 * 3. 透過 CORS proxy 的前端調用
 */

// CORS Proxy 設定
// 自架 Cloudflare Worker: 'https://muddy-glade-88a0.chinghunglai.workers.dev/?url='
const CORS_PROXY = 'https://corsproxy.io/?'

// 共用 Headers
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

// ============================================================
// 金交債（法蘭克福交易所）
// ============================================================

/**
 * 抓取金交債價格（法蘭克福交易所）
 * @param {string} isin - 債券 ISIN 代碼
 * @returns {Promise<string>} 價格字串（小數點後3位）
 */
export async function getBondPrice(isin = 'USG84228FV59') {
  const url = `https://www.boerse-frankfurt.de/bond/${isin}`

  try {
    const response = await fetch(CORS_PROXY + encodeURIComponent(url), {
      headers: DEFAULT_HEADERS
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()

    const str = '"lastPrice":'
    const p0 = html.lastIndexOf(str)
    if (p0 === -1) return '0.000'

    const p1 = p0 + str.length
    const p2 = html.indexOf(',', p1)
    if (p2 === -1) return '0.000'

    const result = html.substring(p1, p2)
    return parseFloat(result).toFixed(3)
  } catch (e) {
    console.error(`getBondPrice error for ${isin}:`, e)
    return 'Error: ' + e.message
  }
}

/**
 * 批次抓取多檔債券價格
 * @param {string[]} isinList - ISIN 代碼陣列
 * @returns {Promise<Object>} { isin: price } 對應表
 */
export async function getBondPrices(isinList) {
  const results = {}
  const promises = isinList.map(async (isin) => {
    const price = await getBondPrice(isin)
    results[isin] = price
  })
  await Promise.all(promises)
  return results
}

// ============================================================
// 台股 / ETF 價格（Yahoo Finance 台灣）
// ============================================================

/**
 * 從 Yahoo Finance 抓取台股/ETF價格
 * @param {string} stockCode - 股票代碼（例如 "00725B"）
 * @returns {Promise<string>} 格式化後的價格（小數點後3位）
 */
export async function getStockPrice(stockCode) {
  if (!stockCode) {
    return '請輸入股票代碼'
  }

  const url = `https://tw.stock.yahoo.com/quote/${stockCode}.TWO/technical-analysis`

  try {
    const response = await fetch(CORS_PROXY + encodeURIComponent(url), {
      headers: DEFAULT_HEADERS
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const content = await response.text()

    // 使用正則表達式提取價格
    const priceMatch = content.match(/<span[^>]*>(\d+\.\d+)<\/span>/)
    if (!priceMatch) {
      return '無法找到價格'
    }

    const price = parseFloat(priceMatch[1])
    const roundedPrice = Math.round(price * 1000) / 1000
    return roundedPrice.toFixed(3)
  } catch (e) {
    console.error(`getStockPrice error for ${stockCode}:`, e)
    return '錯誤: ' + e.message
  }
}

/**
 * 批次抓取多檔台股價格
 * @param {string[]} stockCodes - 股票代碼陣列
 * @returns {Promise<Object>} { code: price } 對應表
 */
export async function getStockPrices(stockCodes) {
  const results = {}
  const promises = stockCodes.map(async (code) => {
    const price = await getStockPrice(code)
    results[code] = price
  })
  await Promise.all(promises)
  return results
}

// ============================================================
// 配息資料（CMoney）
// ============================================================

/**
 * 從 cmoney.tw 獲取股票的配息網頁內容（內部共用函數）
 * @param {string} stockCode - 股票代碼
 * @returns {Promise<string>} 網頁內容
 */
async function fetchDividendData(stockCode) {
  if (!stockCode) {
    throw new Error('請輸入股票代碼')
  }

  stockCode = stockCode.toUpperCase()
  const url = `https://www.cmoney.tw/forum/stock/${stockCode}?s=dividend`

  const response = await fetch(CORS_PROXY + encodeURIComponent(url), {
    headers: DEFAULT_HEADERS
  })

  if (!response.ok) {
    throw new Error(`HTTP 錯誤: ${response.status}`)
  }

  return await response.text()
}

/**
 * 從 cmoney.tw 抓取股票或 ETF 的最近一次配息金額
 * @param {string} stockCode - 股票或 ETF 代碼（例如 "00937B"）
 * @returns {Promise<string>} 最近一次配息金額
 */
export async function getLatestDividend(stockCode) {
  try {
    const content = await fetchDividendData(stockCode)

    // 提取最新配息金額（第一行第二欄）
    const tbodyMatch = content.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)
    if (!tbodyMatch) {
      return '無法找到配息表格'
    }

    const firstRowMatch = tbodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/i)
    if (!firstRowMatch) {
      return '無法找到配息資料行'
    }

    const tds = firstRowMatch[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi)
    if (!tds || tds.length < 2) {
      return '無法解析配息金額欄位'
    }

    const secondTd = tds[1] // 第二欄
    const valueMatch = secondTd.match(/>([\s\S]*?)</i)
    if (!valueMatch) {
      return '無法找到配息金額'
    }

    return valueMatch[1].trim()
  } catch (e) {
    console.error(`getLatestDividend error for ${stockCode}:`, e)
    return '錯誤: ' + e.message
  }
}

/**
 * 從 cmoney.tw 抓取股票或 ETF 的下次配息日期
 * @param {string} stockCode - 股票或 ETF 代碼（例如 "00937B"）
 * @returns {Promise<string>} 下次配息日期，格式為 "YYYY/MM/DD"
 */
export async function getNextDividendDate(stockCode) {
  try {
    const content = await fetchDividendData(stockCode)
    const currentDate = new Date()

    // 提取 tbody 內容
    const tbodyMatch = content.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)
    if (!tbodyMatch) return '無法找到配息表格'

    // 提取所有行
    const rows = tbodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)
    if (!rows || rows.length < 1) return '無法找到配息資料行'

    // 輔助函數：解析日期並格式化
    function parseDate(tdContent) {
      const valueMatch = tdContent.match(/>([\s\S]*?)</i)
      if (!valueMatch) return null

      const rawDate = valueMatch[1].trim()
      if (rawDate.length === 8 && /^\d{8}$/.test(rawDate)) {
        const year = rawDate.substring(0, 4)
        const month = rawDate.substring(4, 6)
        const day = rawDate.substring(6, 8)
        return `${year}/${month}/${day}`
      }
      return rawDate // 如果已是 "YYYY/MM/DD" 格式
    }

    // 檢查第二行第四欄
    let resultDate = null
    if (rows.length >= 2) {
      const secondRowTds = rows[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi)
      if (secondRowTds && secondRowTds.length >= 4) {
        const secondRowDate = parseDate(secondRowTds[3])
        if (secondRowDate) {
          const dateObj = new Date(secondRowDate.replace(/\//g, '-'))
          if (dateObj >= currentDate) {
            return secondRowDate
          }
          resultDate = secondRowDate // 備用
        }
      }
    }

    // 如果第二行不可用或日期已過，檢查第一行第四欄
    const firstRowTds = rows[0].match(/<td[^>]*>([\s\S]*?)<\/td>/gi)
    if (!firstRowTds || firstRowTds.length < 4) {
      return '無法解析配息日期欄位'
    }

    const firstRowDate = parseDate(firstRowTds[3])
    return firstRowDate || resultDate || '無法找到配息日期'
  } catch (e) {
    console.error(`getNextDividendDate error for ${stockCode}:`, e)
    return '錯誤: ' + e.message
  }
}

// ============================================================
// 日期計算工具
// ============================================================

/**
 * 計算從今天（台灣時間）到下次配息日期的剩餘天數
 * @param {string} dividendInput - 配息日期，格式為 "YYYY/MM/DD" 或 "MM/DD, MM/DD"
 * @returns {number|string} 剩餘天數（整數）或 "等公布"
 */
export function daysToNextDividend(dividendInput) {
  try {
    if (!dividendInput) {
      return '請輸入日期'
    }

    // 動態獲取今天日期並調整為台灣時間 (UTC+8)
    const now = new Date()
    const taiwanOffset = 8 * 60 * 60 * 1000 // UTC+8 的毫秒偏移
    const today = new Date(now.getTime() + taiwanOffset)
    today.setUTCHours(0, 0, 0, 0) // 設為台灣當天 00:00:00
    const currentYear = today.getUTCFullYear()

    // 情況 1：單一日期格式 "YYYY/MM/DD"
    if (dividendInput.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
      const parts = dividendInput.split('/')
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1 // 月份從 0 開始
      const day = parseInt(parts[2], 10)
      const targetDate = new Date(year, month, day)

      const timeDiff = targetDate - today
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

      if (daysDiff < 0) {
        return '等公布'
      }
      return daysDiff
    }

    // 情況 2：雙日期格式 "MM/DD, MM/DD"
    if (dividendInput.match(/^\d{2}\/\d{2},\s*\d{2}\/\d{2}$/)) {
      const dates = dividendInput.split(',').map(date => date.trim())
      const date1Parts = dates[0].split('/')
      const date2Parts = dates[1].split('/')

      // 解析兩個配息日期
      const month1 = parseInt(date1Parts[0], 10) - 1
      const day1 = parseInt(date1Parts[1], 10)
      const month2 = parseInt(date2Parts[0], 10) - 1
      const day2 = parseInt(date2Parts[1], 10)

      // 當年和次年的可能配息日期
      const date1ThisYear = new Date(currentYear, month1, day1)
      const date2ThisYear = new Date(currentYear, month2, day2)
      const date1NextYear = new Date(currentYear + 1, month1, day1)

      // 找出下次配息日期
      const possibleDates = [date1ThisYear, date2ThisYear, date1NextYear]
      let nextDate = null
      for (let i = 0; i < possibleDates.length; i++) {
        const diff = possibleDates[i] - today
        if (diff >= 0) {
          nextDate = possibleDates[i]
          break
        }
      }

      if (!nextDate) {
        return '等公布' // 若無未來日期
      }

      // 計算天數並返回整數
      const daysDiff = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24))
      return daysDiff
    }

    return '請輸入正確日期格式 (YYYY/MM/DD 或 MM/DD, MM/DD)'
  } catch (e) {
    return '錯誤: ' + e.message
  }
}

// ============================================================
// 加密貨幣價格（CoinGecko）
// ============================================================

/**
 * 從 CoinGecko 抓取加密貨幣價格
 * @param {string} symbol - 幣種 ID（如 "bitcoin", "ethereum"）
 * @param {string} currency - 目標貨幣（如 "twd", "usd"）
 * @returns {Promise<number|string>} 價格或錯誤訊息
 */
export async function getCryptoPrice(symbol = 'bitcoin', currency = 'twd') {
  symbol = symbol.toLowerCase()
  currency = currency.toLowerCase()

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=${currency}`

  try {
    // 使用 CORS proxy 避免跨域問題
    const response = await fetch(CORS_PROXY + encodeURIComponent(url), {
      headers: DEFAULT_HEADERS
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (!data[symbol] || !data[symbol][currency]) {
      return '查無資料'
    }

    return data[symbol][currency]
  } catch (e) {
    console.error(`getCryptoPrice error for ${symbol}:`, e)
    return 'Error: ' + e.message
  }
}

/**
 * 批次抓取多種加密貨幣價格
 * @param {string[]} symbols - 幣種 ID 陣列（如 ["bitcoin", "ethereum"]）
 * @param {string} currency - 目標貨幣（如 "twd"）
 * @returns {Promise<Object>} { symbol: price } 對應表
 */
export async function getCryptoPrices(symbols, currency = 'twd') {
  const ids = symbols.map(s => s.toLowerCase()).join(',')
  currency = currency.toLowerCase()

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${currency}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const results = {}

    for (const symbol of symbols) {
      const s = symbol.toLowerCase()
      results[symbol] = data[s]?.[currency] ?? '查無資料'
    }

    return results
  } catch (e) {
    console.error('getCryptoPrices error:', e)
    return symbols.reduce((acc, s) => {
      acc[s] = 'Error: ' + e.message
      return acc
    }, {})
  }
}

// ============================================================
// 以下為未來擴充的函式預留位置
// ============================================================

/**
 * 抓取美股價格（Yahoo Finance）
 * @param {string} symbol - 股票代號（如 TSLA, GLDM, SIVR, COPX）
 * @returns {Promise<number|string>} 美元價格或錯誤訊息
 */
export async function getUsStockPrice(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`

  try {
    const response = await fetch(CORS_PROXY + encodeURIComponent(url), {
      headers: DEFAULT_HEADERS
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      const price = data.chart.result[0].meta.regularMarketPrice
      return Math.round(price * 100) / 100 // 兩位小數
    }

    return '無法取得價格'
  } catch (e) {
    console.error(`getUsStockPrice error for ${symbol}:`, e)
    return 'Error: ' + e.message
  }
}

/**
 * 抓取美元對台幣匯率（Yahoo Finance）
 * @returns {Promise<number|string>} USD/TWD 匯率或錯誤訊息
 */
export async function getUsdTwdRate() {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/USDTWD=X'

  try {
    const response = await fetch(CORS_PROXY + encodeURIComponent(url), {
      headers: DEFAULT_HEADERS
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      const rate = data.chart.result[0].meta.regularMarketPrice
      return Math.round(rate * 10000) / 10000 // 四位小數
    }

    return '無法取得匯率'
  } catch (e) {
    console.error('getUsdTwdRate error:', e)
    return 'Error: ' + e.message
  }
}
