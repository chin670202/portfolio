/**
 * 各模組的欄位定義
 * 用於欄位配置編輯器和表格動態渲染
 */

// 海外債券欄位定義
export const overseasBondsColumns = [
  { key: 'companyName', label: '公司名稱', dataKey: '公司名稱', defaultVisible: true, defaultOrder: 1, align: 'left' },
  { key: 'symbol', label: '代號', dataKey: '代號', defaultVisible: true, defaultOrder: 2, align: 'left' },
  { key: 'buyPrice', label: '買入價格', dataKey: '買入價格', defaultVisible: true, defaultOrder: 3, align: 'right' },
  { key: 'units', label: '持有單位', dataKey: '持有單位', defaultVisible: true, defaultOrder: 4, align: 'right' },
  { key: 'latestPrice', label: '最新價格', dataKey: '最新價格', defaultVisible: true, defaultOrder: 5, align: 'right', isCalculated: true },
  { key: 'profitPercent', label: '損益(%)', dataKey: '損益百分比', defaultVisible: true, defaultOrder: 6, align: 'right', isCalculated: true },
  { key: 'twdAsset', label: '台幣資產', dataKey: '台幣資產', defaultVisible: true, defaultOrder: 7, align: 'right', isCalculated: true },
  { key: 'ratio', label: '佔比', dataKey: null, defaultVisible: true, defaultOrder: 8, align: 'right', isCalculated: true },
  { key: 'couponRate', label: '票面利率', dataKey: '票面利率', defaultVisible: true, defaultOrder: 9, align: 'right' },
  { key: 'yield', label: '年殖利率', dataKey: '年殖利率', defaultVisible: true, defaultOrder: 10, align: 'right', isCalculated: true },
  { key: 'annualInterest', label: '每年利息', dataKey: '每年利息', defaultVisible: true, defaultOrder: 11, align: 'right', isCalculated: true },
  { key: 'paymentDate', label: '配息日', dataKey: '配息日', defaultVisible: true, defaultOrder: 12, align: 'center' },
  { key: 'daysToPayment', label: '剩餘天配息', dataKey: '剩餘天配息', defaultVisible: true, defaultOrder: 13, align: 'right', isCalculated: true },
  { key: 'nextPayment', label: '下次配息', dataKey: '下次配息', defaultVisible: true, defaultOrder: 14, align: 'right', isCalculated: true },
  { key: 'maturityDate', label: '到期日', dataKey: '到期日', defaultVisible: true, defaultOrder: 15, align: 'center' },
  { key: 'yearsToMaturity', label: '剩餘年數', dataKey: null, defaultVisible: true, defaultOrder: 16, align: 'right', isCalculated: true },
  { key: 'news', label: '新聞', dataKey: null, defaultVisible: true, defaultOrder: 17, align: 'center', isAction: true }
]

// 股票/ETF 欄位定義
export const stocksEtfColumns = [
  { key: 'name', label: 'ETF名稱', dataKey: '名稱', defaultVisible: true, defaultOrder: 1, align: 'left' },
  { key: 'symbol', label: '代號', dataKey: '代號', defaultVisible: true, defaultOrder: 2, align: 'left' },
  { key: 'buyPrice', label: '買入均價', dataKey: '買入均價', defaultVisible: true, defaultOrder: 3, align: 'right' },
  { key: 'units', label: '持有單位', dataKey: '持有單位', defaultVisible: true, defaultOrder: 4, align: 'right' },
  { key: 'latestPrice', label: '最新價格', dataKey: '最新價格', defaultVisible: true, defaultOrder: 5, align: 'right', isCalculated: true },
  { key: 'profitPercent', label: '損益(%)', dataKey: '損益百分比', defaultVisible: true, defaultOrder: 6, align: 'right', isCalculated: true },
  { key: 'twdAsset', label: '台幣資產', dataKey: '台幣資產', defaultVisible: true, defaultOrder: 7, align: 'right', isCalculated: true },
  { key: 'ratio', label: '佔比', dataKey: null, defaultVisible: true, defaultOrder: 8, align: 'right', isCalculated: true },
  { key: 'dividend', label: '每股配息', dataKey: '每股配息', defaultVisible: true, defaultOrder: 9, align: 'right', isCalculated: true },
  { key: 'yield', label: '年殖利率', dataKey: '年殖利率', defaultVisible: true, defaultOrder: 10, align: 'right', isCalculated: true },
  { key: 'annualInterest', label: '每年利息', dataKey: '每年利息', defaultVisible: true, defaultOrder: 11, align: 'right', isCalculated: true },
  { key: 'nextPaymentDate', label: '下次配息日', dataKey: '下次配息日', defaultVisible: true, defaultOrder: 12, align: 'center' },
  { key: 'daysToPayment', label: '剩餘天配息', dataKey: '剩餘天配息', defaultVisible: true, defaultOrder: 13, align: 'right', isCalculated: true },
  { key: 'nextPayment', label: '下次配息', dataKey: '下次配息', defaultVisible: true, defaultOrder: 14, align: 'right', isCalculated: true },
  { key: 'latestYield', label: '最新殖利率', dataKey: '最新殖利率', defaultVisible: true, defaultOrder: 15, align: 'right', isCalculated: true },
  { key: 'news', label: '新聞', dataKey: null, defaultVisible: true, defaultOrder: 16, align: 'center', isAction: true }
]

