<template>
  <table>
    <thead>
      <tr class="section-header">
        <th :colspan="sortedVisibleColumns.length">
          <div class="section-header-layout">
            <span class="section-title">債券</span>
            <button class="add-btn" title="新增債券" @click.stop="emit('add')">＋</button>
          </div>
        </th>
      </tr>
      <tr>
        <th v-for="col in sortedVisibleColumns" :key="col.key" :class="getHeaderClass(col.key)">
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(stock, index) in stocks" :key="index" class="clickable-row" :class="{ 'highlighted-row': stock.代號 === highlightSymbol }" @click="emit('select', stock)">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getCellClass(col.key, stock)">
          <!-- 公司名稱（含代號） -->
          <template v-if="col.key === 'companyName'">
            {{ stock.公司名稱 }}
            <div class="symbol-sub">{{ stock.代號 }}</div>
          </template>
          <!-- 買入價格 -->
          <template v-else-if="col.key === 'buyPrice'">{{ formatDecimal(stock.買入價格) }}</template>
          <!-- 最新價格 -->
          <template v-else-if="col.key === 'latestPrice'">
            {{ formatDecimal(stock.最新價格) }}
            <span v-if="getPriceStatus(stock.代號).loading" class="spinner"></span>
          </template>
          <!-- 損益(%) -->
          <template v-else-if="col.key === 'profitPercent'">{{ formatPercent(stock.損益百分比) }}</template>
          <!-- 台幣市值 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(Math.round(stock.台幣資產 / 10000)) }}<span class="unit-suffix">萬</span></template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(stock.台幣資產)) }}</template>
          <!-- 票面利率 -->
          <template v-else-if="col.key === 'couponRate'">{{ formatDecimal(stock.票面利率) }}</template>
          <!-- 配息日（上下排列） -->
          <template v-else-if="col.key === 'paymentDate'">
            <div class="stacked-cell" v-if="stock.配息日">
              <div v-for="(d, i) in stock.配息日.split(/[,，]\s*/)" :key="i">{{ d }}</div>
            </div>
            <template v-else>--</template>
          </template>
          <!-- 剩餘天配息 -->
          <template v-else-if="col.key === 'daysToPayment'">{{ stock.剩餘天配息 }}</template>
          <!-- 下次配息 -->
          <template v-else-if="col.key === 'nextPayment'">{{ formatNumber(stock.下次配息) }}</template>
          <!-- 買入/到期（合併上下排） -->
          <template v-else-if="col.key === 'dateRange'">
            <div class="stacked-cell">
              <div>{{ stock.交易日 || '--' }}</div>
              <div class="sub-line">{{ stock.到期日 || '--' }}</div>
            </div>
          </template>
          <!-- 剩餘年數 -->
          <template v-else-if="col.key === 'yearsToMaturity'">{{ getRemainingYears(stock.到期日) }}</template>
          <!-- 累計息 + 已配次 -->
          <template v-else-if="col.key === 'cumulativeDividend'">
            <div class="stacked-cell">
              <div>{{ getDividendInfo(stock.代號)?.累計配息 != null ? formatNumber(Math.round(getDividendInfo(stock.代號).累計配息 / 10000)) : '--' }}<span v-if="getDividendInfo(stock.代號)?.累計配息 != null" class="unit-suffix">萬</span></div>
              <div class="sub-line">{{ getDividendInfo(stock.代號)?.配息次數 != null ? getDividendInfo(stock.代號).配息次數 + '次' : '' }}</div>
            </div>
          </template>
          <!-- 新聞 -->
          <template v-else-if="col.key === 'news'">
            <div class="news-cell">
              <span v-if="isNewsLoading(stock.代號)" class="spinner news-spinner"></span>
              <button
                v-else-if="hasNews(stock.代號)"
                class="news-btn"
                :class="{
                  'has-negative': hasNegativeNews(stock.代號) && !isNewsRead(stock.代號),
                  'is-read': isNewsRead(stock.代號)
                }"
                @click.stop="emit('open-news', stock.代號, stock.公司名稱)"
              >
                <span v-if="hasNegativeNews(stock.代號) && !isNewsRead(stock.代號)">!</span>
                <span v-else>i</span>
                <!-- 已讀後不顯示數字 badge -->
                <span v-if="!isNewsRead(stock.代號)" class="news-badge">{{ getNewsCount(stock.代號) }}</span>
              </button>
            </div>
          </template>
        </td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="sub-total">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getFooterCellClass(col.key)">
          <!-- 小計標籤（第一欄） -->
          <template v-if="col === sortedVisibleColumns[0]">小計</template>
          <!-- 台幣市值 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(Math.round(subtotal.台幣資產 / 10000)) }}<span class="unit-suffix">萬</span></template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(subtotal.台幣資產)) }}</template>
          <!-- 累計配息小計 -->
          <template v-else-if="col.key === 'cumulativeDividend'">{{ totalCumulativeDividend > 0 ? formatNumber(Math.round(totalCumulativeDividend / 10000)) : '' }}<span v-if="totalCumulativeDividend > 0" class="unit-suffix">萬</span></template>
          <!-- 其他欄位留空 -->
          <template v-else></template>
        </td>
      </tr>
    </tfoot>
  </table>

  <div class="maintain-rate-section">
    <span class="maintain-rate-box highlight-green clickable" @click.stop="showModal = true">
      整戶維持率: <span class="calculated">{{ subtotal.整戶維持率百分比 }}%</span>
    </span>
    <span class="maintain-rate-box highlight-yellow">
      預警維持率: {{ subtotal.預警維持率百分比 }}%
    </span>
    <span class="maintain-rate-box highlight-orange">
      追繳維持率: {{ subtotal.追繳維持率百分比 }}%
    </span>
  </div>

  <FormulaModal
    :visible="showModal"
    title="債券整戶維持率"
    formula="整戶維持率 = 已質押資產 ÷ 貸款餘額 × 100%"
    :values="modalValues"
    :result-formula="resultFormula"
    :result="subtotal.整戶維持率百分比 + '%'"
    @close="showModal = false"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import { formatNumber, formatDecimal, formatPercent, getColorClass } from '../utils/format'
