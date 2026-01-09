export function formatNumber(num) {
  if (num === null || num === undefined) return '-'
  return Math.round(num).toLocaleString('zh-TW')
}

export function formatDecimal(num, decimals = 3) {
  if (num === null || num === undefined) return '-'
  return num.toFixed(decimals)
}

export function formatPercent(num) {
  if (num === null || num === undefined) return '-'
  return num.toFixed(2) + '%'
}

export function getColorClass(value) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return ''
}
