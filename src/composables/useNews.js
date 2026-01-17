/**
 * 新聞 Composable
 * 提供 Vue 組件使用的新聞狀態管理
 */

import { ref, computed } from 'vue'
import {
  getNewsWithCache,
  clearNewsCache,
  calculateRiskScore
} from '../services/newsService'

/**
 * 新聞管理 Composable
 * @returns {Object} 新聞相關狀態和方法
 */
export function useNews() {
  // 狀態
  const newsData = ref({}) // { symbol: { news, riskScore, hasNegative, hasNews, fetchedAt } }
  const loadingSymbols = ref(new Set()) // 正在載入的股票代號
  const showModal = ref(false)
  const currentSymbol = ref('')
  const currentTitle = ref('')
  const modalLoading = ref(false)

  // ============================================================
  // 計算屬性
  // ============================================================

  /**
   * 當前顯示的新聞列表
   */
  const currentNews = computed(() => {
    const data = newsData.value[currentSymbol.value]
    return data?.news || []
  })

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
   * 檢查是否有負面新聞
   * @param {string} symbol - 股票代號
   * @returns {boolean}
   */
  function hasNegativeNews(symbol) {
    return newsData.value[symbol]?.hasNegative || false
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
   * 取得股票的新聞數量
   * @param {string} symbol - 股票代號
   * @returns {number}
   */
  function getNewsCount(symbol) {
    return newsData.value[symbol]?.news?.length || 0
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
   * 抓取單一股票的新聞
   * @param {string} symbol - 股票代號
   * @param {string} name - 公司名稱
   * @param {Object} options - 選項
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
   * @param {Array} items - [{symbol, name}]
   * @param {Object} options - 選項
   */
  async function fetchBatchNews(items, options = {}) {
    const promises = items.map(({ symbol, name }) =>
      fetchNews(symbol, name, options)
    )
    await Promise.all(promises)
  }

  /**
   * 開啟新聞 Modal
   * @param {string} symbol - 股票代號
   * @param {string} name - 公司名稱
   */
  async function openModal(symbol, name) {
    currentSymbol.value = symbol
    currentTitle.value = name || symbol
    showModal.value = true
    modalLoading.value = true

    await fetchNews(symbol, name)

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
    } else {
      newsData.value = {}
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

  return {
    // 狀態
    newsData,
    loadingSymbols,
    showModal,
    currentSymbol,
    currentTitle,
    modalLoading,

    // 計算屬性
    currentNews,
    currentRiskScore,

    // 方法
    hasNews,
    hasNegativeNews,
    getRiskScore,
    getNews,
    getNewsCount,
    isLoading,
    fetchNews,
    fetchBatchNews,
    openModal,
    closeModal,
    refresh,
    getSummary
  }
}
