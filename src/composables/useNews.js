/**
 * 新聞 Composable
 * 提供 Vue 組件使用的新聞狀態管理
 */

import { ref, computed } from 'vue'
import {
  getNewsWithCache,
  clearNewsCache,
  calculateRiskScore,
  initSentimentEngine,
  getSentimentStatus
} from '../services/newsService'

/**
 * 新聞管理 Composable
 * @returns {Object} 新聞相關狀態和方法
 */
// 新聞篩選模式
const NEWS_FILTER_KEY = 'newsFilterMode'

export function useNews() {
  // 狀態
  const newsData = ref({}) // { symbol: { news, riskScore, hasNegative, hasNews, fetchedAt } }
  const loadingSymbols = ref(new Set()) // 正在載入的股票代號
  const showModal = ref(false)
  const currentSymbol = ref('')
  const currentTitle = ref('')
  const modalLoading = ref(false)

  // 已讀新聞記錄（點開過的 symbol）
  // 當重新抓取新聞時會清除對應的已讀狀態
  const readSymbols = ref(new Set())

  // 新聞篩選模式: 'all' | 'bullish' | 'bearish'
  const filterMode = ref(localStorage.getItem(NEWS_FILTER_KEY) || 'all')

  // ============================================================
  // 計算屬性
  // ============================================================

  /**
   * 當前顯示的新聞列表（根據篩選模式過濾）
   */
  const currentNews = computed(() => {
    const data = newsData.value[currentSymbol.value]
    if (!data?.news) return []
    return filterNewsList(data.news)
  })

  /**
   * 根據篩選模式過濾新聞列表
   */
  function filterNewsList(newsList) {
    if (!newsList || filterMode.value === 'all') return newsList
    if (filterMode.value === 'bullish') {
      return newsList.filter(n => n.sentiment === 'bullish')
    }
    if (filterMode.value === 'bearish') {
      return newsList.filter(n => n.sentiment === 'bearish' || n.isNegative)
    }
    return newsList
  }

  /**
   * 當前股票的風險分數
   */
  const currentRiskScore = computed(() => {
    const data = newsData.value[currentSymbol.value]
    return data?.riskScore || 0
  })

  // ============================================================
  // 方法
  // ============================================================

  /**
   * 檢查是否有新聞
   * @param {string} symbol - 股票代號
   * @returns {boolean}
   */
  function hasNews(symbol) {
    return newsData.value[symbol]?.hasNews || false
  }

  /**
   * 檢查是否有負面新聞（看跌）
   * @param {string} symbol - 股票代號
   * @returns {boolean}
   */
  function hasNegativeNews(symbol) {
    const data = newsData.value[symbol]
    if (!data?.news) return false
    // 檢查是否有 bearish 情緒或舊版的 isNegative
    return data.news.some(n => n.sentiment === 'bearish' || n.isNegative)
  }

  /**
   * 檢查是否有正面新聞（看漲）
   * @param {string} symbol - 股票代號
   * @returns {boolean}
   */
  function hasBullishNews(symbol) {
    const data = newsData.value[symbol]
    if (!data?.news) return false
    return data.news.some(n => n.sentiment === 'bullish')
  }

  /**
   * 取得新聞情緒統計
   * @param {string} symbol - 股票代號
   * @returns {Object} { bullish, bearish, neutral }
   */
  function getSentimentStats(symbol) {
    const data = newsData.value[symbol]
    if (!data?.news) return { bullish: 0, bearish: 0, neutral: 0 }

    return data.news.reduce((acc, n) => {
      if (n.sentiment === 'bullish') acc.bullish++
      else if (n.sentiment === 'bearish') acc.bearish++
      else acc.neutral++
      return acc
    }, { bullish: 0, bearish: 0, neutral: 0 })
  }

  /**
   * 取得股票的風險分數
   * @param {string} symbol - 股票代號
   * @returns {number}
   */
  function getRiskScore(symbol) {
    return newsData.value[symbol]?.riskScore || 0
  }

  /**
   * 取得股票的新聞列表
   * @param {string} symbol - 股票代號
   * @returns {Array}
   */
  function getNews(symbol) {
    return newsData.value[symbol]?.news || []
  }

  /**
   * 取得股票的新聞數量（根據篩選模式）
   * @param {string} symbol - 股票代號
   * @returns {number}
   */
  function getNewsCount(symbol) {
    const data = newsData.value[symbol]
    if (!data?.news) return 0
    return filterNewsList(data.news).length
  }

  /**
   * 取得股票的原始新聞數量（不受篩選影響）
   * @param {string} symbol - 股票代號
   * @returns {number}
   */
  function getRawNewsCount(symbol) {
    return newsData.value[symbol]?.news?.length || 0
  }

  /**
   * 設定篩選模式
   * @param {'all'|'bullish'|'bearish'} mode - 篩選模式
   */
  function setFilterMode(mode) {
    filterMode.value = mode
    localStorage.setItem(NEWS_FILTER_KEY, mode)
  }

  /**
   * 取得當前篩選模式
   * @returns {string}
   */
  function getFilterMode() {
    return filterMode.value
  }

  /**
   * 檢查是否正在載入
   * @param {string} symbol - 股票代號
   * @returns {boolean}
   */
  function isLoading(symbol) {
    return loadingSymbols.value.has(symbol)
  }

  /**
   * 檢查新聞是否已讀（已點開過）
   * @param {string} symbol - 股票代號
   * @returns {boolean}
   */
  function isRead(symbol) {
    return readSymbols.value.has(symbol)
  }

  /**
   * 標記新聞為已讀
   * @param {string} symbol - 股票代號
   */
  function markAsRead(symbol) {
    readSymbols.value.add(symbol)
  }

  /**
   * 抓取單一股票的新聞
   * @param {string} symbol - 股票代號
   * @param {string} name - 公司名稱
   * @param {Object} options - 選項
   * @param {boolean} options.forceRefresh - 強制重新抓取（會清除已讀狀態）
   */
  async function fetchNews(symbol, name, options = {}) {
    if (loadingSymbols.value.has(symbol)) return

    loadingSymbols.value.add(symbol)

    try {
      const result = await getNewsWithCache(symbol, name, options)
      newsData.value[symbol] = result
    } catch (error) {
      console.error(`fetchNews error for ${symbol}:`, error)
      newsData.value[symbol] = {
        news: [],
        riskScore: 0,
        hasNegative: false,
        hasNews: false,
        error: error.message,
        fetchedAt: new Date()
      }
    } finally {
      loadingSymbols.value.delete(symbol)
    }
  }

  /**
   * 批次抓取多檔股票新聞
   * @param {Array} items - [{symbol, name, assetType?}] assetType 可選，'bond' 表示債券
   * @param {Object} options - 全域選項（會被 item 的選項覆蓋）
   */
  async function fetchBatchNews(items, options = {}) {
    // 批次抓取時清除所有已讀狀態（重新載入頁面時）
    readSymbols.value.clear()

    const promises = items.map(({ symbol, name, assetType }) => {
      // 合併全域選項與 item 專屬選項
      const itemOptions = assetType ? { ...options, assetType } : options
      return fetchNews(symbol, name, itemOptions)
    })
    await Promise.all(promises)
  }

  /**
   * 開啟新聞 Modal
   * @param {string} symbol - 股票代號
   * @param {string} name - 公司名稱
   * @param {Object} options - 選項（如 assetType: 'bond'）
   */
  async function openModal(symbol, name, options = {}) {
    currentSymbol.value = symbol
    currentTitle.value = name || symbol
    showModal.value = true
    modalLoading.value = true

    // 標記為已讀（點開即已讀）
    markAsRead(symbol)

    await fetchNews(symbol, name, options)

    modalLoading.value = false
  }

  /**
   * 關閉新聞 Modal
   */
  function closeModal() {
    showModal.value = false
  }

  /**
   * 清除快取並重新抓取
   * @param {string} symbol - 股票代號（若無則清除全部）
   */
  function refresh(symbol = null) {
    clearNewsCache(symbol)
    if (symbol) {
      delete newsData.value[symbol]
      // 清除快取時也清除已讀狀態
      readSymbols.value.delete(symbol)
    } else {
      newsData.value = {}
      // 清除所有已讀狀態
      readSymbols.value.clear()
    }
  }

  /**
   * 取得新聞摘要統計
   * @returns {Object} { total, withNews, withNegative, avgRiskScore }
   */
  function getSummary() {
    const symbols = Object.keys(newsData.value)
    const total = symbols.length
    const withNews = symbols.filter(s => newsData.value[s]?.hasNews).length
    const withNegative = symbols.filter(s => newsData.value[s]?.hasNegative).length

    const scores = symbols
      .map(s => newsData.value[s]?.riskScore || 0)
      .filter(s => s > 0)

    const avgRiskScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

    return { total, withNews, withNegative, avgRiskScore }
  }

  /**
   * 初始化情緒分析引擎
   */
  async function initSentiment() {
    try {
      await initSentimentEngine()
    } catch (error) {
      console.warn('[useNews] 情緒分析引擎初始化失敗:', error)
    }
  }

  /**
   * 取得情緒分析狀態
   */
  async function getSentimentInfo() {
    return getSentimentStatus()
  }

  return {
    // 狀態
    newsData,
    loadingSymbols,
    showModal,
    currentSymbol,
    currentTitle,
    modalLoading,
    filterMode,
    readSymbols,

    // 計算屬性
    currentNews,
    currentRiskScore,

    // 方法
    hasNews,
    hasNegativeNews,
    hasBullishNews,
    getSentimentStats,
    setFilterMode,
    getFilterMode,
    getRawNewsCount,
    getRiskScore,
    getNews,
    getNewsCount,
    isLoading,
    isRead,
    markAsRead,
    fetchNews,
    fetchBatchNews,
    openModal,
    closeModal,
    refresh,
    getSummary,
    initSentiment,
    getSentimentInfo
  }
}
