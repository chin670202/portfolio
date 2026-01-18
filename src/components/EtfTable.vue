<template>
  <table>
    <thead>
      <tr class="section-header">
        <th :colspan="sortedVisibleColumns.length">股票/ETF</th>
      </tr>
      <tr>
        <th v-for="col in sortedVisibleColumns" :key="col.key" :class="getHeaderClass(col.key)">
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(etf, index) in etfs" :key="index" :class="{ 'highlighted-row': etf.代號 === highlightSymbol }">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getCellClass(col.key, etf)">
          <!-- ETF名稱 -->
          <template v-if="col.key === 'name'">{{ etf.名稱 }}</template>
          <!-- 代號 -->
          <template v-else-if="col.key === 'symbol'">{{ etf.代號 }}</template>
          <!-- 買入均價 -->
          <template v-else-if="col.key === 'buyPrice'">{{ formatDecimal(etf.買入均價) }}</template>
          <!-- 持有單位 -->
          <template v-else-if="col.key === 'units'">{{ formatNumber(etf.持有單位) }}</template>
          <!-- 最新價格 -->
          <template v-else-if="col.key === 'latestPrice'">
            {{ formatDecimal(etf.最新價格) }}
            <span v-if="getPriceStatus(etf.代號).loading" class="spinner"></span>
          </template>
          <!-- 損益(%) -->
          <template v-else-if="col.key === 'profitPercent'">{{ formatPercent(etf.損益百分比) }}</template>
          <!-- 台幣資產 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(etf.台幣資產) }}</template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(etf.台幣資產)) }}</template>
          <!-- 每股配息 -->
          <template v-else-if="col.key === 'dividend'">
            {{ formatDecimal(etf.每股配息) }}
            <span v-if="getDividendStatus(etf.代號).loading" class="spinner"></span>
          </template>
          <!-- 年殖利率 -->
          <template v-else-if="col.key === 'yield'">{{ formatPercent(etf.年殖利率) }}</template>
          <!-- 每年利息 -->
          <template v-else-if="col.key === 'annualInterest'">{{ formatNumber(etf.每年利息) }}</template>
          <!-- 下次配息日 -->
          <template v-else-if="col.key === 'nextPaymentDate'">{{ etf.下次配息日 || '--' }}</template>
          <!-- 剩餘天配息 -->
          <template v-else-if="col.key === 'daysToPayment'">{{ etf.剩餘天配息 !== null ? etf.剩餘天配息 : (etf.剩餘天配息備註 || '--') }}</template>
          <!-- 下次配息 -->
          <template v-else-if="col.key === 'nextPayment'">{{ formatNumber(etf.下次配息) }}</template>
          <!-- 最新殖利率 -->
          <template v-else-if="col.key === 'latestYield'">{{ formatPercent(etf.最新殖利率) }}</template>
          <!-- 新聞 -->
          <template v-else-if="col.key === 'news'">
            <div class="news-cell">
              <span v-if="isNewsLoading(etf.代號)" class="spinner news-spinner"></span>
              <button
                v-else-if="hasNews(etf.代號)"
                class="news-btn"
                :class="{
                  'has-negative': hasNegativeNews(etf.代號) && !isNewsRead(etf.代號),
                  'is-read': isNewsRead(etf.代號)
                }"
                @click="$emit('open-news', etf.代號, etf.名稱)"
              >
                <span v-if="hasNegativeNews(etf.代號) && !isNewsRead(etf.代號)">!</span>
                <span v-else>i</span>
                <span v-if="!isNewsRead(etf.代號)" class="news-badge">{{ getNewsCount(etf.代號) }}</span>
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
          <!-- 台幣資產 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(subtotal.台幣資產) }}</template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(subtotal.台幣資產)) }}</template>
          <!-- 每年利息 -->
          <template v-else-if="col.key === 'annualInterest'">{{ formatNumber(subtotal.每年利息) }}</template>
          <!-- 其他欄位留空 -->
          <template v-else></template>
        </td>
      </tr>
    </tfoot>
  </table>

  <div class="maintain-rate-section">
    <span class="maintain-rate-box highlight-green clickable" @click="showModal = true">
      整戶維持率: <span class="calculated">{{ subtotal.整戶維持率百分比 }}%</span>
    </span>
    <span class="maintain-rate-box highlight-orange">
      追繳維持率: {{ subtotal.追繳維持率百分比 }}%
    </span>
  </div>

  <FormulaModal
    :visible="showModal"
    title="股票/ETF 整戶維持率"
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
  etfs: {
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
  columnConfig: {
    type: Array,
    default: () => []
  }
})

