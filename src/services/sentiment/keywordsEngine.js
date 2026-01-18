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

// ============================================================
// 債券相關性過濾（用於過濾掉公司對別人發表意見的新聞）
// ============================================================

// 表示「發表意見/看法」的關鍵字（這類新聞通常是公司對別人的評論，不是公司本身的財務狀況）
const OPINION_INDICATORS = {
  zh: [
    '看好', '看壞', '看漲', '看跌', '預測', '預期', '分析師', '研究報告',
    '目標價', '評級', '建議', '推薦', '上調', '下調', '調升', '調降',
    '認為', '表示', '指出', '稱', '說', '透露', '分析', '評論',
    '展望', '前景', '觀點', '看法'
  ],
  en: [
    'analyst', 'forecast', 'predict', 'expect', 'target price', 'rating',
    'recommend', 'upgrade', 'downgrade', 'bullish on', 'bearish on',
    'outlook', 'view', 'opinion', 'comment', 'says', 'said', 'believes',
    'thinks', 'sees', 'expects'
  ]
}

// 表示「公司自身財務/經營」的關鍵字
const SELF_RELATED_KEYWORDS = {
  zh: [
    '財報', '營收', '獲利', '盈餘', '淨利', '虧損', '負債', '資產',
    '現金流', '股利', '配息', '違約', '破產', '重整', '裁員', '併購',
    '收購', '被收購', '信用評等', '降評', '升評', '債務', '償還',
    '到期', '贖回', '發行', '籌資', '融資', '減資', '增資',
    '訴訟', '調查', '罰款', '處分', '違規', '經營', '管理層', '執行長',
    '財務長', '董事會', '股東會', '業績', '季報', '年報'
  ],
  en: [
    'earnings', 'revenue', 'profit', 'loss', 'debt', 'asset', 'cash flow',
    'dividend', 'default', 'bankruptcy', 'restructure', 'layoff', 'merger',
    'acquisition', 'credit rating', 'downgrade', 'upgrade', 'bond', 'maturity',
    'redemption', 'issue', 'financing', 'lawsuit', 'investigation', 'fine',
    'penalty', 'ceo', 'cfo', 'board', 'quarterly', 'annual report'
  ]
}

/**
 * 判斷新聞是否與公司自身相關（用於債券過濾）
 * 債券只關心公司是否會違約，因此只保留與公司自身財務/經營相關的新聞
 * @param {string} text - 新聞標題
 * @param {string} companyName - 公司名稱
 * @returns {Object} { isRelevant, reason }
 */
export function isBondRelevantNews(text, companyName) {
  if (!text || !companyName) {
    return { isRelevant: false, reason: 'no_filter' }
  }

  const lowerText = text.toLowerCase()

  // 檢查是否包含「公司自身財務」類關鍵字
  // 只有明確包含這些關鍵字的新聞才列入
  const allSelfKeywords = [...SELF_RELATED_KEYWORDS.zh, ...SELF_RELATED_KEYWORDS.en]
  const matchedSelf = allSelfKeywords.filter(kw => lowerText.includes(kw.toLowerCase()))

  if (matchedSelf.length > 0) {
    return { isRelevant: true, reason: 'self_related', keywords: matchedSelf }
  }

  // 沒有匹配到公司自身財務類關鍵字，一律排除
  return { isRelevant: false, reason: 'no_self_keywords' }
}

// 匯出關鍵字供外部使用
export { BULLISH_KEYWORDS, BEARISH_KEYWORDS, OPINION_INDICATORS, SELF_RELATED_KEYWORDS }
