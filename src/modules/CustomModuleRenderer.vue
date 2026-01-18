<script setup>
/**
 * 自訂模組渲染器
 * 根據 ModuleSpec 動態渲染自訂模組
 * 只支援白名單中的元件類型，確保安全性
 */
import { computed } from 'vue'
import { formatNumber, formatPercent, formatWan } from '../utils/format'
import { Pie, Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement
} from 'chart.js'

// 註冊 Chart.js 元件
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement
)

// 圖表預設顏色
const chartColors = [
  '#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0',
  '#00BCD4', '#FFEB3B', '#795548', '#607D8B', '#F44336'
]

const props = defineProps({
  spec: {
    type: Object,
    required: true
  },
  data: {
    type: Object,
    default: () => ({})
  },
  config: {
    type: Object,
    default: () => ({})
  }
})

// 解析資料綁定
const boundData = computed(() => {
  const result = {}
  const bindings = props.spec.dataBindings || []

  for (const binding of bindings) {
    const source = getDataSource(binding.source)
    if (binding.filter) {
      result[binding.key] = applyFilter(source, binding.filter)
    } else {
      result[binding.key] = source
    }
  }

  return result
})

// 計算欄位（按順序計算，後面的可以引用前面的結果）
const computedFields = computed(() => {
  const result = {}
  const fields = props.spec.computedFields || []

  for (const field of fields) {
    try {
      // 傳入已計算的結果，讓後續公式可以引用
      result[field.key] = evaluateFormula(field.formula, boundData.value, result)
    } catch (e) {
      console.warn(`計算欄位 ${field.key} 失敗:`, e)
      result[field.key] = 0
    }
  }

  return result
})

// 取得資料來源
function getDataSource(sourceName) {
  const sourceMap = {
    '股票': props.data.calculatedBonds || [],
    '海外債券': props.data.calculatedBonds || [],
    'ETF': props.data.calculatedEtfs || [],
    '其它資產': props.data.calculatedOtherAssets || [],
    '貸款': props.data.calculatedLoans || [],
    '匯率': props.data.exchangeRate || {},
    '資產變化記錄': props.data.assetHistoryRecords || []
  }
  return sourceMap[sourceName] || []
}

// 套用篩選條件
function applyFilter(data, filter) {
  if (!Array.isArray(data) || !filter) return data
  // 簡單的篩選邏輯
  return data.filter(item => {
    // filter 格式: "field:operator:value"
    const [field, op, value] = filter.split(':')
    const itemValue = item[field]
    switch (op) {
      case 'eq': return itemValue === value
      case 'gt': return itemValue > parseFloat(value)
      case 'lt': return itemValue < parseFloat(value)
      case 'contains': return String(itemValue).includes(value)
      default: return true
    }
  })
}

// 評估公式（安全的受限函數）
function evaluateFormula(formula, data, existingComputed = {}) {
  // 檢查是否是 JSON 陣列（用於 assetDistribution 等）
  if (formula.startsWith('[') && formula.includes('{')) {
    try {
      // 替換公式中的變數引用
      let processedFormula = formula
      for (const [key, value] of Object.entries(existingComputed)) {
        // 替換變數名（確保是完整的變數名，而不是部分匹配）
        const regex = new RegExp(`\\b${key}\\b`, 'g')
        processedFormula = processedFormula.replace(regex, JSON.stringify(value))
      }
      return JSON.parse(processedFormula)
    } catch (e) {
      console.warn('解析 JSON 公式失敗:', e, formula)
      return []
    }
  }

  // sum(array.field1 * array.field2) - 乘法累加
  // 使用非貪婪匹配，但欄位名不能包含空格
  const sumMultiplyMatch = formula.match(/^sum\((\w+)\.([^\s*]+)\s*\*\s*\1\.([^\s)]+)\)$/)
  if (sumMultiplyMatch) {
    const [, arrayKey, field1, field2] = sumMultiplyMatch
    const arr = data[arrayKey] || []
    return arr.reduce((acc, item) => {
      const v1 = parseFloat(item[field1]) || 0
      const v2 = parseFloat(item[field2]) || 0
      return acc + (v1 * v2)
    }, 0)
  }

  // 只支援簡單的函數
  const sumMatch = formula.match(/^sum\((\w+)\.(.+)\)$/)
  if (sumMatch) {
    const [, arrayKey, field] = sumMatch
    const arr = data[arrayKey] || []
    return arr.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0)
  }

  const avgMatch = formula.match(/^avg\((\w+)\.(.+)\)$/)
  if (avgMatch) {
    const [, arrayKey, field] = avgMatch
    const arr = data[arrayKey] || []
    if (arr.length === 0) return 0
    const sum = arr.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0)
    return sum / arr.length
  }

  const countMatch = formula.match(/^count\((\w+)\)$/)
  if (countMatch) {
    const [, arrayKey] = countMatch
    return (data[arrayKey] || []).length
  }

  const maxMatch = formula.match(/^max\((\w+)\.(.+)\)$/)
  if (maxMatch) {
    const [, arrayKey, field] = maxMatch
    const arr = data[arrayKey] || []
    if (arr.length === 0) return 0
    return Math.max(...arr.map(item => parseFloat(item[field]) || 0))
  }

  const minMatch = formula.match(/^min\((\w+)\.(.+)\)$/)
  if (minMatch) {
    const [, arrayKey, field] = minMatch
    const arr = data[arrayKey] || []
    if (arr.length === 0) return 0
    return Math.min(...arr.map(item => parseFloat(item[field]) || 0))
  }

  // 簡單的除法運算
  const divMatch = formula.match(/^(.+)\s*\/\s*(\d+)$/)
  if (divMatch) {
    const [, expr, divisor] = divMatch
    const value = evaluateFormula(expr.trim(), data, existingComputed)
    return value / parseFloat(divisor)
  }

  return 0
}

