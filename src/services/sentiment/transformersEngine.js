/**
 * Transformers.js 情緒分析引擎
 *
 * 使用 Hugging Face 的 Transformers.js 在瀏覽器端執行 AI 模型
 * 模型會在首次使用時下載並快取到 IndexedDB
 */

// 模型配置
const MODEL_CONFIG = {
  // 使用多語言情緒分析模型
  model: 'Xenova/bert-base-multilingual-uncased-sentiment',
  // 備用模型（較小）
  fallbackModel: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
}

// 狀態
let pipeline = null
let isInitialized = false
let isLoading = false
let loadError = null

/**
 * Transformers.js 情緒分析引擎
 */
export class TransformersEngine {
  constructor() {
    this.modelName = MODEL_CONFIG.model
  }

  /**
   * 初始化模型（預載）
   */
  async init() {
    if (isInitialized || isLoading) return
    isLoading = true
    loadError = null

    try {
      // 動態載入 transformers.js
      const { pipeline: createPipeline } = await import('@xenova/transformers')

      console.log('[Sentiment] 載入模型中...', this.modelName)

      // 建立 sentiment-analysis pipeline
      pipeline = await createPipeline('sentiment-analysis', this.modelName, {
        // 使用 WebGPU 如果可用，否則用 WASM
        device: 'webgpu',
        // 模型快取設定
        cache_dir: 'sentiment-models'
      })

      isInitialized = true
      console.log('[Sentiment] 模型載入完成')
    } catch (error) {
      console.warn('[Sentiment] 主模型載入失敗，嘗試備用模型', error)

      try {
        const { pipeline: createPipeline } = await import('@xenova/transformers')
        this.modelName = MODEL_CONFIG.fallbackModel
        pipeline = await createPipeline('sentiment-analysis', this.modelName)
        isInitialized = true
        console.log('[Sentiment] 備用模型載入完成')
      } catch (fallbackError) {
        loadError = fallbackError
        console.error('[Sentiment] 模型載入失敗', fallbackError)
      }
    } finally {
      isLoading = false
    }
  }

  /**
   * 檢查是否已就緒
   */
  isReady() {
    return isInitialized && !isLoading
  }

  /**
   * 取得引擎資訊
   */
  getInfo() {
    return {
      model: this.modelName,
      initialized: isInitialized,
      loading: isLoading,
      error: loadError?.message || null
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

    // 確保模型已載入
    if (!isInitialized) {
      await this.init()
    }

    if (!pipeline) {
      // 模型載入失敗，回傳中立
      return { sentiment: 'neutral', confidence: 0, label: '中立' }
    }

    try {
      // 截取前 512 字元（模型限制）
      const truncatedText = text.slice(0, 512)

      // 執行情緒分析
      const result = await pipeline(truncatedText)

      // 轉換結果格式
      return this.convertResult(result[0])
    } catch (error) {
      console.error('[Sentiment] 分析失敗:', error)
      return { sentiment: 'neutral', confidence: 0, label: '中立' }
    }
  }

  /**
   * 批次分析多則文字
   * @param {string[]} texts - 文字陣列
   * @returns {Promise<SentimentResult[]>}
   */
  async analyzeBatch(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      return []
    }

    // 確保模型已載入
    if (!isInitialized) {
      await this.init()
    }

    if (!pipeline) {
      // 模型載入失敗，回傳中立
      return texts.map(() => ({ sentiment: 'neutral', confidence: 0, label: '中立' }))
    }

    try {
      // 截取每則文字
      const truncatedTexts = texts.map(t => (t || '').slice(0, 512))

      // 批次分析
      const results = await pipeline(truncatedTexts)

      return results.map(r => this.convertResult(r))
    } catch (error) {
      console.error('[Sentiment] 批次分析失敗:', error)
      return texts.map(() => ({ sentiment: 'neutral', confidence: 0, label: '中立' }))
    }
  }

  /**
   * 轉換模型輸出為統一格式
   * @param {Object} result - 模型原始輸出
   * @returns {SentimentResult}
   */
  convertResult(result) {
    if (!result) {
      return { sentiment: 'neutral', confidence: 0, label: '中立' }
    }

    const { label, score } = result

    // 模型輸出格式：
    // bert-base-multilingual-uncased-sentiment: 1-5 星評分
    // distilbert-base-uncased-finetuned-sst-2-english: POSITIVE/NEGATIVE

    let sentiment, displayLabel

    if (label.includes('star') || /^[1-5]$/.test(label)) {
      // 星級評分模型 (1-5)
      const stars = parseInt(label.replace(' star', '').replace(' stars', ''))
      if (stars >= 4) {
        sentiment = 'bullish'
        displayLabel = '看漲'
      } else if (stars <= 2) {
        sentiment = 'bearish'
        displayLabel = '看跌'
      } else {
        sentiment = 'neutral'
        displayLabel = '中立'
      }
    } else if (label === 'POSITIVE' || label === 'positive') {
      sentiment = 'bullish'
      displayLabel = '看漲'
    } else if (label === 'NEGATIVE' || label === 'negative') {
      sentiment = 'bearish'
      displayLabel = '看跌'
    } else {
      sentiment = 'neutral'
      displayLabel = '中立'
    }

    return {
      sentiment,
      confidence: score,
      label: displayLabel
    }
  }
}