// 無配息資產欄位定義
export const otherAssetsColumns = [
  { key: 'name', label: '名稱', dataKey: '名稱', defaultVisible: true, defaultOrder: 1, align: 'left' },
  { key: 'symbol', label: '代號', dataKey: '代號', defaultVisible: true, defaultOrder: 2, align: 'left' },
  { key: 'buyPrice', label: '買入均價', dataKey: '買入均價', defaultVisible: true, defaultOrder: 3, align: 'right' },
  { key: 'units', label: '持有單位', dataKey: '持有單位', defaultVisible: true, defaultOrder: 4, align: 'right' },
  { key: 'latestPrice', label: '最新價格', dataKey: '最新價格', defaultVisible: true, defaultOrder: 5, align: 'right', isCalculated: true },
  { key: 'twdProfit', label: '台幣損益', dataKey: '台幣損益', defaultVisible: true, defaultOrder: 6, align: 'right', isCalculated: true },
  { key: 'profitPercent', label: '損益(%)', dataKey: '損益百分比', defaultVisible: true, defaultOrder: 7, align: 'right', isCalculated: true },
  { key: 'twdAsset', label: '台幣資產', dataKey: '台幣資產', defaultVisible: true, defaultOrder: 8, align: 'right', isCalculated: true },
  { key: 'ratio', label: '佔比', dataKey: null, defaultVisible: true, defaultOrder: 9, align: 'right', isCalculated: true },
  { key: 'news', label: '新聞', dataKey: null, defaultVisible: true, defaultOrder: 10, align: 'center', isAction: true }
]

// 貸款欄位定義
export const loansColumns = [
  { key: 'loanType', label: '貸款別', dataKey: '貸款別', defaultVisible: true, defaultOrder: 1, align: 'left' },
  { key: 'balance', label: '貸款餘額', dataKey: '貸款餘額', defaultVisible: true, defaultOrder: 2, align: 'right' },
  { key: 'rate', label: '貸款利率', dataKey: '貸款利率', defaultVisible: true, defaultOrder: 3, align: 'right' },
  { key: 'monthlyPayment', label: '月繳金額', dataKey: '月繳金額', defaultVisible: true, defaultOrder: 4, align: 'right', isCalculated: true },
  { key: 'annualInterest', label: '每年利息', dataKey: '每年利息', defaultVisible: true, defaultOrder: 5, align: 'right', isCalculated: true }
]

