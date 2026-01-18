export function formatNumber(num) {
  if (num === null || num === undefined) return '-'
  if (typeof num === 'string') return num // 錯誤訊息直接顯示
  if (typeof num !== 'number' || isNaN(num)) return '-'
  return Math.round(num).toLocaleString('zh-TW')
}

export function formatDecimal(num, decimals = 3) {
  if (num === null || num === undefined) return '-'
  if (typeof num === 'string') return num // 錯誤訊息直接顯示
  if (typeof num !== 'number' || isNaN(num)) return '-'
  return num.toFixed(decimals)
}

export function formatPercent(num) {
  if (num === null || num === undefined) return '-'
  if (typeof num === 'string') return num // 錯誤訊息直接顯示
  if (typeof num !== 'number' || isNaN(num)) return '-'
  return num.toFixed(2) + '%'
}

export function getColorClass(value) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return ''
}

// 格式化為萬元單位 (x,xxx萬)，10萬以下顯示完整數字
export function formatWan(num) {
  if (num === null || num === undefined) return '-'
  if (typeof num === 'string') return num
  if (typeof num !== 'number' || isNaN(num)) return '-'

  // 10萬以下顯示完整數字
  if (Math.abs(num) < 100000) {
    return Math.round(num).toLocaleString('zh-TW')
  }

  const wan = Math.round(num / 10000)
  return wan.toLocaleString('zh-TW') + '萬'
}