import FormulaModal from './FormulaModal.vue'

const props = defineProps({
  stocks: {
    type: Array,
    required: true
  },
  subtotal: {
    type: Object,
    required: true
  },
  loanDetails: {
    type: Object,
    default: () => ({})
  },
  priceStatus: {
    type: Object,
    default: () => ({})
  },
  totalAssets: {
    type: Number,
    default: 0
  },
  newsData: {
    type: Object,
    default: () => ({})
  },
  getNewsCount: {
    type: Function,
    default: () => 0
  },
  isNewsLoading: {
    type: Function,
    default: () => false
  },
  isNewsRead: {
    type: Function,
    default: () => false
  },
  highlightSymbol: {
    type: String,
    default: ''
  },
  // 欄位配置
  columnConfig: {
    type: Array,
    default: () => []
  },
  // 累計配息資料
  dividendData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['open-news', 'add', 'select'])

// 欄位定義（含標籤和預設順序）
const columnDefinitions = {
  companyName: { label: '名稱', defaultOrder: 1 },
  buyPrice: { label: '買價', defaultOrder: 2 },
  latestPrice: { label: '現價', defaultOrder: 3 },
  profitPercent: { label: '損益%', defaultOrder: 4 },
  twdAsset: { label: '市值', defaultOrder: 5 },
  ratio: { label: '佔比', defaultOrder: 6 },
  couponRate: { label: '票息', defaultOrder: 7 },
  paymentDate: { label: '配息日', defaultOrder: 8 },
  daysToPayment: { label: '距配息', defaultOrder: 9 },
  nextPayment: { label: '下次息', defaultOrder: 10 },
  dateRange: { label: '起/迄', defaultOrder: 11 },
  yearsToMaturity: { label: '距到期', defaultOrder: 12 },
  cumulativeDividend: { label: '累計息', defaultOrder: 13 },
  news: { label: '新聞', defaultOrder: 14 }
}

const allColumnKeys = Object.keys(columnDefinitions)

// 排序後的可見欄位
const sortedVisibleColumns = computed(() => {
  // 支援兩種格式：
  // 1. Array 格式（舊）: [{ key, order, visible }]
  // 2. Object 格式（新）: { order: [...], hidden: [...] }

  if (!props.columnConfig ||
      (Array.isArray(props.columnConfig) && props.columnConfig.length === 0) ||
      (typeof props.columnConfig === 'object' && !Array.isArray(props.columnConfig) && !props.columnConfig.order)) {
    // 沒有配置，使用預設順序，全部顯示
    return allColumnKeys.map(key => ({
      key,
      label: columnDefinitions[key].label,
      order: columnDefinitions[key].defaultOrder
    })).sort((a, b) => a.order - b.order)
  }

  // 新格式：{ order: [], hidden: [] }
  if (typeof props.columnConfig === 'object' && !Array.isArray(props.columnConfig)) {
    const { order = [], hidden = [] } = props.columnConfig
    const hiddenSet = new Set(hidden)

    // 如果有指定順序，按指定順序排列
    if (order.length > 0) {
      return order
        .filter(key => !hiddenSet.has(key) && columnDefinitions[key])
        .map((key, index) => ({
          key,
          label: columnDefinitions[key].label,
          order: index + 1
        }))
    }

    // 沒有指定順序，只過濾隱藏欄位
    return allColumnKeys
      .filter(key => !hiddenSet.has(key))
      .map(key => ({
        key,
        label: columnDefinitions[key].label,
        order: columnDefinitions[key].defaultOrder
      }))
      .sort((a, b) => a.order - b.order)
  }

  // 舊格式：Array
  const configMap = {}
  props.columnConfig.forEach(col => {
    configMap[col.key] = col
  })

  // 根據配置過濾並排序
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

// 取得表頭樣式
const getHeaderClass = (key) => {
  const alignRight = ['buyPrice', 'latestPrice', 'profitPercent', 'twdAsset', 'ratio',
                      'couponRate', 'daysToPayment', 'nextPayment', 'yearsToMaturity',
                      'cumulativeDividend']
  if (alignRight.includes(key)) return 'text-right'
  if (['paymentDate', 'dateRange', 'news'].includes(key)) return 'text-center'
  return ''
}

// 取得儲存格樣式
const getCellClass = (key, stock) => {
  const classes = []

  // 對齊
  if (key === 'companyName') classes.push('text-left')
  const rightAlignCols = ['buyPrice', 'latestPrice', 'profitPercent', 'twdAsset', 'ratio',
                           'couponRate', 'daysToPayment', 'nextPayment',
                           'yearsToMaturity', 'cumulativeDividend']
  if (rightAlignCols.includes(key)) classes.push('text-right')
  if (key === 'buyPrice') classes.push('cost-price')

  // 計算值
  const calculatedCols = ['latestPrice', 'profitPercent', 'twdAsset', 'ratio', 'yield',
                          'daysToPayment', 'nextPayment', 'yearsToMaturity',
                          'cumulativeDividend']
  if (calculatedCols.includes(key)) classes.push('calculated')

  // 價格載入失敗
  if (key === 'latestPrice' && getPriceStatus(stock.代號).failed) classes.push('price-failed')

  // 損益顏色
  if (key === 'profitPercent') {
    const colorClass = getColorClass(stock.損益百分比)
    if (colorClass) classes.push(colorClass)
  }

  return classes.join(' ')
}

// 取得小計行樣式
const getFooterCellClass = (key) => {
  const classes = []
  if (['twdAsset', 'cumulativeDividend'].includes(key)) {
    classes.push('text-right', 'calculated')
  }
  if (key === 'ratio') {
    classes.push('calculated')
  }
  return classes.join(' ')
}

// 計算佔總投資比例
const getPercentage = (value) => {
  if (!props.totalAssets || props.totalAssets === 0) return 0
  return (value / props.totalAssets) * 100
}

// 取得價格狀態
const getPriceStatus = (symbol) => {
  return props.priceStatus[`bond_${symbol}`] || { loading: false, failed: false }
}

// 計算剩餘年數
const getRemainingYears = (maturityDate) => {
  if (!maturityDate) return '--'
  const [year, month, day] = maturityDate.split('/').map(Number)
  const maturity = new Date(year, month - 1, day)
  const today = new Date()
  const diffMs = maturity - today
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25)
  return diffYears > 0 ? diffYears.toFixed(1) : '0.0'
}

// 取得配息資料
const getDividendInfo = (symbol) => {
  return props.dividendData[symbol] || null
}

// 累計配息加總
const totalCumulativeDividend = computed(() => {
  return props.stocks.reduce((sum, stock) => {
    const info = getDividendInfo(stock.代號)
    return sum + (info?.累計配息 || 0)
  }, 0)
})

// 檢查是否有負面新聞
const hasNegativeNews = (symbol) => {
  const data = props.newsData[symbol]
  return data?.hasNegative || false
}

// 檢查是否有新聞
const hasNews = (symbol) => {
  const data = props.newsData[symbol]
  return data?.hasNews || false
}

const showModal = ref(false)

const totalLoan = computed(() => {
  return props.loanDetails.reduce((sum, l) => sum + l.value, 0)
})

const modalValues = computed(() => {
  const values = [
    { name: '已質押資產', value: formatNumber(props.subtotal.已質押資產) }
  ]
  props.loanDetails.forEach(l => {
    values.push({ name: l.name, value: formatNumber(l.value) })
  })
  values.push({ name: '貸款餘額合計', value: formatNumber(totalLoan.value) })
  return values
})

const resultFormula = computed(() => {
  return `${formatNumber(props.subtotal.已質押資產)} ÷ ${formatNumber(totalLoan.value)} × 100%`
})
</script>

<style scoped>
.section-header-layout {
  display: flex;
  align-items: center;
  position: relative;
}

.section-title {
  flex: 1;
  text-align: center;
}

.add-btn {
  position: absolute;
  right: 0;
  font-size: 20px;
  font-weight: 700;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid currentColor;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
}

.add-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  transform: scale(1.1);
}

.clickable-row {
  cursor: pointer;
  transition: background 0.15s;
}

.clickable-row:hover {
  background: rgba(0, 0, 0, 0.04);
}

.symbol-sub {
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.2;
}

.stacked-cell {
  font-size: 12px;
  line-height: 1.3;
}

.stacked-cell .sub-line {
  opacity: 0.55;
}

.unit-suffix {
  font-size: 0.75em;
  color: #9ca3af;
  margin-left: 1px;
}

.clickable {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.news-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 24px;
}

.news-spinner {
  width: 16px;
  height: 16px;
}

.news-btn {
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #6b7280;
  color: white;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.news-btn:hover {
  transform: scale(1.1);
}

.news-btn.has-negative {
  background: #ef4444;
  animation: pulse 1.5s infinite;
}

.news-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #e74c3c;
  color: white;
  font-size: 10px;
  font-weight: bold;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.news-btn:not(.has-negative) .news-badge {
  background: #27ae60;
}

/* 已讀樣式：灰色外框、透明背景 */
.news-btn.is-read {
  background: transparent;
  border: 2px solid #6b7280;
  color: #6b7280;
  animation: none;
}

.news-btn.is-read:hover {
  background: rgba(107, 114, 128, 0.1);
  border-color: #9ca3af;
  color: #9ca3af;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.highlighted-row {
  background: #fff3cd !important;
}

.highlighted-row td {
  background: #fff3cd !important;
}
</style>
