/**
 * 統一模組載入器
 * 動態載入內建模組的 manifest.json 和用戶自訂模組
 */

import { normalizeModuleSpec, validateModuleSpec, generateCustomModuleUid } from './validator.js'

// ════════════════════════════════════════
// 內建模組載入
// ════════════════════════════════════════

// 使用 Vite 的 import.meta.glob 動態載入所有 manifest.json
const manifestModules = import.meta.glob('../builtin/*/manifest.json', { eager: true })

// 將載入的 manifest 轉換為模組陣列
const builtinModulesArray = Object.values(manifestModules).map(m => m.default)

// 建立以 uid 為 key 的物件，方便快速查詢
const builtinModulesMap = {}
builtinModulesArray.forEach(module => {
  builtinModulesMap[module.uid] = module
})

/**
 * 取得所有內建模組
 * @returns {Array} 內建模組列表（按 defaultOrder 排序）
 */
export function getBuiltinModules() {
  return [...builtinModulesArray].sort((a, b) =>
    (a.defaultOrder ?? 99) - (b.defaultOrder ?? 99)
  )
}

/**
 * 取得單一內建模組定義
 * @param {string} uid - 模組 UID
 * @returns {Object|null} 模組定義
 */
export function getBuiltinModule(uid) {
  return builtinModulesMap[uid] || null
}

// ════════════════════════════════════════
// 用戶模組載入 (API)
// ════════════════════════════════════════

/**
 * 載入用戶的自訂模組列表
 * @param {string} username - 用戶名
 * @returns {Promise<Array>} 用戶自訂模組列表
 */
export async function loadUserModules(username) {
  try {
    const response = await fetch(`/api/modules/users/${username}`)
    if (!response.ok) {
      // 若 API 不存在或失敗，返回空陣列
      return []
    }
    const data = await response.json()
    return data.modules || []
  } catch (error) {
    console.warn('載入用戶模組失敗:', error)
    return []
  }
}

/**
 * 載入用戶訂閱的模組列表
 * @param {string} username - 用戶名
 * @returns {Promise<Array>} 訂閱模組列表
 */
export async function loadSubscribedModules(username) {
  try {
    const response = await fetch(`/api/modules/users/${username}/subscriptions`)
    if (!response.ok) {
      return []
    }
    const data = await response.json()
    return data.subscriptions || []
  } catch (error) {
    console.warn('載入訂閱模組失敗:', error)
    return []
  }
}

/**
 * 載入單一自訂模組
 * @param {string} username - 用戶名
 * @param {string} moduleUid - 模組 UID
 * @returns {Promise<Object|null>} 模組定義
 */
export async function loadUserModule(username, moduleUid) {
  try {
    const response = await fetch(`/api/modules/users/${username}/${moduleUid}`)
    if (!response.ok) {
      return null
    }
    return await response.json()
  } catch (error) {
    console.warn('載入自訂模組失敗:', error)
    return null
  }
}

// ════════════════════════════════════════
// 統一模組操作
// ════════════════════════════════════════

/**
 * 取得所有可用模組（內建 + 自訂 + 訂閱）
 * @param {Array} customModules - 用戶自訂模組
 * @param {Array} subscribedModules - 訂閱的模組
 * @returns {Array} 所有可用模組
 */
export function getAllAvailableModules(customModules = [], subscribedModules = []) {
  const builtin = getBuiltinModules()

  // 標記自訂模組
  const custom = customModules.map(m => ({
    ...m,
    isCustom: true
  }))

  // 標記訂閱模組
  const subscribed = subscribedModules.map(m => ({
    ...m,
    isSubscribed: true
  }))

  return [...builtin, ...custom, ...subscribed]
}

/**
 * 取得模組定義（支援內建和自訂）
 * @param {string} uid - 模組 UID
 * @param {Array} customModules - 自訂模組列表
 * @returns {Object|null} 模組定義
 */
