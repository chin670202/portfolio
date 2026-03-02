/**
 * 新聞服務模組
 * 負責抓取與分析股票/資產相關新聞
 */

import { analyzeSentiment, analyzeBatch, initEngine, setEngine, getStatus, isBondRelevantNews } from './sentiment/index.js'

// CORS Proxy 設定
const CORS_PROXY = 'https://corsproxy.io/?'

// 情緒分析設定
let sentimentEnabled = true
let sentimentInitialized = false

// 共用 Headers
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

// ============================================================
// 全域語系設定
// ============================================================

/**
 * 支援的語系
 */
export const SUPPORTED_LOCALES = {
  ZH_TW: 'zh-TW',
  EN: 'en'
}

/**
 * 當前語系（預設繁體中文）
 */
let currentLocale = SUPPORTED_LOCALES.ZH_TW

/**
 * 取得當前語系
 * @returns {string} 當前語系
 */
export function getLocale() {
  return currentLocale
}

/**
 * 設定語系
 * @param {string} locale - 語系代碼 ('zh-TW' 或 'en')
 */
export function setLocale(locale) {
  if (Object.values(SUPPORTED_LOCALES).includes(locale)) {
    currentLocale = locale
  } else {
    console.warn(`不支援的語系: ${locale}，維持使用 ${currentLocale}`)
  }
}

// ============================================================
// 負面關鍵字設定
// ============================================================

// 中文負面關鍵字
const NEGATIVE_KEYWORDS_ZH = [
  '下跌', '暴跌', '崩盤', '虧損', '裁員', '訴訟', '警示', '違約',
  '破產', '倒閉', '負債', '調查', '罰款', '召回', '危機', '風險',
  '下修', '降評', '減產', '停工', '延遲', '取消', '衰退', '萎縮',
  '重挫', '跳水', '腰斬', '暴雷', '爆雷', '詐騙', '違規', '處分',
  '停牌', '警告', '糾紛', '索賠', '清算', '重整'
]

// 英文負面關鍵字
const NEGATIVE_KEYWORDS_EN = [
  'drop', 'crash', 'loss', 'layoff', 'lawsuit', 'warning', 'default',
  'bankruptcy', 'debt', 'investigation', 'fine', 'recall', 'crisis', 'risk',
  'downgrade', 'cut', 'decline', 'delay', 'cancel', 'recession', 'slump',
  'plunge', 'tumble', 'sink', 'fraud', 'scandal', 'penalty', 'violation',
  'halt', 'suspend', 'probe', 'trouble', 'concern', 'fear', 'worry'
]

// 合併所有負面關鍵字
const NEGATIVE_KEYWORDS = [...NEGATIVE_KEYWORDS_ZH, ...NEGATIVE_KEYWORDS_EN]

// ============================================================
// 情緒分析設定
// ============================================================

/**
 * 啟用/停用 AI 情緒分析
 * @param {boolean} enabled - 是否啟用
 */
export function enableSentimentAnalysis(enabled) {
  sentimentEnabled = enabled
}

/**
 * 設定情緒分析引擎
 * @param {'transformers'|'keywords'|'api'} engine - 引擎名稱
 */
export function setSentimentEngine(engine) {
  setEngine(engine)
  sentimentInitialized = false // 重置初始化狀態
}

/**
 * 取得情緒分析狀態
 * @returns {Promise<Object>}
 */
export async function getSentimentStatus() {
  return {
    enabled: sentimentEnabled,
    initialized: sentimentInitialized,
    ...(await getStatus())
  }
}

/**
 * 初始化情緒分析引擎（預載模型）
 * @returns {Promise<void>}
 */
export async function initSentimentEngine() {
  if (!sentimentEnabled || sentimentInitialized) return
  try {
    await initEngine()
    sentimentInitialized = true
    console.log('[News] 情緒分析引擎初始化完成')
  } catch (error) {
    console.error('[News] 情緒分析引擎初始化失敗:', error)
  }
}

// ============================================================
// 新聞來源設定
// ============================================================

/**
 * 新聞來源類型
 */
export const NEWS_SOURCES = {
  GOOGLE_NEWS: 'google_news',
  // 未來可擴展更多新聞來源
  // YAHOO_FINANCE: 'yahoo_finance',
  // CNYES: 'cnyes',
}

// ============================================================
// 核心新聞抓取功能
// ============================================================

