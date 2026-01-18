<script setup>
import { defineProps, computed } from 'vue'
import { formatNumber } from '../utils/format'

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

// 欄位定義
const columnDefinitions = {
  recordTime: { label: '記錄時間', defaultOrder: 1 },
  usdRate: { label: '美元匯率', defaultOrder: 2 },
  totalPosition: { label: '部位總額', defaultOrder: 3 },
  totalDebt: { label: '負債總額', defaultOrder: 4 },
  normalizedPosition: { label: '還原匯率30部位總額', defaultOrder: 5 },
  currentPositionWan: { label: '當時匯率部位總額(萬)', defaultOrder: 6 },
  debtWan: { label: '台幣負債總額(萬)', defaultOrder: 7 },
  currentNetWan: { label: '當時匯率資產總和(萬)', defaultOrder: 8 },
  normalizedPositionWan: { label: '還原匯率30部位總額(萬)', defaultOrder: 9 },
  normalizedNetWan: { label: '還原匯率30資產總額(萬)', defaultOrder: 10 }
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

// 取得儲存格樣式
const getCellClass = (key, record) => {
  const classes = []
  const alignRightCols = ['totalPosition', 'totalDebt', 'normalizedPosition',
                          'currentPositionWan', 'debtWan', 'currentNetWan',
                          'normalizedPositionWan', 'normalizedNetWan']
  if (alignRightCols.includes(key)) classes.push('text-right')

  // 資產總和顏色
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

// 取得儲存格值
const getCellValue = (key, record) => {
  switch (key) {
    case 'recordTime': return record.記錄時間
    case 'usdRate': return record.美元匯率
    case 'totalPosition': return formatNumber(record.部位總額)
    case 'totalDebt': return formatNumber(record.負債總額)
    case 'normalizedPosition': return formatNumber(record.還原匯率30部位總額)
    case 'currentPositionWan': return record.當時匯率部位總額萬
    case 'debtWan': return record.台幣負債總額萬
    case 'currentNetWan': return record.當時匯率資產總和萬
    case 'normalizedPositionWan': return record.還原匯率30部位總額萬
    case 'normalizedNetWan': return record.還原匯率30資產總額萬
    default: return ''
  }
}

// 表頭需要換行顯示
const getHeaderLabel = (col) => {
  const breakLabels = {
    normalizedPosition: '還原匯率30<br/>部位總額',
    currentPositionWan: '當時匯率<br/>部位總額(萬)',
    debtWan: '台幣<br/>負債總額(萬)',
    currentNetWan: '當時匯率<br/>資產總和(萬)',
    normalizedPositionWan: '還原匯率30<br/>部位總額(萬)',
    normalizedNetWan: '還原匯率30<br/>資產總額(萬)'
  }
  return breakLabels[col.key] || col.label
}
</script>

<template>
  <table v-if="records && records.length > 0">
    <thead>
      <tr class="section-header">
        <th :colspan="sortedVisibleColumns.length">資產變化記錄</th>
      </tr>
      <tr>
        <th v-for="col in sortedVisibleColumns" :key="col.key" v-html="getHeaderLabel(col)"></th>
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