export function getModuleDefinition(uid, customModules = []) {
  // 先檢查內建模組
  const builtin = getBuiltinModule(uid)
  if (builtin) return builtin

  // 再檢查自訂模組
  const custom = customModules.find(m => m.uid === uid)
  if (custom) return { ...custom, isCustom: true }

  return null
}

// ════════════════════════════════════════
// 向後相容 API（維持舊的函數名稱）
// ════════════════════════════════════════

/**
 * 取得所有內建模組列表
 * @returns {Array} 模組列表（按預設順序排序）
 * @deprecated 請使用 getBuiltinModules()
 */
export function getAllModules() {
  return getBuiltinModules()
}

/**
 * 取得預設的模組配置
 * @returns {Array} 預設啟用的模組列表（按順序）
 */
export function getDefaultModuleConfig() {
  return getBuiltinModules()
    .filter(m => m.defaultEnabled)
    .map(m => ({
      uid: m.uid,
      enabled: true,
      order: m.defaultOrder ?? 99,
      options: { ...m.options }
    }))
}

/**
 * 合併用戶配置與內建模組（自動加入新模組）
 * @param {Array} userConfig - 用戶現有的模組配置
 * @param {Array} customModules - 用戶自訂模組（可選）
 * @returns {Array} 合併後的配置
 */
export function mergeModuleConfig(userConfig, customModules = []) {
  if (!userConfig || !Array.isArray(userConfig)) {
    return getDefaultModuleConfig()
  }

  const existingUids = new Set(userConfig.map(m => m.uid))
  const mergedConfig = [...userConfig]

  // 檢查所有內建模組，若用戶配置中沒有則加入
  for (const module of getBuiltinModules()) {
    if (!existingUids.has(module.uid) && module.defaultEnabled) {
      mergedConfig.push({
        uid: module.uid,
        enabled: true,
        order: module.defaultOrder ?? 99,
        options: { ...module.options }
      })
    }
  }

  // 按 order 排序
  return mergedConfig.sort((a, b) => a.order - b.order)
}

// ════════════════════════════════════════
// 自訂模組 CRUD 操作
// ════════════════════════════════════════

/**
 * 建立新的自訂模組
 * @param {string} username - 用戶名
 * @param {Object} moduleSpec - 模組規格
 * @returns {Promise<Object>} 建立結果
 */
export async function createCustomModule(username, moduleSpec) {
  // 補齊預設值
  const normalized = normalizeModuleSpec({
    ...moduleSpec,
    uid: moduleSpec.uid || generateCustomModuleUid(),
    author: username,
    type: 'custom'
  })

  // 驗證
  const validation = validateModuleSpec(normalized)
  if (!validation.valid) {
    throw new Error(`模組驗證失敗: ${validation.errors.map(e => e.message).join(', ')}`)
  }

  try {
    const response = await fetch(`/api/modules/users/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '建立模組失敗')
    }

    return await response.json()
  } catch (error) {
    console.error('建立自訂模組失敗:', error)
    throw error
  }
}

/**
 * 更新自訂模組
 * @param {string} username - 用戶名
 * @param {string} moduleUid - 模組 UID
 * @param {Object} updates - 更新內容
 * @returns {Promise<Object>} 更新結果
 */
export async function updateCustomModule(username, moduleUid, updates) {
  try {
    const response = await fetch(`/api/modules/users/${username}/${moduleUid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updates,
        updatedAt: new Date().toISOString()
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '更新模組失敗')
    }

    return await response.json()
  } catch (error) {
    console.error('更新自訂模組失敗:', error)
    throw error
  }
}

/**
 * 刪除自訂模組
 * @param {string} username - 用戶名
 * @param {string} moduleUid - 模組 UID
 * @returns {Promise<boolean>} 是否成功
 */
