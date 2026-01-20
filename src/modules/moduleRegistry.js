/**
 * 模組註冊表
 * 定義所有可用的儀表板模組
 */

// 配置版本號（用於重置用戶欄位配置）
export const MODULE_CONFIG_VERSION = 2

// 內建模組定義
export const builtInModules = {
  'summary-cards': {
    uid: 'summary-cards',
    name: '摘要卡片',
    description: '顯示關鍵財務指標：總資產、淨值、年收益等',
    component: 'SummaryCardsModule',
    icon: '📋',
    defaultEnabled: true,
    defaultOrder: 0,
    requiredData: ['匯率'],
    options: {}
  },
  'bonds': {
    uid: 'bonds',
    name: '直債',
    description: '顯示海外直接債券持倉，包含價格、殖利率、配息資訊',
    component: 'OverseasBondsModule',
    icon: '📈',
    defaultEnabled: true,
    defaultOrder: 1,
    requiredData: ['股票', '匯率'],
    options: {
      showLoanDetails: true,
      showDividendInfo: true
    }
  },
  'stocks': {
    uid: 'stocks',
    name: '股票',
    description: '顯示台股與美股持倉，包含價格、損益、配息資訊',
    component: 'StocksModule',
    icon: '📊',
    defaultEnabled: true,
    defaultOrder: 2,
    requiredData: ['ETF', '其它資產', '匯率'],
    options: {
      showTwStocks: true,
      showUsStocks: true
    }
  },
  'crypto': {
    uid: 'crypto',
    name: '加密貨幣',
    description: '顯示加密貨幣持倉，包含價格、損益資訊',
    component: 'CryptoModule',
    icon: '₿',
    defaultEnabled: true,
    defaultOrder: 3,
    requiredData: ['其它資產', '匯率'],
    options: {}
  },
  'loans': {
    uid: 'loans',
    name: '貸款別',
    description: '顯示各項貸款資訊，包含餘額、利率、每月還款',
    component: 'LoansModule',
    icon: '🏦',
    defaultEnabled: true,
    defaultOrder: 4,
    requiredData: ['貸款'],
    options: {}
  },
  'asset-history': {
    uid: 'asset-history',
    name: '資產變化記錄與趨勢圖',
    description: '顯示資產變化歷史記錄與趨勢圖表',
    component: 'AssetHistoryModule',
    icon: '📉',
    defaultEnabled: true,
    defaultOrder: 5,
    requiredData: ['資產變化記錄'],
    options: {
      showTable: true,
      showChart: true
    }
  }
}

/**
 * 取得模組定義
 * @param {string} uid - 模組 UID
 * @returns {Object|null} 模組定義
 */
export function getModuleDefinition(uid) {
  return builtInModules[uid] || null
}

/**
 * 取得所有內建模組列表
 * @returns {Array} 模組列表（按預設順序排序）
 */
export function getAllModules() {
  return Object.values(builtInModules).sort((a, b) => a.defaultOrder - b.defaultOrder)
}

/**
 * 取得預設的模組配置
 * @returns {Array} 預設啟用的模組列表（按順序）
 */
export function getDefaultModuleConfig() {
  return getAllModules()
    .filter(m => m.defaultEnabled)
    .map(m => ({
      uid: m.uid,
      enabled: true,
      order: m.defaultOrder,
      options: { ...m.options },
      columns: m.columns ? [...m.columns] : undefined
    }))
}

/**
 * 合併用戶配置與內建模組（自動加入新模組）
 * @param {Array} userConfig - 用戶現有的模組配置
 * @returns {Array} 合併後的配置
 */
export function mergeModuleConfig(userConfig) {
  if (!userConfig || !Array.isArray(userConfig)) {
    return getDefaultModuleConfig()
  }

  const existingUids = new Set(userConfig.map(m => m.uid))
  const mergedConfig = [...userConfig]

  // 檢查所有內建模組，若用戶配置中沒有則加入
  for (const module of getAllModules()) {
    if (!existingUids.has(module.uid) && module.defaultEnabled) {
      // 新模組插入到對應的預設位置
      mergedConfig.push({
        uid: module.uid,
        enabled: true,
        order: module.defaultOrder,
        options: { ...module.options },
        columns: module.columns ? [...module.columns] : undefined
      })
    }
  }

  // 按 order 排序
  return mergedConfig.sort((a, b) => a.order - b.order)
}
