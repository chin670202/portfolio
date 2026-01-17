/**
 * API 情緒分析引擎
 *
 * 使用外部 API 進行情緒分析（預留介面）
 * 可整合 OpenAI, Anthropic, 或其他 AI API
 */

// API 配置
let apiConfig = {
  provider: null, // 'openai' | 'anthropic' | 'custom'
  apiKey: null,
  endpoint: null
}

/**
 * API 情緒分析引擎
 */
export class ApiEngine {
  constructor() {
    this.isConfigured = false
  }

  /**
   * 設定 API
   * @param {Object} config - API 配置
   */
  configure(config) {
    apiConfig = { ...apiConfig, ...config }
    this.isConfigured = !!(apiConfig.provider && apiConfig.apiKey)
  }

  /**
   * 檢查是否已就緒
   */
  isReady() {
    return this.isConfigured
  }

  /**
   * 取得引擎資訊
   */
  getInfo() {
    return {
      type: 'api',
      provider: apiConfig.provider,
      configured: this.isConfigured
    }
  }

  /**
   * 分析單則文字的情緒
   * @param {string} text - 要分析的文字
   * @returns {Promise<SentimentResult>}
   */
  async analyze(text) {
    if (!this.isConfigured) {
      console.warn('[Sentiment API] API 尚未設定')
      return { sentiment: 'neutral', confidence: 0, label: '中立' }
    }

    if (!text || typeof text !== 'string') {
      return { sentiment: 'neutral', confidence: 0, label: '中立' }
    }

    try {
      switch (apiConfig.provider) {
        case 'openai':
          return await this.analyzeWithOpenAI(text)
        case 'anthropic':
          return await this.analyzeWithAnthropic(text)
        case 'custom':
          return await this.analyzeWithCustom(text)
        default:
          return { sentiment: 'neutral', confidence: 0, label: '中立' }
      }
    } catch (error) {
      console.error('[Sentiment API] 分析失敗:', error)
      return { sentiment: 'neutral', confidence: 0, label: '中立' }
    }
  }

  /**
   * 使用 OpenAI API 分析
   */
  async analyzeWithOpenAI(text) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              '你是一個金融新聞情緒分析專家。請分析以下新聞標題對股價的影響，只回答 JSON 格式：{"sentiment": "bullish"|"bearish"|"neutral", "confidence": 0-1 的數字}'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1
      })
    })

    const data = await response.json()
    const content = data.choices[0].message.content

    try {
      const result = JSON.parse(content)
      return {
        sentiment: result.sentiment,
        confidence: result.confidence,
        label: result.sentiment === 'bullish' ? '看漲' : result.sentiment === 'bearish' ? '看跌' : '中立'
      }
    } catch {
      return { sentiment: 'neutral', confidence: 0, label: '中立' }
    }
  }

  /**
   * 使用 Anthropic API 分析
   */
  async analyzeWithAnthropic(text) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiConfig.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `分析以下金融新聞標題對股價的影響，只回答 JSON：{"sentiment": "bullish"|"bearish"|"neutral", "confidence": 0-1}\n\n${text}`
          }
        ]
      })
    })

    const data = await response.json()
    const content = data.content[0].text

    try {
      const result = JSON.parse(content)
      return {
        sentiment: result.sentiment,
        confidence: result.confidence,
        label: result.sentiment === 'bullish' ? '看漲' : result.sentiment === 'bearish' ? '看跌' : '中立'
      }
    } catch {
      return { sentiment: 'neutral', confidence: 0, label: '中立' }
    }
  }

  /**
   * 使用自訂 API 分析
   */
  async analyzeWithCustom(text) {
    if (!apiConfig.endpoint) {
      return { sentiment: 'neutral', confidence: 0, label: '中立' }
    }

    const response = await fetch(apiConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({ text })
    })

    const result = await response.json()
    return {
      sentiment: result.sentiment || 'neutral',
      confidence: result.confidence || 0,
      label: result.sentiment === 'bullish' ? '看漲' : result.sentiment === 'bearish' ? '看跌' : '中立'
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
    // API 通常不支援批次，逐一分析
    return Promise.all(texts.map(text => this.analyze(text)))
  }
}
