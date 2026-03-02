/**
 * 每日價格快取 Composable
 * 使用 localStorage 儲存當日價格資料，避免重複呼叫 API
 */

const CACHE_KEY = 'portfolio_price_cache'

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function usePriceCache() {
  /**
   * 取得今日快取，日期不符回 null
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
      return data
    } catch {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
  }

  /**
   * 從 rawData 擷取價格存入 localStorage
   */
  function saveCache(rawData) {
    try {
      const cache = {
        date: getTodayKey(),
        fetchedAt: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        rates: { 美元匯率: rawData.匯率?.美元匯率 },
        bonds: {},
        etfs: {},
        others: {}
      }

      rawData.股票?.forEach(b => {
        cache.bonds[b.代號] = { 最新價格: b.最新價格 }
      })

      rawData.ETF?.forEach(e => {
        cache.etfs[e.代號] = {
          最新價格: e.最新價格,
          每股配息: e.每股配息,
          下次配息日: e.下次配息日
        }
      })

      rawData.其它資產?.forEach(a => {
        cache.others[a.代號] = { 最新價格: a.最新價格 }
      })

      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch (e) {
      console.warn('[priceCache] 儲存快取失敗:', e)
    }
  }

  /**
   * 將快取價格寫回 rawData
   */
  function applyCache(rawData, cache) {
    if (cache.rates?.美元匯率 != null) {
      rawData.匯率.美元匯率 = cache.rates.美元匯率
    }

    rawData.股票?.forEach(b => {
      const cached = cache.bonds[b.代號]
      if (cached?.最新價格 != null) b.最新價格 = cached.最新價格
    })

    rawData.ETF?.forEach(e => {
      const cached = cache.etfs[e.代號]
      if (!cached) return
      if (cached.最新價格 != null) e.最新價格 = cached.最新價格
      if (cached.每股配息 != null) e.每股配息 = cached.每股配息
      if (cached.下次配息日 != null) e.下次配息日 = cached.下次配息日
    })

    rawData.其它資產?.forEach(a => {
      const cached = cache.others[a.代號]
      if (cached?.最新價格 != null) a.最新價格 = cached.最新價格
    })
  }

  /**
   * 清除快取
   */
  function clearCache() {
    localStorage.removeItem(CACHE_KEY)
  }

  return { getCache, saveCache, applyCache, clearCache }
}
