/**
 * 應用程式設定檔
 * 商用版本可依據環境變數或部署設定調整
 */

// 更新服務設定
export const updateService = {
  // 服務端點 URL
  // 開發環境使用本機，正式環境使用正式服務 URL
  baseUrl: import.meta.env.VITE_UPDATE_SERVICE_URL || 'http://localhost:3002',

  // API 金鑰（選填，用於驗證請求）
  apiKey: import.meta.env.VITE_UPDATE_SERVICE_API_KEY || '',

  // 是否啟用更新功能
  enabled: import.meta.env.VITE_UPDATE_SERVICE_ENABLED !== 'false',

  // 請求超時時間（毫秒）
  timeout: 120000
}

// 功能開關
export const features = {
  // 是否顯示新聞功能
  news: true,

  // 是否顯示資產歷史圖表
  assetHistory: true
}

// 應用程式資訊
export const appInfo = {
  name: '我的投資現況',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0'
}

export default {
  updateService,
  features,
  appInfo
}
