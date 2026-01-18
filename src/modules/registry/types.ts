/**
 * 模組系統型別定義
 * 統一內建模組和自訂模組的元數據結構
 */

// ════════════════════════════════════════
// 核心介面
// ════════════════════════════════════════

/**
 * 模組可見性
 */
export type ModuleVisibility = 'private' | 'public' | 'unlisted'

/**
 * 模組類型
 */
export type ModuleType = 'builtin' | 'custom'

/**
 * 驗證狀態
 */
export type ValidationStatus = 'pending' | 'passed' | 'failed'

/**
 * 模組統計資料
 */
export interface ModuleStats {
  views: number      // 瀏覽次數
  likes: number      // 按讚數
  uses: number       // 使用次數
}

/**
 * 模組驗證狀態
 */
export interface ModuleValidation {
  status: ValidationStatus
  checkedAt?: string       // ISO 8601 最後驗證時間
  errors?: string[]        // 驗證錯誤訊息
}

// ════════════════════════════════════════
// 自訂模組專用介面
// ════════════════════════════════════════

/**
 * 資料綁定定義
 */
export interface DataBinding {
  key: string              // 綁定的變數名稱
  source: string           // 資料來源（股票、ETF、其它資產、貸款、匯率、資產變化記錄）
  filter?: string | null   // 篩選條件（格式：field:operator:value）
}

/**
 * 計算欄位定義
 */
export interface ComputedField {
  key: string              // 欄位鍵名
  label: string            // 顯示標籤
  formula: string          // 計算公式（支援 sum, avg, count, max, min）
  format: 'currency' | 'percent' | 'number' | 'array'
}

/**
 * 元件規格
 */
export interface ComponentSpec {
  type: 'summary-card' | 'stat' | 'table' | 'list' | 'chart-pie' | 'chart-bar' | 'chart-line'
  props: Record<string, unknown>
}

/**
 * 樣式配置
 */
export interface StyleSpec {
  primaryColor?: string    // 主色調
  layout?: 'grid-2' | 'grid-3' | 'stack' | 'full'
}

// ════════════════════════════════════════
// 主要模組規格介面
// ════════════════════════════════════════

/**
 * 統一的模組規格介面
 * 適用於內建模組和自訂模組
 */
export interface ModuleSpec {
  // ─── 核心識別 ───
  uid: string              // 唯一識別碼（builtin-xxx 或 custom-timestamp）
  name: string             // 顯示名稱

  // ─── 作者與版本 ───
  author: string           // 創作者用戶名（內建模組為 "system"）
  authorDisplayName?: string // 作者顯示名稱
  version: string          // 版本號 (semver 格式)
  changelog?: string[]     // 版本更新記錄

  // ─── 分享與訂閱 ───
  visibility: ModuleVisibility
  subscribers?: string[]   // 訂閱者列表
  subscriberCount?: number // 訂閱人數（快取）

  // ─── 分類與標籤 ───
  category?: string        // 主分類
  tags: string[]           // 標籤

  // ─── 時間戳 ───
  createdAt: string        // ISO 8601 建立時間
  updatedAt: string        // ISO 8601 最後更新時間
  publishedAt?: string     // ISO 8601 首次公開時間

  // ─── 顯示資訊 ───
  icon: string             // emoji 圖標
  description: string      // 模組描述（短）
  readme?: string          // 詳細說明（Markdown）
  thumbnail?: string       // 縮圖 URL
  screenshots?: string[]   // 截圖 URL 陣列

  // ─── 統計與評分 ───
  stats?: ModuleStats

  // ─── 模組類型 ───
  type: ModuleType

  // ─── 驗證狀態 ───
  validation?: ModuleValidation

  // ─── 內建模組專用 ───
  component?: string       // Vue 元件名稱
  requiredData?: string[]  // 需要的資料欄位
  defaultEnabled?: boolean // 預設是否啟用
  defaultOrder?: number    // 預設排序
  options?: Record<string, unknown>

  // ─── 自訂模組專用 ───
  isCustom?: boolean       // 向後相容標記
  layout?: string
  dataBindings?: DataBinding[]
  computedFields?: ComputedField[]
  components?: ComponentSpec[]
  style?: StyleSpec
}

// ════════════════════════════════════════
// 用戶配置介面
// ════════════════════════════════════════

/**
 * 用戶的模組配置（儲存在用戶 JSON 中）
 */
export interface UserModuleConfig {
  uid: string              // 模組 UID
  enabled: boolean         // 是否啟用
  order: number            // 顯示順序
  options?: Record<string, unknown>
  columns?: ColumnConfig[]

  // 訂閱模組專用
  subscribed?: boolean     // 是否為訂閱的模組
  author?: string          // 原作者（訂閱模組）
}

/**
 * 欄位配置
 */
export interface ColumnConfig {
  key: string
  enabled: boolean
  order: number
}

/**
 * 模組訂閱記錄
 */
export interface ModuleSubscription {
  moduleUid: string        // 模組 UID
  authorUsername: string   // 原作者用戶名
  subscribedAt: string     // 訂閱時間
  lastSyncedVersion: string // 最後同步的版本
  enabled: boolean         // 是否啟用
  order: number            // 顯示順序
}

// ════════════════════════════════════════
// 市集相關介面
// ════════════════════════════════════════

/**
 * 市集索引項目
 */
export interface GalleryIndexItem {
  uid: string
  name: string
  author: string
  icon: string
  description: string
  category?: string
  tags: string[]
  subscriberCount: number
  updatedAt: string
}

/**
 * 用戶模組索引
 */
export interface UserModuleIndex {
  modules: string[]        // 模組 UID 列表
  lastUpdated: string      // 最後更新時間
}

/**
 * 用戶訂閱索引
 */
export interface UserSubscriptionIndex {
  subscriptions: ModuleSubscription[]
}