// 資產變化記錄欄位定義
export const assetHistoryColumns = [
  { key: 'recordTime', label: '記錄時間', dataKey: '記錄時間', defaultVisible: true, defaultOrder: 1, align: 'center' },
  { key: 'usdRate', label: '美元匯率', dataKey: '美元匯率', defaultVisible: true, defaultOrder: 2, align: 'right' },
  { key: 'totalPosition', label: '部位總額', dataKey: '部位總額', defaultVisible: true, defaultOrder: 3, align: 'right' },
  { key: 'totalDebt', label: '負債總額', dataKey: '負債總額', defaultVisible: true, defaultOrder: 4, align: 'right' },
  { key: 'normalizedPosition', label: '還原匯率30部位總額', dataKey: '還原匯率30部位總額', defaultVisible: true, defaultOrder: 5, align: 'right' },
  { key: 'currentPositionWan', label: '當時匯率部位總額(萬)', dataKey: '當時匯率部位總額萬', defaultVisible: true, defaultOrder: 6, align: 'right' },
  { key: 'debtWan', label: '台幣負債總額(萬)', dataKey: '台幣負債總額萬', defaultVisible: true, defaultOrder: 7, align: 'right' },
  { key: 'currentNetWan', label: '當時匯率資產總和(萬)', dataKey: '當時匯率資產總和萬', defaultVisible: true, defaultOrder: 8, align: 'right' },
  { key: 'normalizedPositionWan', label: '還原匯率30部位總額(萬)', dataKey: '還原匯率30部位總額萬', defaultVisible: true, defaultOrder: 9, align: 'right' },
  { key: 'normalizedNetWan', label: '還原匯率30資產總額(萬)', dataKey: '還原匯率30資產總額萬', defaultVisible: true, defaultOrder: 10, align: 'right' }
]

// 模組 UID 與欄位定義的對應
export const moduleColumnDefinitions = {
  'overseas-bonds': overseasBondsColumns,
  'stocks-etf': stocksEtfColumns,
  'other-assets': otherAssetsColumns,
  'loans': loansColumns,
  'asset-history': assetHistoryColumns
}

/**
 * 取得模組的欄位定義
 * @param {string} moduleUid - 模組 UID
 * @returns {Array} 欄位定義陣列
 */
export function getColumnDefinitions(moduleUid) {
  return moduleColumnDefinitions[moduleUid] || []
}

/**
 * 取得模組的預設欄位配置
 * @param {string} moduleUid - 模組 UID
 * @returns {Array} 欄位配置陣列
 */
export function getDefaultColumnConfig(moduleUid) {
  const columns = getColumnDefinitions(moduleUid)
  return columns.map(col => ({
    key: col.key,
    visible: col.defaultVisible,
    order: col.defaultOrder
  }))
}

/**
 * 根據用戶配置和定義，取得排序後的可見欄位
 * @param {string} moduleUid - 模組 UID
 * @param {Array} userConfig - 用戶的欄位配置
 * @returns {Array} 排序後的欄位定義（僅可見的）
 */
export function getVisibleColumns(moduleUid, userConfig) {
  const definitions = getColumnDefinitions(moduleUid)

  if (!userConfig || userConfig.length === 0) {
    // 沒有用戶配置，使用預設
    return definitions
      .filter(col => col.defaultVisible)
      .sort((a, b) => a.defaultOrder - b.defaultOrder)
  }

  // 建立配置對照表
  const configMap = {}
  userConfig.forEach(c => {
    configMap[c.key] = c
  })

  // 合併定義和配置
  return definitions
    .map(col => ({
      ...col,
      visible: configMap[col.key]?.visible ?? col.defaultVisible,
      order: configMap[col.key]?.order ?? col.defaultOrder
    }))
    .filter(col => col.visible)
    .sort((a, b) => a.order - b.order)
}

/**
 * 取得完整的欄位列表（用於編輯器）
 * @param {string} moduleUid - 模組 UID
 * @param {Array} userConfig - 用戶的欄位配置
 * @returns {Array} 所有欄位（包含可見性和順序）
 */
export function getAllColumnsWithConfig(moduleUid, userConfig) {
  const definitions = getColumnDefinitions(moduleUid)

  if (!userConfig || userConfig.length === 0) {
    return definitions.map(col => ({
      ...col,
      visible: col.defaultVisible,
      order: col.defaultOrder
    }))
  }

  // 建立配置對照表
  const configMap = {}
  userConfig.forEach(c => {
    configMap[c.key] = c
  })

  // 合併定義和配置
  return definitions
    .map(col => ({
      ...col,
      visible: configMap[col.key]?.visible ?? col.defaultVisible,
      order: configMap[col.key]?.order ?? col.defaultOrder
    }))
    .sort((a, b) => a.order - b.order)
}
