<script setup>
import { defineProps, computed, ref, onMounted, onUnmounted } from 'vue'
import { useResponsive } from '../composables/useResponsive'

const { isMobile } = useResponsive()

const showTooltip = ref(false)
function toggleTooltip() {
  showTooltip.value = !showTooltip.value
}
function closeTooltip() {
  showTooltip.value = false
}
onMounted(() => document.addEventListener('click', closeTooltip))
onUnmounted(() => document.removeEventListener('click', closeTooltip))

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
  recordTime: { label: '日期', defaultOrder: 1 },
  usdRate: { label: '匯率', defaultOrder: 2 },
  currentPositionWan: { label: '資產', defaultOrder: 3 },
  debtWan: { label: '負債', defaultOrder: 4 },
  currentNetWan: { label: '淨值', defaultOrder: 5 },
  normalizedPositionWan: { label: '資產 (匯率30)', defaultOrder: 6 },
  normalizedNetWan: { label: '淨值 (匯率30)', defaultOrder: 7 }
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

// 手機版：日期+匯率合併、資產+負債合併
const mobileColumns = computed(() =>
  sortedVisibleColumns.value.filter(col => col.key !== 'usdRate' && col.key !== 'debtWan')
)

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
  <!-- 桌面版 -->
  <table v-if="records && records.length > 0 && !isMobile" class="history-table">
    <thead>
      <tr class="section-header">
        <th :colspan="sortedVisibleColumns.length">資產變化記錄<span class="unit-note">單位：萬元</span></th>
      </tr>
      <tr>
        <th v-for="col in sortedVisibleColumns" :key="col.key" :class="getHeaderClass(col.key)">
          {{ col.label }}
          <span v-if="col.key === 'normalizedPositionWan'" class="tooltip-trigger" @click.stop="toggleTooltip">?<span v-show="showTooltip" class="tooltip-text">模擬美元匯率固定 30 元時的資產值，排除匯率波動影響，觀察資產是否實質成長</span></span>
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

  <!-- 手機版：日期+匯率合併 -->
  <table v-else-if="records && records.length > 0" class="history-table mobile-history-table">
    <thead>
      <tr class="section-header">
        <th :colspan="mobileColumns.length">資產變化記錄<span class="unit-note">單位：萬元</span></th>
      </tr>
      <tr>
        <th v-for="col in mobileColumns" :key="col.key" :class="getHeaderClass(col.key)">
          <template v-if="col.key === 'recordTime'">
            <div>日期</div><div class="sub-line">匯率</div>
          </template>
          <template v-else-if="col.key === 'currentPositionWan'">
            <div>資產</div><div class="sub-line">負債</div>
          </template>
          <template v-else-if="col.key === 'normalizedPositionWan'">
            <div>資產 <span class="tooltip-trigger" @click.stop="toggleTooltip">?<span v-show="showTooltip" class="tooltip-text">模擬美元匯率固定 30 元，排除匯率波動，觀察資產是否實質成長</span></span></div><div class="sub-line">匯率30</div>
          </template>
          <template v-else-if="col.key === 'normalizedNetWan'">
            <div>淨值</div><div class="sub-line">匯率30</div>
          </template>
          <template v-else>{{ col.label }}</template>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(record, index) in records" :key="index">
        <td v-for="col in mobileColumns" :key="col.key" :class="getCellClass(col.key, record)">
          <template v-if="col.key === 'recordTime'">
            <div>{{ record.記錄時間 }}</div>
            <div class="sub-line">{{ record.美元匯率 }}</div>
          </template>
          <template v-else-if="col.key === 'currentPositionWan'">
            <div>{{ getCellValue('currentPositionWan', record) }}</div>
            <div class="sub-line">{{ getCellValue('debtWan', record) }}</div>
          </template>
          <template v-else>
            {{ getCellValue(col.key, record) }}
          </template>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.history-table {
  width: 100% !important;
  table-layout: fixed;
}

.history-table td,
.history-table th {
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-num {
  text-align: right !important;
}

.unit-note {
  font-size: 0.75em;
  font-weight: 400;
  opacity: 0.7;
  margin-left: 8px;
}

.mobile-history-table {
  width: 100% !important;
}

.sub-line {
  font-size: 0.8em;
  opacity: 0.6;
}

.tooltip-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  font-size: 10px;
  font-weight: 600;
  color: #999;
  border: 1px solid #ccc;
  border-radius: 50%;
  cursor: help;
  position: relative;
  vertical-align: middle;
  margin-left: 2px;
}

.tooltip-trigger .tooltip-text {
  position: absolute;
  bottom: 120%;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: #fff;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  padding: 6px 10px;
  border-radius: 6px;
  white-space: nowrap;
  z-index: 10;
}
</style>