defineEmits(['open-news'])

// 欄位定義
const columnDefinitions = {
  name: { label: 'ETF名稱', defaultOrder: 1 },
  symbol: { label: '代號', defaultOrder: 2 },
  buyPrice: { label: '買入均價', defaultOrder: 3 },
  units: { label: '持有單位', defaultOrder: 4 },
  latestPrice: { label: '最新價格', defaultOrder: 5 },
  profitPercent: { label: '損益(%)', defaultOrder: 6 },
  twdAsset: { label: '台幣資產', defaultOrder: 7 },
  ratio: { label: '佔比', defaultOrder: 8 },
  dividend: { label: '每股配息', defaultOrder: 9 },
  yield: { label: '年殖利率', defaultOrder: 10 },
  annualInterest: { label: '每年利息', defaultOrder: 11 },
  nextPaymentDate: { label: '下次配息日', defaultOrder: 12 },
  daysToPayment: { label: '剩餘天配息', defaultOrder: 13 },
  nextPayment: { label: '下次配息', defaultOrder: 14 },
  latestYield: { label: '最新殖利率', defaultOrder: 15 },
  news: { label: '新聞', defaultOrder: 16 }
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

// 取得表頭樣式
const getHeaderClass = (key) => {
  if (key === 'news' || key === 'nextPaymentDate') return 'text-center'
  if (key === 'name') return ''
  return ''
}

// 取得儲存格樣式
const getCellClass = (key, etf) => {
  const classes = []
  if (key === 'name') classes.push('text-left')
  if (key === 'buyPrice') classes.push('cost-price')
  if (['twdAsset', 'annualInterest', 'nextPayment'].includes(key)) classes.push('text-right')

  const calculatedCols = ['latestPrice', 'profitPercent', 'twdAsset', 'ratio', 'dividend', 'yield',
                          'annualInterest', 'nextPaymentDate', 'daysToPayment', 'nextPayment', 'latestYield']
  if (calculatedCols.includes(key)) classes.push('calculated')

  if (key === 'latestPrice' && getPriceStatus(etf.代號).failed) classes.push('price-failed')
  if (key === 'dividend' && getDividendStatus(etf.代號).failed) classes.push('price-failed')
  if (key === 'profitPercent') {
    const colorClass = getColorClass(etf.損益百分比)
    if (colorClass) classes.push(colorClass)
  }

  return classes.join(' ')
}

// 取得小計行樣式
const getFooterCellClass = (key) => {
  const classes = []
  if (['twdAsset', 'annualInterest'].includes(key)) classes.push('text-right', 'calculated')
  if (key === 'ratio') classes.push('calculated')
  return classes.join(' ')
}

const getPercentage = (value) => {
  if (!props.totalAssets || props.totalAssets === 0) return 0
  return (value / props.totalAssets) * 100
}

const getPriceStatus = (symbol) => {
  return props.priceStatus[`etf_${symbol}`] || { loading: false, failed: false }
}

const getDividendStatus = (symbol) => {
  return props.priceStatus[`etf_div_${symbol}`] || { loading: false, failed: false }
}

const hasNegativeNews = (symbol) => {
  const data = props.newsData[symbol]
  return data?.hasNegative || false
}

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
  background: #4472c4;
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
  background: #ff6b6b;
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
