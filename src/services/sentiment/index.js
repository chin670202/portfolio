/**
 * 情緒分析模組入口
 *
 * 模組化設計，支援切換不同的分析引擎：
 * - transformers: Transformers.js (瀏覽器端 AI)
 * - keywords: 關鍵字比對 (目前的方式)
 * - api: 外部 API (未來擴充)
 */

// 預設使用的引擎（keywords 較輕量，transformers 更智能但需下載模型）
let currentEngine = 'keywords'

// 引擎實例快取
let engineInstance = null

/**
 * 情緒分析結果
 * @typedef {Object} SentimentResult
 * @property {'bullish'|'bearish'|'neutral'} sentiment - 情緒判斷
 * @property {number} confidence - 信心度 (0-1)
 * @property {string} label - 顯示標籤
 */

/**
 * 設定使用的分析引擎
 * @param {'transformers'|'keywords'|'api'} engine - 引擎名稱
 */
export function setEngine(engine) {
  const validEngines = ['transformers', 'keywords', 'api']
  if (!validEngines.includes(engine)) {
    console.warn(`不支援的引擎: ${engine}，維持使用 ${currentEngine}`)
    return
  }
  if (engine !== currentEngine) {
    currentEngine = engine
    engineInstance = null // 清除快取，下次使用時重新載入
  }
}

/**
 * 取得當前引擎
 * @returns {string}
 */
export function getEngine() {
  return currentEngine
}

/**
 * 動態載入引擎
 * @returns {Promise<Object>}
 */
async function loadEngine() {
  if (engineInstance) return engineInstance

  switch (currentEngine) {
    case 'transformers':
      const { TransformersEngine } = await import('./transformersEngine.js')
      engineInstance = new TransformersEngine()
      break
    case 'keywords':
      const { KeywordsEngine } = await import('./keywordsEngine.js')
      engineInstance = new KeywordsEngine()
      break
    case 'api':
      const { ApiEngine } = await import('./apiEngine.js')
      engineInstance = new ApiEngine()
      break
    default:
      throw new Error(`未知的引擎: ${currentEngine}`)
  }

  return engineInstance
}

/**
 * 分析單則新聞的情緒
 * @param {string} text - 新聞標題或內容
 * @returns {Promise<SentimentResult>}
 */
export async function analyzeSentiment(text) {
  const engine = await loadEngine()
  return engine.analyze(text)
}

/**
 * 批次分析多則新聞
 * @param {string[]} texts - 新聞標題陣列
 * @returns {Promise<SentimentResult[]>}
 */
export async function analyzeBatch(texts) {
  const engine = await loadEngine()
  return engine.analyzeBatch(texts)
}

/**
 * 初始化引擎（預載模型）
 * @returns {Promise<void>}
 */
export async function initEngine() {
  const engine = await loadEngine()
  if (engine.init) {
    await engine.init()
  }
}

/**
 * 檢查引擎是否已就緒
 * @returns {Promise<boolean>}
 */
export async function isReady() {
  const engine = await loadEngine()
  return engine.isReady ? engine.isReady() : true
}

/**
 * 取得引擎狀態
 * @returns {Promise<Object>}
 */
export async function getStatus() {
  const engine = await loadEngine()
  return {
    engine: currentEngine,
    ready: engine.isReady ? engine.isReady() : true,
    info: engine.getInfo ? engine.getInfo() : {}
  }
}