export async function deleteCustomModule(username, moduleUid) {
  try {
    const response = await fetch(`/api/modules/users/${username}/${moduleUid}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '刪除模組失敗')
    }

    return true
  } catch (error) {
    console.error('刪除自訂模組失敗:', error)
    throw error
  }
}

/**
 * 公開模組到市集
 * @param {string} username - 用戶名
 * @param {string} moduleUid - 模組 UID
 * @returns {Promise<Object>} 公開結果
 */
export async function publishModule(username, moduleUid) {
  try {
    const response = await fetch(`/api/modules/users/${username}/${moduleUid}/publish`, {
      method: 'POST'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '公開模組失敗')
    }

    return await response.json()
  } catch (error) {
    console.error('公開模組失敗:', error)
    throw error
  }
}

/**
 * 取消公開模組
 * @param {string} username - 用戶名
 * @param {string} moduleUid - 模組 UID
 * @returns {Promise<boolean>} 是否成功
 */
export async function unpublishModule(username, moduleUid) {
  try {
    const response = await fetch(`/api/modules/users/${username}/${moduleUid}/publish`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '取消公開失敗')
    }

    return true
  } catch (error) {
    console.error('取消公開模組失敗:', error)
    throw error
  }
}

// ════════════════════════════════════════
// 訂閱操作
// ════════════════════════════════════════

/**
 * 訂閱模組
 * @param {string} username - 用戶名
 * @param {string} authorUsername - 模組作者
 * @param {string} moduleUid - 模組 UID
 * @returns {Promise<Object>} 訂閱結果
 */
export async function subscribeModule(username, authorUsername, moduleUid) {
  try {
    const response = await fetch(`/api/modules/users/${username}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorUsername, moduleUid })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '訂閱模組失敗')
    }

    return await response.json()
  } catch (error) {
    console.error('訂閱模組失敗:', error)
    throw error
  }
}

/**
 * 取消訂閱模組
 * @param {string} username - 用戶名
 * @param {string} moduleUid - 模組 UID
 * @returns {Promise<boolean>} 是否成功
 */
export async function unsubscribeModule(username, moduleUid) {
  try {
    const response = await fetch(`/api/modules/users/${username}/subscriptions/${moduleUid}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '取消訂閱失敗')
    }

    return true
  } catch (error) {
    console.error('取消訂閱模組失敗:', error)
    throw error
  }
}

// ════════════════════════════════════════
// 市集 API
// ════════════════════════════════════════

/**
 * 取得市集模組列表
 * @param {Object} options - 查詢選項
 * @param {string} options.category - 分類篩選
 * @param {string} options.search - 搜尋關鍵字
 * @param {string} options.sort - 排序方式 (popular, recent, likes)
 * @param {number} options.page - 頁碼
 * @param {number} options.limit - 每頁數量
 * @returns {Promise<Object>} 市集模組列表
 */
export async function getGalleryModules(options = {}) {
  try {
    const params = new URLSearchParams()
    if (options.category) params.set('category', options.category)
    if (options.search) params.set('search', options.search)
    if (options.sort) params.set('sort', options.sort)
    if (options.page) params.set('page', options.page)
    if (options.limit) params.set('limit', options.limit)

    const response = await fetch(`/api/modules/gallery?${params}`)
    if (!response.ok) {
      throw new Error('取得市集模組失敗')
    }

    return await response.json()
  } catch (error) {
    console.error('取得市集模組失敗:', error)
    return { modules: [], total: 0 }
  }
}

/**
 * 取得市集單一模組詳情
 * @param {string} moduleUid - 模組 UID
 * @returns {Promise<Object|null>} 模組詳情
 */
export async function getGalleryModule(moduleUid) {
  try {
    const response = await fetch(`/api/modules/gallery/${moduleUid}`)
    if (!response.ok) {
      return null
    }
    return await response.json()
  } catch (error) {
    console.error('取得市集模組詳情失敗:', error)
    return null
  }
}

// 匯出驗證相關函數
export { validateModuleSpec, normalizeModuleSpec, generateCustomModuleUid } from './validator.js'
