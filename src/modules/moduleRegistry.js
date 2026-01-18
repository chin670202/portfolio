/**
 * 模組註冊表
 * 定義所有可用的儀表板模組
 */

// 內建模組定義
export const builtInModules = {
  'overseas-bonds': {
    uid: 'overseas-bonds',
    name: '海外債券',
    description: '顯示海外債券持倉，包含價格、殖利率、配息資訊',
    component: 'OverseasBondsModule',
    icon: '📈',
    defaultEnabled: true,
    defaultOrder: 1,
    // 模組需要的資料欄位
    requiredData: ['股票', '匯率'],
    // 模組設定選項（未來擴充用）
    options: {
      showLoanDetails: true,
      showDividendInfo: true
    }
  },
  'stocks-etf': {
    uid: 'stocks-etf',
    name: '股票/ETF',
    description: '顯示股票與 ETF 持倉，包含價格、損益、配息資訊',
    component: 'StocksEtfModule',
    icon: '📊',
    defaultEnabled: true,
    defaultOrder: 2,
    requiredData: ['ETF', '匯率'],
    options: {
      showLoanDetails: true,
      showDividendInfo: true
    }
  },
  'other-assets': {
    uid: 'other-assets',
    name: '無配息資產',
    description: '顯示美股、台股、加密貨幣等無固定配息資產',
    component: 'OtherAssetsModule',
    icon: '💰',
    defaultEnabled: true,
    defaultOrder: 3,
    requiredData: ['其它資產', '匯率'],
    options: {
      showUsStocks: true,
      showTwStocks: true,
      showCrypto: true
    }
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
      options: { ...m.options }
    }))
}
