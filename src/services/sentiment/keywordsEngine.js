/**
 * 關鍵字情緒分析引擎
 *
 * 使用預定義的關鍵字進行情緒判斷
 * 這是最輕量的方案，不需要下載模型
 */

// 看漲關鍵字
const BULLISH_KEYWORDS = {
  zh: [
    '上漲', '大漲', '飆漲', '暴漲', '創新高', '突破', '利多', '利好',
    '獲利', '盈餘', '成長', '增長', '擴張', '併購', '投資', '合作',
    '訂單', '營收', '業績', '看好', '樂觀', '回升', '反彈', '強勢',
    '買進', '加碼', '上調', '升評', '推薦', '目標價', '新產品',
    '技術突破', '市占率', '擴產', '滿載', '爆單', '需求強勁'
  ],
  en: [
    'surge', 'soar', 'rally', 'gain', 'rise', 'up', 'high', 'record',
    'bullish', 'optimistic', 'growth', 'profit', 'earnings', 'beat',
    'upgrade', 'buy', 'outperform', 'strong', 'expand', 'acquisition',
    'partnership', 'deal', 'contract', 'order', 'revenue', 'breakthrough',
    'innovation', 'launch', 'demand', 'positive'
  ]
}

// 看跌關鍵字
const BEARISH_KEYWORDS = {
  zh: [
    '下跌', '暴跌', '崩盤', '跳水', '虧損', '裁員', '訴訟', '警示',
    '違約', '破產', '倒閉', '負債', '調查', '罰款', '召回', '危機',
    '風險', '下修', '降評', '減產', '停工', '延遲', '取消', '衰退',
    '萎縮', '利空', '看壞', '悲觀', '賣出', '減碼', '套牢', '斷頭',
    '跌破', '新低', '恐慌', '拋售', '出貨', '獲利了結'
  ],
  en: [
    'drop', 'fall', 'plunge', 'crash', 'decline', 'down', 'low', 'loss',
    'bearish', 'pessimistic', 'miss', 'layoff', 'lawsuit', 'investigation',
    'fine', 'recall', 'bankruptcy', 'default', 'debt', 'risk', 'crisis',
    'downgrade', 'sell', 'underperform', 'weak', 'cut', 'delay', 'cancel',
    'recession', 'slowdown', 'warning', 'negative', 'concern'
  ]
}

/**
 * 關鍵字情緒分析引擎
 */
export class KeywordsEngine {
  constructor() {
    this.bullishKeywords = [...BULLISH_KEYWORDS.zh, ...BULLISH_KEYWORDS.en]
    this.bearishKeywords = [...BEARISH_KEYWORDS.zh, ...BEARISH_KEYWORDS.en]
  }

  /**
   * 檢查是否已就緒（關鍵字引擎永遠就緒）
   */
  isReady() {
    return true
  }

  /**
   * 取得引擎資訊
   */
  getInfo() {
    return {
      type: 'keywords',
      bullishCount: this.bullishKeywords.length,
      bearishCount: this.bearishKeywords.length
    }
  }

  /**
   * 分析單則文字的情緒
   * @param {string} text - 要分析的文字
   * @returns {Promise<SentimentResult>}
   */
  async analyze(text) {
    if (!text || typeof text !== 'string') {
      return { sentiment: 'neutral', confidence: 0, label: '中立' }
    }

    const lowerText = text.toLowerCase()

    // 計算看漲和看跌關鍵字數量
    let bullishScore = 0
    let bearishScore = 0
    const matchedBullish = []
    const matchedBearish = []

    for (const keyword of this.bullishKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        bullishScore++
        matchedBullish.push(keyword)
      }
    }

    for (const keyword of this.bearishKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        bearishScore++
        matchedBearish.push(keyword)
      }
    }

    // 判斷情緒
    const totalMatches = bullishScore + bearishScore
    if (totalMatches === 0) {
      return { sentiment: 'neutral', confidence: 0, label: '中立' }
    }

    const bullishRatio = bullishScore / totalMatches
    const bearishRatio = bearishScore / totalMatches

    // 計算信心度（基於匹配數量）
    const confidence = Math.min(totalMatches / 5, 1) // 最多 5 個關鍵字給滿信心度

    if (bullishRatio > 0.6) {
      return {
        sentiment: 'bullish',
        confidence: confidence * bullishRatio,
        label: '看漲',
        keywords: matchedBullish
      }
    } else if (bearishRatio > 0.6) {
      return {
        sentiment: 'bearish',
        confidence: confidence * bearishRatio,
        label: '看跌',
        keywords: matchedBearish
      }
    } else {
      return {
        sentiment: 'neutral',
        confidence: confidence * 0.5,
        label: '中立',
        keywords: [...matchedBullish, ...matchedBearish]
      }
    }
  }

  /**
   * 批次分析多則文字
   * @param {string[]} texts - 文字陣列
   * @returns {Promise<SentimentResult[]>}
   */
  async analyzeBatch(texts) {
    if (!Array.isArray(texts)) {
      return []
    }
    return Promise.all(texts.map(text => this.analyze(text)))
  }
}

// 匯出關鍵字供外部使用
export { BULLISH_KEYWORDS, BEARISH_KEYWORDS }
