/**
 * 模組規格驗證器
 * 驗證 ModuleSpec 結構是否符合規範
 */

// ════════════════════════════════════════
// 驗證常數
// ════════════════════════════════════════

const VALID_VISIBILITIES = ['private', 'public', 'unlisted']
const VALID_MODULE_TYPES = ['builtin', 'custom']
const VALID_VALIDATION_STATUSES = ['pending', 'passed', 'failed']
const VALID_COMPONENT_TYPES = ['summary-card', 'stat', 'table', 'list', 'chart-pie', 'chart-bar', 'chart-line']
const VALID_FORMATS = ['currency', 'percent', 'number', 'array']
const VALID_LAYOUTS = ['grid-2', 'grid-3', 'stack', 'full']
const VALID_DATA_SOURCES = ['股票', 'ETF', '其它資產', '貸款', '匯率', '資產變化記錄', '海外債券']

// Semver 正則表達式
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/

// UID 格式：內建模組為小寫字母和連字號，自訂模組為 custom- 前綴加時間戳或隨機字串
const BUILTIN_UID_REGEX = /^[a-z][a-z0-9-]*$/
const CUSTOM_UID_REGEX = /^custom-[a-z0-9-]+$/

// ════════════════════════════════════════
// 輔助函數
// ════════════════════════════════════════

/**
 * 建立驗證錯誤物件
 */
function createError(field, message) {
  return { field, message }
}

/**
 * 檢查是否為有效的 ISO 8601 日期字串
 */
function isValidISODate(str) {
  if (typeof str !== 'string') return false
  const date = new Date(str)
  return !isNaN(date.getTime())
}

/**
 * 檢查是否為有效的 URL
 */
