<script setup>
import { defineProps, computed } from 'vue'

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  },
  columnConfig: {
    type: Array,
    default: () => []
  }
})

// 欄位定義（移除原始整數欄位，只保留萬元欄位，更精簡）
const columnDefinitions = {
  recordTime: { label: '記錄時間', defaultOrder: 1 },
  usdRate: { label: '美元匯率', defaultOrder: 2 },
  currentPositionWan: { label: '部位總額(萬)', defaultOrder: 3 },
  debtWan: { label: '負債總額(萬)', defaultOrder: 4 },
  currentNetWan: { label: '資產淨值(萬)', defaultOrder: 5 },
  normalizedPositionWan: { label: '匯率30部位(萬)', defaultOrder: 6 },
  normalizedNetWan: { label: '匯率30淨值(萬)', defaultOrder: 7 }
}

const allColumnKeys = Object.keys(columnDefinitions)

// 排序後的可見欄位
const sortedVisibleColumns = computed(() => {
  if (!props.columnConfig || props.columnConfig.length === 0) {
    return allColumnKeys.map(key => ({
      key,
      label: columnDefinitions[key].label,
      order: columnDefinitions[key].defaultOrder
    })).sort((a, b) => a.order - b.order)
  }

  const configMap = {}
  props.columnConfig.forEach(col => {
    configMap[col.key] = col
  })

  return allColumnKeys
    .filter(key => {
      const config = configMap[key]
      return config ? config.visible !== false : true
    })
    .map(key => ({
      key,
      label: columnDefinitions[key].label,
      order: configMap[key]?.order ?? columnDefinitions[key].defaultOrder
    }))
    .sort((a, b) => a.order - b.order)
})

const numericCols = ['currentPositionWan', 'debtWan', 'currentNetWan', 'normalizedPositionWan', 'normalizedNetWan']

// 取得儲存格樣式
const getCellClass = (key, record) => {
  const classes = []
  if (numericCols.includes(key)) classes.push('col-num')
  if (key === 'usdRate') classes.push('col-num')

  // 資產淨值顏色
  if (key === 'currentNetWan') {
    const val = parseFloat(record.當時匯率資產總和萬)
    if (val > 0) classes.push('positive')
    if (val < 0) classes.push('negative')
  }
  if (key === 'normalizedNetWan') {
    const val = parseFloat(record.還原匯率30資產總額萬)
    if (val > 0) classes.push('positive')
    if (val < 0) classes.push('negative')
  }

  return classes.join(' ')
}

// 取得表頭樣式
const getHeaderClass = (key) => {
  if (numericCols.includes(key) || key === 'usdRate') return 'col-num'
  return ''
}

// 取得儲存格值
const getCellValue = (key, record) => {
  switch (key) {
    case 'recordTime': return record.記錄時間
    case 'usdRate': return record.美元匯率
    case 'currentPositionWan': return formatWan(record.當時匯率部位總額萬)
    case 'debtWan': return formatWan(record.台幣負債總額萬)
    case 'currentNetWan': return formatWan(record.當時匯率資產總和萬)
    case 'normalizedPositionWan': return formatWan(record.還原匯率30部位總額萬)
    case 'normalizedNetWan': return formatWan(record.還原匯率30資產總額萬)
    default: return ''
  }
}

// 萬元數字加千分位
function formatWan(val) {
  if (val == null) return '--'
  const n = parseInt(val)
  if (isNaN(n)) return val
  return n.toLocaleString()
}
</script>

<template>
  <table v-if="records && records.length > 0" class="history-table">
    <thead>
      <tr class="section-header">
        <th :colspan="sortedVisibleColumns.length">資產變化記錄</th>
      </tr>
      <tr>
        <th v-for="col in sortedVisibleColumns" :key="col.key" :class="getHeaderClass(col.key)">
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(record, index) in records" :key="index">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getCellClass(col.key, record)">
          {{ getCellValue(col.key, record) }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.history-table {
  width: auto !important;
}

.col-num {
  text-align: right !important;
}
</style>
