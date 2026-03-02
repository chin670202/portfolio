/**
 * 累計配息資料 Composable
 * 管理歷史配息抓取、open_lots 取得、累計計算
 * 使用 localStorage 每日快取
 */

import { ref } from 'vue'
import { updateService } from '../config'
import { getDividendHistory } from '../services/api'
import {
  calculateEtfCumulativeDividend,
  calculateBondCumulativeDividend,
} from '../services/dividendCalculator'

const CACHE_KEY = 'portfolio_dividend_cache'

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getHeaders() {
  const h = { 'Content-Type': 'application/json' }
  if (updateService.apiKey) h['X-API-Key'] = updateService.apiKey
  return h
}

export function useDividendHistory() {
  // { [symbol]: { 累計配息: number, history: [...] } }
  const dividendData = ref({})
  const loading = ref(false)

  /**
   * 讀取 localStorage 快取
   */
  function getCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null
      const data = JSON.parse(raw)
      if (data.date !== getTodayKey()) {
        localStorage.removeItem(CACHE_KEY)
        return null
      }
      return data.data
    } catch {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
  }

  /**
   * 儲存快取到 localStorage
   */
  function saveCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        date: getTodayKey(),
        data,
      }))
    } catch (e) {
      console.warn('[dividendCache] 儲存快取失敗:', e)
    }
  }

  /**
   * 清除快取
   */
  function clearCache() {
    localStorage.removeItem(CACHE_KEY)
  }

  /**
   * 從後端取得 open_lots
   */
  async function fetchOpenLots(username) {
    try {
      const res = await fetch(`${updateService.baseUrl}/trades/${username}/lots`, {
        headers: getHeaders(),
      })
      if (!res.ok) return {}
      return await res.json()
    } catch (e) {
      console.warn('[dividendHistory] 取得 open_lots 失敗:', e)
      return {}
    }
  }

  /**
   * 抓取歷史配息並計算累計配息
   * @param {Object} rawData - 投資組合原始資料
   * @param {string} username - 用戶名稱
   * @param {boolean} forceRefresh - 是否強制重新抓取（忽略快取）
   */
  async function fetchAndCalculate(rawData, username, forceRefresh = false) {
    if (!rawData) return

    // 檢查快取
    if (!forceRefresh) {
      const cached = getCache()
      if (cached) {
        dividendData.value = cached
        return
      }
    }

    loading.value = true
    const result = {}

    try {
      // 1. 計算債券累計配息（不需外部資料）
      const usdRate = rawData.匯率?.美元匯率 || 30
      for (const bond of rawData.股票 || []) {
        const { cumulative, paymentCount } = calculateBondCumulativeDividend(bond, usdRate)
        if (cumulative > 0) {
          result[bond.代號] = {
            累計配息: cumulative,
            配息次數: paymentCount,
          }
        } else if (paymentCount === 0 && bond.交易日) {
          result[bond.代號] = {
            累計配息: 0,
            配息次數: 0,
          }
        }
      }

      // 2. 取得 open_lots（ETF/股票需要買入日期）
      const openLots = await fetchOpenLots(username)

      // 3. 找出需要查歷史配息的 symbols
      // ETF 中有配息的才需要查
      const etfSymbols = (rawData.ETF || [])
        .filter(etf => etf.配息頻率 && etf.配息頻率 > 0)
        .map(etf => etf.代號)

      // 只對有 open_lots 的 symbol 查歷史配息
      const symbolsToFetch = etfSymbols.filter(s => openLots[s]?.length > 0)

      // 4. 並行抓取 CMoney 歷史配息
      const historyPromises = symbolsToFetch.map(async (symbol) => {
        try {
          const history = await getDividendHistory(symbol)
          const lots = openLots[symbol]
          const cumulative = calculateEtfCumulativeDividend(history, lots)

          if (cumulative > 0) {
            result[symbol] = { 累計配息: cumulative }
          }
        } catch (e) {
          console.warn(`[dividendHistory] ${symbol} 抓取失敗:`, e)
        }
      })

      await Promise.all(historyPromises)

      // 5. 對沒有 open_lots 但有配息的 ETF，標記為無資料
      for (const symbol of etfSymbols) {
        if (!result[symbol] && !openLots[symbol]?.length) {
          // 沒有交易記錄，無法計算累計配息
          result[symbol] = { 累計配息: null }
        }
      }

      dividendData.value = result
      saveCache(result)
    } catch (e) {
      console.error('[dividendHistory] 計算失敗:', e)
    } finally {
      loading.value = false
    }
  }

  return { dividendData, loading, fetchAndCalculate, clearCache }
}