function isValidUrl(str) {
  if (typeof str !== 'string') return false
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

// ════════════════════════════════════════
// 核心驗證函數
// ════════════════════════════════════════

/**
 * 驗證 ModuleSpec 結構是否符合規範
 * @param {object} spec - 模組規格物件
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string}> }}
 */
export function validateModuleSpec(spec) {
  const errors = []

  // 檢查是否為物件
  if (!spec || typeof spec !== 'object') {
    return { valid: false, errors: [createError('root', '模組規格必須是一個物件')] }
  }

  // ─── 核心識別 ───
  if (!spec.uid || typeof spec.uid !== 'string') {
    errors.push(createError('uid', 'uid 為必填欄位且必須是字串'))
  } else if (spec.type === 'builtin' && !BUILTIN_UID_REGEX.test(spec.uid)) {
    errors.push(createError('uid', '內建模組 uid 必須以小寫字母開頭，僅包含小寫字母、數字和連字號'))
  } else if (spec.type === 'custom' && !CUSTOM_UID_REGEX.test(spec.uid)) {
    errors.push(createError('uid', '自訂模組 uid 必須以 "custom-" 開頭'))
  }

  if (!spec.name || typeof spec.name !== 'string') {
    errors.push(createError('name', 'name 為必填欄位且必須是字串'))
  } else if (spec.name.length > 50) {
    errors.push(createError('name', '模組名稱不能超過 50 個字元'))
  }

  // ─── 作者與版本 ───
  if (!spec.author || typeof spec.author !== 'string') {
    errors.push(createError('author', 'author 為必填欄位且必須是字串'))
  }

  if (!spec.version || typeof spec.version !== 'string') {
    errors.push(createError('version', 'version 為必填欄位且必須是字串'))
  } else if (!SEMVER_REGEX.test(spec.version)) {
    errors.push(createError('version', 'version 必須符合 semver 格式 (例如: 1.0.0)'))
  }

  if (spec.changelog !== undefined) {
    if (!Array.isArray(spec.changelog)) {
      errors.push(createError('changelog', 'changelog 必須是字串陣列'))
    } else if (spec.changelog.some(item => typeof item !== 'string')) {
      errors.push(createError('changelog', 'changelog 中的每一項必須是字串'))
    }
  }

  // ─── 分享與訂閱 ───
  if (!spec.visibility || !VALID_VISIBILITIES.includes(spec.visibility)) {
    errors.push(createError('visibility', `visibility 必須是以下之一: ${VALID_VISIBILITIES.join(', ')}`))
  }

  if (spec.subscribers !== undefined) {
    if (!Array.isArray(spec.subscribers)) {
      errors.push(createError('subscribers', 'subscribers 必須是字串陣列'))
    } else if (spec.subscribers.some(item => typeof item !== 'string')) {
      errors.push(createError('subscribers', 'subscribers 中的每一項必須是字串'))
    }
  }

  if (spec.subscriberCount !== undefined && typeof spec.subscriberCount !== 'number') {
    errors.push(createError('subscriberCount', 'subscriberCount 必須是數字'))
  }

  // ─── 分類與標籤 ───
  if (spec.category !== undefined && typeof spec.category !== 'string') {
    errors.push(createError('category', 'category 必須是字串'))
  }

  if (!Array.isArray(spec.tags)) {
    errors.push(createError('tags', 'tags 為必填欄位且必須是字串陣列'))
  } else if (spec.tags.some(tag => typeof tag !== 'string')) {
    errors.push(createError('tags', 'tags 中的每一項必須是字串'))
  }

  // ─── 時間戳 ───
  if (!spec.createdAt || !isValidISODate(spec.createdAt)) {
    errors.push(createError('createdAt', 'createdAt 為必填欄位且必須是有效的 ISO 8601 日期'))
  }

  if (!spec.updatedAt || !isValidISODate(spec.updatedAt)) {
    errors.push(createError('updatedAt', 'updatedAt 為必填欄位且必須是有效的 ISO 8601 日期'))
  }

  if (spec.publishedAt !== undefined && !isValidISODate(spec.publishedAt)) {
    errors.push(createError('publishedAt', 'publishedAt 必須是有效的 ISO 8601 日期'))
  }

  // ─── 顯示資訊 ───
  if (!spec.icon || typeof spec.icon !== 'string') {
    errors.push(createError('icon', 'icon 為必填欄位且必須是字串'))
  }

  if (!spec.description || typeof spec.description !== 'string') {
    errors.push(createError('description', 'description 為必填欄位且必須是字串'))
  } else if (spec.description.length > 200) {
    errors.push(createError('description', '描述不能超過 200 個字元'))
  }

  if (spec.readme !== undefined && typeof spec.readme !== 'string') {
    errors.push(createError('readme', 'readme 必須是字串'))
  }

  if (spec.thumbnail !== undefined && !isValidUrl(spec.thumbnail)) {
    errors.push(createError('thumbnail', 'thumbnail 必須是有效的 URL'))
  }

  if (spec.screenshots !== undefined) {
    if (!Array.isArray(spec.screenshots)) {
      errors.push(createError('screenshots', 'screenshots 必須是 URL 字串陣列'))
    } else if (spec.screenshots.some(url => !isValidUrl(url))) {
      errors.push(createError('screenshots', 'screenshots 中的每一項必須是有效的 URL'))
    }
  }

  // ─── 統計與評分 ───
  if (spec.stats !== undefined) {
    if (typeof spec.stats !== 'object') {
      errors.push(createError('stats', 'stats 必須是物件'))
    } else {
      if (typeof spec.stats.views !== 'number') {
        errors.push(createError('stats.views', 'stats.views 必須是數字'))
      }
      if (typeof spec.stats.likes !== 'number') {
        errors.push(createError('stats.likes', 'stats.likes 必須是數字'))
      }
      if (typeof spec.stats.uses !== 'number') {
        errors.push(createError('stats.uses', 'stats.uses 必須是數字'))
      }
    }
  }

  // ─── 模組類型 ───
  if (!spec.type || !VALID_MODULE_TYPES.includes(spec.type)) {
    errors.push(createError('type', `type 必須是以下之一: ${VALID_MODULE_TYPES.join(', ')}`))
  }

  // ─── 驗證狀態 ───
  if (spec.validation !== undefined) {
    if (typeof spec.validation !== 'object') {
      errors.push(createError('validation', 'validation 必須是物件'))
    } else {
      if (!VALID_VALIDATION_STATUSES.includes(spec.validation.status)) {
        errors.push(createError('validation.status', `validation.status 必須是以下之一: ${VALID_VALIDATION_STATUSES.join(', ')}`))
      }
      if (spec.validation.checkedAt !== undefined && !isValidISODate(spec.validation.checkedAt)) {
        errors.push(createError('validation.checkedAt', 'validation.checkedAt 必須是有效的 ISO 8601 日期'))
      }
      if (spec.validation.errors !== undefined) {
        if (!Array.isArray(spec.validation.errors)) {
          errors.push(createError('validation.errors', 'validation.errors 必須是字串陣列'))
        } else if (spec.validation.errors.some(e => typeof e !== 'string')) {
          errors.push(createError('validation.errors', 'validation.errors 中的每一項必須是字串'))
        }
      }
    }
  }

  // ─── 內建模組專用欄位 ───
  if (spec.type === 'builtin') {
    if (!spec.component || typeof spec.component !== 'string') {
      errors.push(createError('component', '內建模組必須指定 component 欄位'))
    }

    if (spec.requiredData !== undefined) {
      if (!Array.isArray(spec.requiredData)) {
        errors.push(createError('requiredData', 'requiredData 必須是字串陣列'))
      } else if (spec.requiredData.some(item => typeof item !== 'string')) {
        errors.push(createError('requiredData', 'requiredData 中的每一項必須是字串'))
      }
    }

    if (spec.defaultEnabled !== undefined && typeof spec.defaultEnabled !== 'boolean') {
      errors.push(createError('defaultEnabled', 'defaultEnabled 必須是布林值'))
    }

    if (spec.defaultOrder !== undefined && typeof spec.defaultOrder !== 'number') {
      errors.push(createError('defaultOrder', 'defaultOrder 必須是數字'))
    }
  }

  // ─── 自訂模組專用欄位 ───
  if (spec.type === 'custom') {
    // dataBindings 驗證
    if (spec.dataBindings !== undefined) {
      if (!Array.isArray(spec.dataBindings)) {
        errors.push(createError('dataBindings', 'dataBindings 必須是陣列'))
      } else {
        spec.dataBindings.forEach((binding, index) => {
          if (!binding.key || typeof binding.key !== 'string') {
            errors.push(createError(`dataBindings[${index}].key`, 'key 為必填欄位且必須是字串'))
          }
          if (!binding.source || typeof binding.source !== 'string') {
            errors.push(createError(`dataBindings[${index}].source`, 'source 為必填欄位且必須是字串'))
          } else if (!VALID_DATA_SOURCES.includes(binding.source)) {
            errors.push(createError(`dataBindings[${index}].source`, `source 必須是以下之一: ${VALID_DATA_SOURCES.join(', ')}`))
          }
          if (binding.filter !== undefined && binding.filter !== null && typeof binding.filter !== 'string') {
            errors.push(createError(`dataBindings[${index}].filter`, 'filter 必須是字串或 null'))
          }
        })
      }
    }

    // computedFields 驗證
    if (spec.computedFields !== undefined) {
      if (!Array.isArray(spec.computedFields)) {
        errors.push(createError('computedFields', 'computedFields 必須是陣列'))
      } else {
        spec.computedFields.forEach((field, index) => {
          if (!field.key || typeof field.key !== 'string') {
            errors.push(createError(`computedFields[${index}].key`, 'key 為必填欄位且必須是字串'))
          }
          if (!field.label || typeof field.label !== 'string') {
            errors.push(createError(`computedFields[${index}].label`, 'label 為必填欄位且必須是字串'))
          }
          if (!field.formula || typeof field.formula !== 'string') {
            errors.push(createError(`computedFields[${index}].formula`, 'formula 為必填欄位且必須是字串'))
          }
          if (!VALID_FORMATS.includes(field.format)) {
            errors.push(createError(`computedFields[${index}].format`, `format 必須是以下之一: ${VALID_FORMATS.join(', ')}`))
          }
        })
      }
    }

    // components 驗證
    if (spec.components !== undefined) {
      if (!Array.isArray(spec.components)) {
        errors.push(createError('components', 'components 必須是陣列'))
      } else {
        spec.components.forEach((component, index) => {
          if (!VALID_COMPONENT_TYPES.includes(component.type)) {
            errors.push(createError(`components[${index}].type`, `type 必須是以下之一: ${VALID_COMPONENT_TYPES.join(', ')}`))
          }
          if (!component.props || typeof component.props !== 'object') {
            errors.push(createError(`components[${index}].props`, 'props 為必填欄位且必須是物件'))
          }
        })
      }
    }

    // style 驗證
    if (spec.style !== undefined) {
      if (typeof spec.style !== 'object') {
        errors.push(createError('style', 'style 必須是物件'))
      } else {
        if (spec.style.primaryColor !== undefined && typeof spec.style.primaryColor !== 'string') {
          errors.push(createError('style.primaryColor', 'primaryColor 必須是字串'))
        }
        if (spec.style.layout !== undefined && !VALID_LAYOUTS.includes(spec.style.layout)) {
          errors.push(createError('style.layout', `layout 必須是以下之一: ${VALID_LAYOUTS.join(', ')}`))
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 驗證公開前的額外條件
 * @param {object} spec - 模組規格物件
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string}> }}
 */
export function validateForPublish(spec) {
  const errors = []

  // 先執行基本驗證
  const baseValidation = validateModuleSpec(spec)
  if (!baseValidation.valid) {
    return baseValidation
  }

  // 公開模組額外要求
  if (!spec.description || spec.description.length < 10) {
    errors.push(createError('description', '公開模組的描述至少需要 10 個字元'))
  }

  if (!spec.tags || spec.tags.length < 1) {
    errors.push(createError('tags', '公開模組至少需要 1 個標籤'))
  }

  if (!spec.category) {
    errors.push(createError('category', '公開模組必須指定分類'))
  }

  // 自訂模組公開時需要至少一個元件
  if (spec.type === 'custom') {
    if (!spec.components || spec.components.length === 0) {
      errors.push(createError('components', '公開的自訂模組至少需要一個元件'))
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 補齊預設值
 * @param {object} spec - 模組規格物件
 * @returns {object} 補齊預設值後的模組規格
 */
export function normalizeModuleSpec(spec) {
  const now = new Date().toISOString()

  return {
    // 核心欄位（不提供預設值）
    uid: spec.uid,
    name: spec.name,
    author: spec.author,

    // 版本
    version: spec.version || '1.0.0',
    changelog: spec.changelog || [],

    // 分享設定
    visibility: spec.visibility || 'private',
    subscribers: spec.subscribers || [],
    subscriberCount: spec.subscriberCount || 0,

    // 分類
    category: spec.category || null,
    tags: spec.tags || [],

    // 時間戳
    createdAt: spec.createdAt || now,
    updatedAt: spec.updatedAt || now,
    publishedAt: spec.publishedAt || null,

    // 顯示資訊
    icon: spec.icon || '📊',
    description: spec.description || '',
    readme: spec.readme || null,
    thumbnail: spec.thumbnail || null,
    screenshots: spec.screenshots || [],

    // 統計
    stats: spec.stats || {
      views: 0,
      likes: 0,
      uses: 0
    },

    // 類型
    type: spec.type || 'custom',

    // 驗證狀態
    validation: spec.validation || null,

    // 內建模組專用
    ...(spec.type === 'builtin' ? {
      component: spec.component,
      requiredData: spec.requiredData || [],
      defaultEnabled: spec.defaultEnabled ?? true,
      defaultOrder: spec.defaultOrder ?? 99,
      options: spec.options || {}
    } : {}),

    // 自訂模組專用
    ...(spec.type === 'custom' || !spec.type ? {
      isCustom: true,
      layout: spec.layout || 'stack',
      dataBindings: spec.dataBindings || [],
      computedFields: spec.computedFields || [],
      components: spec.components || [],
      style: spec.style || {}
    } : {})
  }
}

/**
 * 生成自訂模組的 UID
 * @returns {string}
 */
export function generateCustomModuleUid() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `custom-${timestamp}-${random}`
}

/**
 * 驗證用戶模組配置
 * @param {object} config - 用戶模組配置物件
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string}> }}
 */
export function validateUserModuleConfig(config) {
  const errors = []

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: [createError('root', '配置必須是一個物件')] }
  }

  if (!config.uid || typeof config.uid !== 'string') {
    errors.push(createError('uid', 'uid 為必填欄位且必須是字串'))
  }

  if (typeof config.enabled !== 'boolean') {
    errors.push(createError('enabled', 'enabled 必須是布林值'))
  }

  if (typeof config.order !== 'number') {
    errors.push(createError('order', 'order 必須是數字'))
  }

  if (config.columns !== undefined) {
    if (!Array.isArray(config.columns)) {
      errors.push(createError('columns', 'columns 必須是陣列'))
    } else {
      config.columns.forEach((col, index) => {
        if (!col.key || typeof col.key !== 'string') {
          errors.push(createError(`columns[${index}].key`, 'key 為必填欄位且必須是字串'))
        }
        if (typeof col.enabled !== 'boolean') {
          errors.push(createError(`columns[${index}].enabled`, 'enabled 必須是布林值'))
        }
        if (typeof col.order !== 'number') {
          errors.push(createError(`columns[${index}].order`, 'order 必須是數字'))
        }
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 驗證模組訂閱記錄
 * @param {object} subscription - 訂閱記錄物件
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string}> }}
 */
export function validateModuleSubscription(subscription) {
  const errors = []

  if (!subscription || typeof subscription !== 'object') {
    return { valid: false, errors: [createError('root', '訂閱記錄必須是一個物件')] }
  }

  if (!subscription.moduleUid || typeof subscription.moduleUid !== 'string') {
    errors.push(createError('moduleUid', 'moduleUid 為必填欄位且必須是字串'))
  }

  if (!subscription.authorUsername || typeof subscription.authorUsername !== 'string') {
    errors.push(createError('authorUsername', 'authorUsername 為必填欄位且必須是字串'))
  }

  if (!subscription.subscribedAt || !isValidISODate(subscription.subscribedAt)) {
    errors.push(createError('subscribedAt', 'subscribedAt 為必填欄位且必須是有效的 ISO 8601 日期'))
  }

  if (!subscription.lastSyncedVersion || typeof subscription.lastSyncedVersion !== 'string') {
    errors.push(createError('lastSyncedVersion', 'lastSyncedVersion 為必填欄位且必須是字串'))
  }

  if (typeof subscription.enabled !== 'boolean') {
    errors.push(createError('enabled', 'enabled 必須是布林值'))
  }

  if (typeof subscription.order !== 'number') {
    errors.push(createError('order', 'order 必須是數字'))
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// 匯出常數供外部使用
export const constants = {
  VALID_VISIBILITIES,
  VALID_MODULE_TYPES,
  VALID_VALIDATION_STATUSES,
  VALID_COMPONENT_TYPES,
  VALID_FORMATS,
  VALID_LAYOUTS,
  VALID_DATA_SOURCES
}
