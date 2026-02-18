/**
 * 手機版卡片欄位配置
 * 定義各類資產在卡片模式下顯示的欄位
 */

// 格式化數字為千分位
export function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) return '--'
  return num.toLocaleString('zh-TW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

// 格式化百分比
export function formatPercent(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return '--'
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(decimals)}%`
}

// 格式化貨幣
export function formatCurrency(num, prefix = 'NT$') {
  if (num === null || num === undefined || isNaN(num)) return '--'
  return `${prefix} ${formatNumber(num)}`
}

/**
 * 海外債券卡片配置
 */
export const bondsCardConfig = {
  type: 'bonds',
  // 主要顯示資訊
  primary: {
    title: (item) => item.公司名稱,
    subtitle: (item) => item.代號
  },
  // 持倉資訊
  position: {
    label: '持有',
    value: (item) => `${formatNumber(item.持有單位)} 單位`,
    subValue: (item) => `@${formatNumber(item.買入價格, 3)}`
  },
  // 價格資訊
  price: {
    label: '最新',
    value: (item) => formatNumber(item.最新價格, 2),
    change: (item) => item.損益百分比
  },
  // 詳細資訊列表
  details: [
    { label: '台幣資產', value: (item) => formatCurrency(item.台幣資產) },
    { label: '票面利率', value: (item) => `${formatNumber(item.票面利率, 3)}%`, extra: (item) => `年息 ${formatCurrency(item.每年利息)}` },
    { label: '到期日', value: (item) => item.到期日, extra: (item) => item.剩餘年數 ? `(${item.剩餘年數}年)` : '' }
  ]
}

/**
 * 台股/ETF 卡片配置
 */
export const twStocksCardConfig = {
  type: 'twStocks',
  primary: {
    title: (item) => item.名稱,
    subtitle: (item) => item.代號,
    tag: '台股'
  },
  position: {
    label: '持有',
    value: (item) => `${formatNumber(item.持有單位)} 股`,
    subValue: (item) => `@${formatNumber(item.買入均價, 2)}`
  },
  price: {
    label: '最新',
    value: (item) => formatNumber(item.最新價格, 2),
    change: (item) => item.損益百分比
  },
  details: [
    { label: '台幣資產', value: (item) => formatCurrency(item.台幣資產) },
    { label: '損益金額', value: (item) => formatCurrency(item.台幣損益), isProfit: true },
    {
      label: '殖利率',
      value: (item) => item.年殖利率 ? `${formatNumber(item.年殖利率, 2)}%` : '--',
      extra: (item) => item.每年利息 ? `年息 ${formatCurrency(item.每年利息)}` : '',
      hide: (item) => !item.每股配息
    },
    {
      label: '下次配息',
      value: (item) => item.下次配息日 || '--',
      extra: (item) => item.剩餘天配息 !== null ? `(${item.剩餘天配息}天)` : '',
      hide: (item) => !item.下次配息日
    }
  ]
}

/**
 * 美股卡片配置
 */
export const usStocksCardConfig = {
  type: 'usStocks',
  primary: {
    title: (item) => item.名稱,
    subtitle: (item) => item.代號,
    tag: '美股'
  },
  position: {
    label: '持有',
    value: (item) => `${formatNumber(item.持有單位)} 股`,
    subValue: (item) => `@${formatNumber(item.買入均價, 2)}`
  },
  price: {
    label: '最新',
    value: (item) => `$${formatNumber(item.最新價格, 2)}`,
    change: (item) => item.損益百分比
  },
  details: [
    { label: '台幣資產', value: (item) => formatCurrency(item.台幣資產) },
    { label: '損益金額', value: (item) => formatCurrency(item.台幣損益), isProfit: true }
  ]
}

/**
 * 加密貨幣卡片配置
 */
export const cryptoCardConfig = {
  type: 'crypto',
  primary: {
    title: (item) => item.名稱,
    subtitle: (item) => item.代號,
    tag: '加密'
  },
  position: {
    label: '持有',
    value: (item) => `${formatNumber(item.持有單位, 4)}`,
    subValue: (item) => `@${formatNumber(item.買入均價, 0)}`
  },
  price: {
    label: '最新',
    value: (item) => formatNumber(item.最新價格, 0),
    change: (item) => item.損益百分比
  },
  details: [
    { label: '台幣資產', value: (item) => formatCurrency(item.台幣資產) },
    { label: '損益金額', value: (item) => formatCurrency(item.台幣損益), isProfit: true }
  ]
}

/**
 * 貸款卡片配置
 */
export const loansCardConfig = {
  type: 'loans',
  primary: {
    title: (item) => item.貸款別,
    subtitle: null
  },
  details: [
    { label: '貸款餘額', value: (item) => formatCurrency(item.貸款餘額) },
    { label: '貸款利率', value: (item) => `${formatNumber(item.貸款利率, 2)}%` },
    { label: '月繳金額', value: (item) => formatCurrency(item.月繳金額) },
    { label: '每年利息', value: (item) => formatCurrency(item.每年利息) }
  ]
}

/**
 * 根據資產類型取得對應配置
 */
export function getCardConfig(type) {
  const configs = {
    bonds: bondsCardConfig,
    twStocks: twStocksCardConfig,
    usStocks: usStocksCardConfig,
    crypto: cryptoCardConfig,
    loans: loansCardConfig
  }
  return configs[type] || null
}