// 解析變數值
function resolveValue(template, data, computedFields) {
  if (typeof template !== 'string') return template

  return template.replace(/\$\{(\w+)\}/g, (match, key) => {
    if (computedFields[key] !== undefined) {
      return computedFields[key]
    }
    if (data[key] !== undefined) {
      return data[key]
    }
    return match
  })
}

// 格式化數值
function formatValue(value, format) {
  if (value === null || value === undefined) return '-'
  const num = parseFloat(value)
  if (isNaN(num)) return value

  switch (format) {
    case 'currency':
      return formatWan(num)
    case 'percent':
      return formatPercent(num)
    case 'number':
      return formatNumber(num)
    default:
      return formatNumber(num)
  }
}

// 取得卡片顏色 class
function getColorClass(color) {
  const validColors = ['green', 'blue', 'red', 'orange', 'purple', 'teal', 'pink']
  return validColors.includes(color) ? `card-${color}` : 'card-blue'
}

// 元件渲染邏輯
const components = computed(() => {
  return (props.spec.components || []).map(comp => {
    const resolvedProps = {}

    for (const [key, value] of Object.entries(comp.props || {})) {
      if (typeof value === 'string' && value.startsWith('${')) {
        // 解析變數
        const varName = value.slice(2, -1)
        if (computedFields.value[varName] !== undefined) {
          resolvedProps[key] = computedFields.value[varName]
        } else if (boundData.value[varName] !== undefined) {
          resolvedProps[key] = boundData.value[varName]
        } else {
          resolvedProps[key] = value
        }
      } else {
        resolvedProps[key] = value
      }
    }

    return {
      type: comp.type,
      props: resolvedProps
    }
  })
})

// 取得佈局 class
const layoutClass = computed(() => {
  const style = props.spec.style || {}
  return style.layout || 'grid-2'
})

// ═══════════════════════════════════════════════════════════
// 圖表相關函數
// ═══════════════════════════════════════════════════════════

// 解析圖表資料陣列
function parseChartDataArray(dataSource) {
  // 如果是字串（變數引用），嘗試從 computedFields 或 boundData 取得
  if (typeof dataSource === 'string') {
    // 檢查是否是 JSON 字串
    if (dataSource.startsWith('[')) {
      try {
        return JSON.parse(dataSource)
      } catch (e) {
        console.warn('解析圖表資料失敗:', e)
        return []
      }
    }
    return []
  }
  // 已經是陣列
  if (Array.isArray(dataSource)) {
    return dataSource
  }
  return []
}

// 取得圓餅圖資料
function getPieChartData(chartProps) {
  const dataArray = parseChartDataArray(chartProps.data)
  const labelField = chartProps.labelField || 'name'
  const valueField = chartProps.valueField || 'value'

  const labels = dataArray.map(item => item[labelField] || '未知')
  const values = dataArray.map(item => {
    const val = parseFloat(item[valueField]) || 0
    return Math.abs(val) // 圓餅圖不能有負值
  })

  return {
    labels,
    datasets: [{
      data: values,
      backgroundColor: chartColors.slice(0, labels.length),
      borderColor: '#1e1e2e',
      borderWidth: 2
    }]
  }
}

// 圓餅圖選項
const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#ccc',
        padding: 16,
        font: { size: 12 }
      }
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          const value = context.raw
          const total = context.dataset.data.reduce((a, b) => a + b, 0)
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
          return `${context.label}: ${formatWan(value)} (${percentage}%)`
        }
      }
    }
  }
}