/**
 * 從 Google News RSS 抓取股票相關新聞
 * @param {string} query - 搜尋關鍵字（公司名稱或股票代號）
 * @param {Object} options - 選項
 * @param {number} options.days - 抓取幾天內的新聞（預設 7）
 * @param {number} options.limit - 最多抓取幾則（預設 10）
 * @param {boolean} options.useSentiment - 是否使用 AI 情緒分析（預設 true）
 * @param {string} options.assetType - 資產類型：'bond'（債券）會過濾掉公司發表意見類新聞
 * @returns {Promise<Array>} 新聞列表 [{title, link, pubDate, source, isNegative, sentiment, ...}]
 */
export async function fetchGoogleNews(query, options = {}) {
  const { days = 7, limit = 10, useSentiment = true, assetType = null } = options
  // 使用全域語系設定
  const lang = currentLocale

  if (!query) return []

  const encodedQuery = encodeURIComponent(query)
  const glParam = lang === 'zh-TW' ? 'TW' : 'US'
  const hlParam = lang === 'zh-TW' ? 'zh-TW' : 'en'
  const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=${hlParam}&gl=${glParam}&ceid=${glParam}:${hlParam}`

  try {
    const response = await fetch(CORS_PROXY + encodeURIComponent(url), {
      headers: DEFAULT_HEADERS
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const xmlText = await response.text()

    // 解析 RSS XML
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
    const items = xmlDoc.querySelectorAll('item')

    const news = []
    const now = new Date()
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    items.forEach((item, index) => {
      if (news.length >= limit) return

      const title = item.querySelector('title')?.textContent || ''
      const link = item.querySelector('link')?.textContent || ''
      const pubDateStr = item.querySelector('pubDate')?.textContent || ''
      const pubDate = new Date(pubDateStr)

      // 只取指定天數內的新聞
      if (pubDate < cutoffDate) return

      // 債券專用過濾：過濾掉「公司發表對別人看法」的新聞
      // 只保留與公司自身財務/經營相關的新聞
      if (assetType === 'bond') {
        const relevance = isBondRelevantNews(title, query)
        if (!relevance.isRelevant) {
          // console.log(`[News] 過濾非相關債券新聞: ${title} (原因: ${relevance.reason})`)
          return
        }
      }

      // 分析負面關鍵字（保留舊方法作為備用）
      const analysis = analyzeNewsTitle(title)

      news.push({
        title,
        link,
        pubDate: pubDate.toLocaleDateString('zh-TW'),
        pubDateRaw: pubDate,
        source: NEWS_SOURCES.GOOGLE_NEWS,
        isNegative: analysis.isNegative,
        negativeKeywords: analysis.matchedKeywords,
        // AI 情緒分析欄位（稍後填入）
        sentiment: null,
        sentimentConfidence: 0,
        sentimentLabel: null
      })
    })

    // 使用 AI 情緒分析
    if (sentimentEnabled && useSentiment && news.length > 0) {
      try {
        const titles = news.map(n => n.title)
        const sentiments = await analyzeBatch(titles)

        sentiments.forEach((result, i) => {
          news[i].sentiment = result.sentiment
          news[i].sentimentConfidence = result.confidence
          news[i].sentimentLabel = result.label

          // 如果 AI 判斷為 bearish，也標記為負面
          if (result.sentiment === 'bearish' && result.confidence > 0.6) {
            news[i].isNegative = true
          }
        })
      } catch (error) {
        console.warn('[News] AI 情緒分析失敗，使用關鍵字分析:', error)
      }
    }

    return news
  } catch (e) {
    console.error(`fetchGoogleNews error for ${query}:`, e)
    return []
  }
}

// ============================================================
// 新聞分析功能
// ============================================================

/**
 * 分析新聞標題是否包含負面關鍵字
 * @param {string} title - 新聞標題
 * @returns {Object} { isNegative, matchedKeywords }
 */
export function analyzeNewsTitle(title) {
  if (!title) return { isNegative: false, matchedKeywords: [] }

  const titleLower = title.toLowerCase()
  const matchedKeywords = NEGATIVE_KEYWORDS.filter(keyword =>
    titleLower.includes(keyword.toLowerCase())
  )

  return {
    isNegative: matchedKeywords.length > 0,
    matchedKeywords
  }
}

/**
 * 計算新聞風險分數（0-100）
 * @param {Array} newsList - 新聞列表
 * @returns {number} 風險分數
 */
export function calculateRiskScore(newsList) {
  if (!newsList || newsList.length === 0) return 0

  const negativeCount = newsList.filter(n => n.isNegative).length
  const totalCount = newsList.length

  // 基礎分數：負面新聞佔比
  let score = (negativeCount / totalCount) * 100

  // 加權：如果負面新聞較多，分數更高
  if (negativeCount >= 3) score = Math.min(score * 1.2, 100)
  if (negativeCount >= 5) score = Math.min(score * 1.5, 100)

  return Math.round(score)
}

// ============================================================
// 批次抓取功能
// ============================================================

/**
 * 批次抓取多檔股票新聞
 * @param {Array} queries - [{symbol, name}] 陣列
 * @param {Object} options - 選項
 * @returns {Promise<Object>} { symbol: { news, riskScore, hasNegative } }
 */
export async function fetchBatchNews(queries, options = {}) {
  const results = {}

  const promises = queries.map(async ({ symbol, name }) => {
    const query = name || symbol
    const news = await fetchGoogleNews(query, options)

    results[symbol] = {
      news,
      riskScore: calculateRiskScore(news),
      hasNegative: news.some(n => n.isNegative),
      hasNews: news.length > 0,
      fetchedAt: new Date()
    }
  })

  await Promise.all(promises)
  return results
}

// ============================================================
// 新聞快取管理（localStorage 持久化，當日有效）
// ============================================================

const NEWS_CACHE_KEY = 'portfolio_news_cache'
const newsCache = new Map()

/**
 * 取得今日日期字串
 */
function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * 從 localStorage 還原快取到 Map（僅在初次使用時執行）
 */
let cacheRestored = false
function restoreCacheFromStorage() {
  if (cacheRestored) return
  cacheRestored = true
  try {
    const raw = localStorage.getItem(NEWS_CACHE_KEY)
    if (!raw) return
    const stored = JSON.parse(raw)
    if (stored.date !== getTodayKey()) {
      localStorage.removeItem(NEWS_CACHE_KEY)
      return
    }
    // 還原到 Map（將 fetchedAt 字串轉回 Date）
    for (const [key, value] of Object.entries(stored.entries || {})) {
      newsCache.set(key, { ...value, fetchedAt: new Date(value.fetchedAt) })
    }
  } catch {
    localStorage.removeItem(NEWS_CACHE_KEY)
  }
}

/**
 * 將 Map 快取持久化到 localStorage
 */
function persistCacheToStorage() {
  try {
    const entries = {}
    for (const [key, value] of newsCache.entries()) {
      entries[key] = value
    }
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({
      date: getTodayKey(),
      entries
    }))
  } catch (e) {
    console.warn('[newsCache] 儲存快取失敗:', e)
  }
}

/**
 * 從快取取得新聞，若無則抓取
 * @param {string} symbol - 股票代號
 * @param {string} name - 公司名稱
 * @param {Object} options - 選項（包含 assetType: 'bond' 用於債券過濾）
 * @returns {Promise<Object>} { news, riskScore, hasNegative, hasNews }
 */
export async function getNewsWithCache(symbol, name, options = {}) {
  // 初次使用時從 localStorage 還原
  restoreCacheFromStorage()

  // 快取 key 需包含 assetType，因為同一公司債券和股票的新聞過濾結果不同
  const assetTypeSuffix = options.assetType ? `_${options.assetType}` : ''
  const cacheKey = `${symbol}_${currentLocale}${assetTypeSuffix}`
  const cached = newsCache.get(cacheKey)

  // 當日快取有效
  if (cached) {
    return cached
  }

  // 抓取新資料
  const query = name || symbol
  const news = await fetchGoogleNews(query, options)

  const result = {
    news,
    riskScore: calculateRiskScore(news),
    hasNegative: news.some(n => n.isNegative),
    hasNews: news.length > 0,
    fetchedAt: new Date()
  }

  // 存入快取（Map + localStorage）
  newsCache.set(cacheKey, result)
  persistCacheToStorage()

  return result
}

/**
 * 清除新聞快取
 * @param {string} symbol - 指定股票代號，若無則清除全部
 */
export function clearNewsCache(symbol = null) {
  if (symbol) {
    // 清除指定股票的所有語言快取
    for (const key of newsCache.keys()) {
      if (key.startsWith(`${symbol}_`)) {
        newsCache.delete(key)
      }
    }
  } else {
    newsCache.clear()
    cacheRestored = false
  }
  // 同步到 localStorage
  if (newsCache.size > 0) {
    persistCacheToStorage()
  } else {
    localStorage.removeItem(NEWS_CACHE_KEY)
  }
}

// ============================================================
// 匯出負面關鍵字（供外部使用或擴展）
// ============================================================

export { NEGATIVE_KEYWORDS, NEGATIVE_KEYWORDS_ZH, NEGATIVE_KEYWORDS_EN }