// 取得長條圖資料
function getBarChartData(chartProps) {
  const dataArray = parseChartDataArray(chartProps.data)
  const labelField = chartProps.labelField || 'name'
  const valueField = chartProps.valueField || 'value'

  const labels = dataArray.map(item => item[labelField] || '未知')
  const values = dataArray.map(item => parseFloat(item[valueField]) || 0)

  return {
    labels,
    datasets: [{
      label: chartProps.datasetLabel || '數值',
      data: values,
      backgroundColor: chartProps.color || '#4CAF50',
      borderRadius: 4
    }]
  }
}

// 長條圖選項
const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    x: {
      ticks: { color: '#888' },
      grid: { color: '#3a3a4e' }
    },
    y: {
      ticks: { color: '#888' },
      grid: { color: '#3a3a4e' }
    }
  }
}

// 取得折線圖資料
function getLineChartData(chartProps) {
  const dataArray = parseChartDataArray(chartProps.data)
  const labelField = chartProps.labelField || 'name'
  const valueField = chartProps.valueField || 'value'

  const labels = dataArray.map(item => item[labelField] || '未知')
  const values = dataArray.map(item => parseFloat(item[valueField]) || 0)

  return {
    labels,
    datasets: [{
      label: chartProps.datasetLabel || '數值',
      data: values,
      borderColor: chartProps.color || '#2196F3',
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      fill: true,
      tension: 0.4
    }]
  }
}

// 折線圖選項
const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    x: {
      ticks: { color: '#888' },
      grid: { color: '#3a3a4e' }
    },
    y: {
      ticks: { color: '#888' },
      grid: { color: '#3a3a4e' }
    }
  }
}
</script>

<template>
  <div class="custom-module" :class="layoutClass">
    <template v-for="(comp, idx) in components" :key="idx">
      <!-- 摘要卡片 -->
      <div
        v-if="comp.type === 'summary-card'"
        class="summary-card"
        :class="getColorClass(comp.props.color)"
      >
        <div class="card-label">{{ comp.props.label }}</div>
        <div class="card-value">
          {{ formatValue(comp.props.value, comp.props.format) }}
        </div>
      </div>

      <!-- 統計數字 -->
      <div v-else-if="comp.type === 'stat'" class="stat-item">
        <div class="stat-value">
          {{ formatValue(comp.props.value, comp.props.format) }}
          <span v-if="comp.props.suffix" class="stat-suffix">{{ comp.props.suffix }}</span>
        </div>
        <div class="stat-label">{{ comp.props.label }}</div>
        <div v-if="comp.props.trend" class="stat-trend" :class="comp.props.trend">
          {{ comp.props.trend === 'up' ? '↑' : comp.props.trend === 'down' ? '↓' : '→' }}
        </div>
      </div>

      <!-- 表格 -->
      <div v-else-if="comp.type === 'table'" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="col in comp.props.columns" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIdx) in (comp.props.data || []).slice(0, comp.props.limit || 10)"
              :key="rowIdx"
            >
              <td v-for="col in comp.props.columns" :key="col">
                {{ row[col] ?? '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 列表 -->
      <div v-else-if="comp.type === 'list'" class="list-wrapper">
        <div
          v-for="(item, itemIdx) in (comp.props.data || []).slice(0, comp.props.limit || 5)"
          :key="itemIdx"
          class="list-item"
        >
          <div class="list-content">
            <div class="list-title">{{ item[comp.props.titleField] }}</div>
            <div v-if="comp.props.subtitleField" class="list-subtitle">
              {{ item[comp.props.subtitleField] }}
            </div>
          </div>
          <div v-if="comp.props.valueField" class="list-value">
            {{ formatValue(item[comp.props.valueField], 'currency') }}
          </div>
        </div>
      </div>

      <!-- 圓餅圖 -->
      <div v-else-if="comp.type === 'chart-pie'" class="chart-container">
        <div v-if="comp.props.title" class="chart-title">{{ comp.props.title }}</div>
        <div class="chart-wrapper">
          <Pie
            v-if="getPieChartData(comp.props).labels.length > 0"
            :data="getPieChartData(comp.props)"
            :options="pieChartOptions"
          />
          <div v-else class="chart-empty">
            <span>📊</span>
            <p>暫無資料</p>
          </div>
        </div>
      </div>

      <!-- 長條圖 -->
      <div v-else-if="comp.type === 'chart-bar'" class="chart-container">
        <div v-if="comp.props.title" class="chart-title">{{ comp.props.title }}</div>
        <div class="chart-wrapper">
          <Bar
            v-if="getBarChartData(comp.props).labels.length > 0"
            :data="getBarChartData(comp.props)"
            :options="barChartOptions"
          />
          <div v-else class="chart-empty">
            <span>📈</span>
            <p>暫無資料</p>
          </div>
        </div>
      </div>

      <!-- 折線圖 -->
      <div v-else-if="comp.type === 'chart-line'" class="chart-container">
        <div v-if="comp.props.title" class="chart-title">{{ comp.props.title }}</div>
        <div class="chart-wrapper">
          <Line
            v-if="getLineChartData(comp.props).labels.length > 0"
            :data="getLineChartData(comp.props)"
            :options="lineChartOptions"
          />
          <div v-else class="chart-empty">
            <span>📉</span>
            <p>暫無資料</p>
          </div>
        </div>
      </div>

      <!-- 未知元件 -->
      <div v-else class="unknown-component">
        未知元件類型: {{ comp.type }}
      </div>
    </template>

    <!-- 空狀態 -->
    <div v-if="components.length === 0" class="empty-module">
      <span>尚未定義元件</span>
    </div>
  </div>
</template>

<style scoped>
.custom-module {
  display: grid;
  gap: 16px;
}

.custom-module.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.custom-module.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

.custom-module.stack {
  grid-template-columns: 1fr;
}

/* 摘要卡片 */
.summary-card {
  padding: 16px 20px;
  border-radius: 12px;
  transition: transform 0.2s;
}

.summary-card:hover {
  transform: translateY(-2px);
}

.card-label {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  opacity: 0.9;
}

.card-value {
  font-size: 24px;
  font-weight: 700;
}

.card-green {
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
  color: white;
}

.card-blue {
  background: linear-gradient(135deg, #2980b9 0%, #3498db 100%);
  color: white;
}

.card-orange {
  background: linear-gradient(135deg, #e67e22 0%, #f39c12 100%);
  color: white;
}

.card-red {
  background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
  color: white;
}

.card-purple {
  background: linear-gradient(135deg, #6a1b9a 0%, #9c27b0 100%);
  color: white;
}

.card-teal {
  background: linear-gradient(135deg, #00796b 0%, #26a69a 100%);
  color: white;
}

.card-pink {
  background: linear-gradient(135deg, #ad1457 0%, #e91e63 100%);
  color: white;
}

/* 統計數字 */
.stat-item {
  background: #2a2a3e;
  padding: 16px;
  border-radius: 10px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}

.stat-suffix {
  font-size: 14px;
  font-weight: 400;
  color: #888;
  margin-left: 4px;
}

.stat-label {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

.stat-trend {
  font-size: 16px;
  margin-top: 8px;
}

.stat-trend.up {
  color: #2ecc71;
}

.stat-trend.down {
  color: #e74c3c;
}

.stat-trend.neutral {
  color: #888;
}

/* 表格 */
.table-wrapper {
  grid-column: 1 / -1;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #3a3a4e;
}

.data-table th {
  background: #2a2a3e;
  color: #888;
  font-weight: 500;
}

.data-table td {
  color: #fff;
}

.data-table tr:hover td {
  background: rgba(255, 255, 255, 0.05);
}

/* 列表 */
.list-wrapper {
  grid-column: 1 / -1;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2a2a3e;
  border-radius: 8px;
  margin-bottom: 8px;
}

.list-item:last-child {
  margin-bottom: 0;
}

.list-title {
  font-size: 14px;
  color: #fff;
  font-weight: 500;
}

.list-subtitle {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}

.list-value {
  font-size: 14px;
  color: #4CAF50;
  font-weight: 600;
}

/* 圖表容器 */
.chart-container {
  grid-column: 1 / -1;
  background: #2a2a3e;
  border-radius: 12px;
  padding: 20px;
}

.chart-title {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  margin-bottom: 16px;
  text-align: center;
}

.chart-wrapper {
  height: 280px;
  position: relative;
}

.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.chart-empty span {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.chart-empty p {
  margin: 0;
  font-size: 14px;
}

/* 未知元件 */
.unknown-component {
  background: rgba(231, 76, 60, 0.2);
  border: 1px dashed #e74c3c;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  color: #e74c3c;
  font-size: 13px;
}

/* 空狀態 */
.empty-module {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: #666;
  font-size: 14px;
}

/* 響應式 */
@media (max-width: 600px) {
  .custom-module.grid-2,
  .custom-module.grid-3 {
    grid-template-columns: 1fr;
  }

  .card-value {
    font-size: 20px;
  }

  .stat-value {
    font-size: 24px;
  }
}
</style>
