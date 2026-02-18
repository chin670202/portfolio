<template>
  <table>
    <thead>
      <tr class="section-header">
        <th :colspan="sortedVisibleColumns.length">股票</th>
      </tr>
      <tr>
        <th v-for="col in sortedVisibleColumns" :key="col.key" :class="getHeaderClass(col.key)">
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <!-- 台股 -->
      <tr class="category-header tw-header">
        <td :colspan="sortedVisibleColumns.length">台股</td>
      </tr>
      <tr v-for="(stock, index) in twStocks" :key="'tw-' + index" :class="{ 'highlighted-row': stock.代號 === highlightSymbol }">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getCellClass(col.key, stock)">
          <!-- 名稱 -->
          <template v-if="col.key === 'name'">{{ stock.名稱 }}</template>
          <!-- 代號 -->
          <template v-else-if="col.key === 'symbol'">{{ stock.代號 }}</template>
          <!-- 買入均價 -->
          <template v-else-if="col.key === 'buyPrice'">{{ formatDecimal(stock.買入均價) }}</template>
          <!-- 持有單位 -->
          <template v-else-if="col.key === 'units'">{{ formatNumber(stock.持有單位) }}</template>
          <!-- 最新價格 -->
          <template v-else-if="col.key === 'latestPrice'">
            {{ formatDecimal(stock.最新價格) }}
            <span v-if="getPriceStatus(stock.代號, 'tw').loading" class="spinner"></span>
          </template>
          <!-- 損益(%) -->
          <template v-else-if="col.key === 'profitPercent'">{{ formatPercent(stock.損益百分比) }}</template>
          <!-- 損益金額 -->
          <template v-else-if="col.key === 'profitAmount'">{{ formatNumber(stock.台幣損益) }}</template>
          <!-- 台幣資產 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(stock.台幣資產) }}</template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(stock.台幣資產)) }}</template>
          <!-- 每股配息 -->
          <template v-else-if="col.key === 'dividend'">
            {{ stock.每股配息 ? formatDecimal(stock.每股配息) : '--' }}
            <span v-if="getDividendStatus(stock.代號).loading" class="spinner"></span>
          </template>
          <!-- 年殖利率 -->
          <template v-else-if="col.key === 'yield'">{{ stock.年殖利率 ? formatPercent(stock.年殖利率) : '--' }}</template>
          <!-- 每年利息 -->
          <template v-else-if="col.key === 'annualInterest'">{{ stock.每年利息 ? formatNumber(stock.每年利息) : '--' }}</template>
          <!-- 下次配息日 -->
          <template v-else-if="col.key === 'nextPaymentDate'">{{ stock.下次配息日 || '--' }}</template>
          <!-- 剩餘天配息 -->
          <template v-else-if="col.key === 'daysToPayment'">{{ stock.剩餘天配息 !== null && stock.剩餘天配息 !== undefined ? stock.剩餘天配息 : (stock.剩餘天配息備註 || '--') }}</template>
          <!-- 下次配息 -->
          <template v-else-if="col.key === 'nextPayment'">{{ stock.下次配息 ? formatNumber(stock.下次配息) : '--' }}</template>
          <!-- 最新殖利率 -->
          <template v-else-if="col.key === 'latestYield'">{{ stock.最新殖利率 ? formatPercent(stock.最新殖利率) : '--' }}</template>
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
                @click="$emit('open-news', stock.代號, stock.名稱)"
              >
                <span v-if="hasNegativeNews(stock.代號) && !isNewsRead(stock.代號)">!</span>
                <span v-else>i</span>
                <span v-if="!isNewsRead(stock.代號)" class="news-badge">{{ getNewsCount(stock.代號) }}</span>
              </button>
            </div>
          </template>
        </td>
      </tr>
      <tr class="category-subtotal">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getSubtotalCellClass(col.key)">
          <template v-if="col === sortedVisibleColumns[0]">台股小計</template>
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(twSubtotal.台幣資產) }}</template>
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(twSubtotal.台幣資產)) }}</template>
          <template v-else-if="col.key === 'annualInterest'">{{ formatNumber(twSubtotal.每年利息) }}</template>
          <template v-else></template>
        </td>
      </tr>

      <!-- 美股 -->
      <tr class="category-header us-header">
        <td :colspan="sortedVisibleColumns.length">美股</td>
      </tr>
      <tr v-for="(stock, index) in usStocks" :key="'us-' + index" :class="{ 'highlighted-row': stock.代號 === highlightSymbol }">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getCellClass(col.key, stock)">
          <!-- 名稱 -->
          <template v-if="col.key === 'name'">{{ stock.名稱 }}</template>
          <!-- 代號 -->
          <template v-else-if="col.key === 'symbol'">{{ stock.代號 }}</template>
          <!-- 買入均價 -->
          <template v-else-if="col.key === 'buyPrice'">{{ formatDecimal(stock.買入均價) }}</template>
          <!-- 持有單位 -->
          <template v-else-if="col.key === 'units'">{{ stock.持有單位 }}</template>
          <!-- 最新價格 -->
          <template v-else-if="col.key === 'latestPrice'">
            {{ formatDecimal(stock.最新價格) }}
            <span v-if="getPriceStatus(stock.代號, 'us').loading" class="spinner"></span>
          </template>
          <!-- 損益(%) -->
          <template v-else-if="col.key === 'profitPercent'">{{ formatPercent(stock.損益百分比) }}</template>
          <!-- 損益金額 -->
          <template v-else-if="col.key === 'profitAmount'">{{ formatNumber(stock.台幣損益) }}</template>
          <!-- 台幣資產 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(stock.台幣資產) }}</template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(stock.台幣資產)) }}</template>
          <!-- 每股配息（美股通常無配息資料） -->
          <template v-else-if="col.key === 'dividend'">--</template>
          <!-- 年殖利率 -->
          <template v-else-if="col.key === 'yield'">--</template>
          <!-- 每年利息 -->
          <template v-else-if="col.key === 'annualInterest'">--</template>
          <!-- 下次配息日 -->
          <template v-else-if="col.key === 'nextPaymentDate'">--</template>
          <!-- 剩餘天配息 -->
          <template v-else-if="col.key === 'daysToPayment'">--</template>
          <!-- 下次配息 -->
          <template v-else-if="col.key === 'nextPayment'">--</template>
          <!-- 最新殖利率 -->
          <template v-else-if="col.key === 'latestYield'">--</template>
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
                @click="$emit('open-news', stock.代號, stock.名稱)"
              >
                <span v-if="hasNegativeNews(stock.代號) && !isNewsRead(stock.代號)">!</span>
                <span v-else>i</span>
                <span v-if="!isNewsRead(stock.代號)" class="news-badge">{{ getNewsCount(stock.代號) }}</span>
              </button>
            </div>
          </template>
        </td>
      </tr>
      <tr class="category-subtotal">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getSubtotalCellClass(col.key)">
          <template v-if="col === sortedVisibleColumns[0]">美股小計</template>
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(usSubtotal.台幣資產) }}</template>
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(usSubtotal.台幣資產)) }}</template>
          <template v-else></template>
        </td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="sub-total">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getFooterCellClass(col.key)">
          <template v-if="col === sortedVisibleColumns[0]">小計</template>
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(totalSubtotal.台幣資產) }}</template>
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(totalSubtotal.台幣資產)) }}</template>
          <template v-else-if="col.key === 'annualInterest'">{{ formatNumber(totalSubtotal.每年利息) }}</template>
          <template v-else></template>
        </td>
      </tr>
    </tfoot>
  </table>

  <div v-if="twSubtotal.已質押資產 > 0" class="maintain-rate-section">
    <span class="maintain-rate-box highlight-green clickable" @click="showModal = true">
      整戶維持率: <span class="calculated">{{ maintainRatePercent }}%</span>
    </span>
    <span class="maintain-rate-box highlight-orange">
      追繳維持率: {{追繳維持率百分比 }}%
    </span>
  </div>

  <FormulaModal
    :visible="showModal"
    title="股票 整戶維持率"
    formula="整戶維持率 = 已質押資產 ÷ 貸款餘額 × 100%"
    :values="modalValues"
    :result-formula="resultFormula"
    :result="maintainRatePercent + '%'"
    @close="showModal = false"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import { formatNumber, formatDecimal, formatPercent, getColorClass } from '../utils/format'
import FormulaModal from './FormulaModal.vue'

const props = defineProps({
  twStocks: {
    type: Array,
    required: true
  },
  usStocks: {
    type: Array,
    required: true
  },
  twSubtotal: {
    type: Object,
    required: true
  },
  usSubtotal: {
    type: Object,
    required: true
  },
  totalSubtotal: {
    type: Object,
    required: true
  },
  loanDetails: {
    type: Array,
    default: () => []
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
    type: [Array, Object],
    default: () => []
  }
})

defineEmits(['open-news'])

// 欄位定義（使用原 ETF 的欄位）
const columnDefinitions = {
  name: { label: '名稱', defaultOrder: 1 },
  symbol: { label: '代號', defaultOrder: 2 },
  buyPrice: { label: '買入均價', defaultOrder: 3 },
  units: { label: '持有單位', defaultOrder: 4 },
  latestPrice: { label: '最新價格', defaultOrder: 5 },
  profitPercent: { label: '損益(%)', defaultOrder: 6 },
  profitAmount: { label: '損益金額', defaultOrder: 7 },
  twdAsset: { label: '台幣資產', defaultOrder: 8 },
  ratio: { label: '佔比', defaultOrder: 9 },
  dividend: { label: '每股配息', defaultOrder: 10 },
  yield: { label: '年殖利率', defaultOrder: 11 },
  annualInterest: { label: '每年利息', defaultOrder: 12 },
  nextPaymentDate: { label: '下次配息日', defaultOrder: 13 },
  daysToPayment: { label: '剩餘天配息', defaultOrder: 14 },
  nextPayment: { label: '下次配息', defaultOrder: 15 },
  latestYield: { label: '最新殖利率', defaultOrder: 16 },
  news: { label: '新聞', defaultOrder: 17 }
}

const allColumnKeys = Object.keys(columnDefinitions)

// 配息相關欄位（當所有股票都沒有配息時自動隱藏）
const dividendColumns = ['dividend', 'yield', 'annualInterest', 'nextPaymentDate', 'daysToPayment', 'nextPayment', 'latestYield']

// 檢查是否有任何股票有配息資料
const hasAnyDividend = computed(() => {
  // 檢查台股
  const twHasDividend = props.twStocks.some(stock =>
    (stock.每股配息 && stock.每股配息 > 0) ||
    (stock.年殖利率 && stock.年殖利率 > 0) ||
    (stock.每年利息 && stock.每年利息 > 0)
  )
  // 美股目前都沒有配息資料，所以只檢查台股
  return twHasDividend
})

// 排序後的可見欄位
const sortedVisibleColumns = computed(() => {
  let columns = []

  if (!props.columnConfig ||
      (Array.isArray(props.columnConfig) && props.columnConfig.length === 0) ||
      (typeof props.columnConfig === 'object' && !Array.isArray(props.columnConfig) && !props.columnConfig.order)) {
    columns = allColumnKeys.map(key => ({
      key,
      label: columnDefinitions[key].label,
      order: columnDefinitions[key].defaultOrder
    })).sort((a, b) => a.order - b.order)
  } else if (typeof props.columnConfig === 'object' && !Array.isArray(props.columnConfig)) {
    const { order = [], hidden = [] } = props.columnConfig
    const hiddenSet = new Set(hidden)

    if (order.length > 0) {
      columns = order
        .filter(key => !hiddenSet.has(key) && columnDefinitions[key])
        .map((key, index) => ({
          key,
          label: columnDefinitions[key].label,
          order: index + 1
        }))
    } else {
      columns = allColumnKeys
        .filter(key => !hiddenSet.has(key))
        .map(key => ({
          key,
          label: columnDefinitions[key].label,
          order: columnDefinitions[key].defaultOrder
        }))
        .sort((a, b) => a.order - b.order)
    }
  } else {
    const configMap = {}
    props.columnConfig.forEach(col => {
      configMap[col.key] = col
    })

    columns = allColumnKeys
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
  }

  // 如果沒有任何股票有配息資料，自動隱藏配息相關欄位
  if (!hasAnyDividend.value) {
    columns = columns.filter(col => !dividendColumns.includes(col.key))
  }

  return columns
})

const getHeaderClass = (key) => {
  if (key === 'news' || key === 'nextPaymentDate') return 'text-center'
  if (key === 'name') return ''
  return ''
}

const getCellClass = (key, stock) => {
  const classes = []
  if (key === 'name') classes.push('text-left')
  if (key === 'buyPrice') classes.push('cost-price')
  if (['twdAsset', 'annualInterest', 'nextPayment', 'profitAmount'].includes(key)) classes.push('text-right')

  const calculatedCols = ['latestPrice', 'profitPercent', 'profitAmount', 'twdAsset', 'ratio', 'dividend', 'yield',
                          'annualInterest', 'nextPaymentDate', 'daysToPayment', 'nextPayment', 'latestYield']
  if (calculatedCols.includes(key)) classes.push('calculated')

  if (key === 'latestPrice' && getPriceStatus(stock.代號, stock.market).failed) classes.push('price-failed')
  if (key === 'dividend' && getDividendStatus(stock.代號).failed) classes.push('price-failed')
  if (key === 'profitPercent') {
    const colorClass = getColorClass(stock.損益百分比)
    if (colorClass) classes.push(colorClass)
  }
  if (key === 'profitAmount') {
    const colorClass = getColorClass(stock.台幣損益)
    if (colorClass) classes.push(colorClass)
  }

  return classes.join(' ')
}

const getSubtotalCellClass = (key) => {
  const classes = []
  if (['twdAsset', 'annualInterest'].includes(key)) classes.push('text-right', 'calculated')
  if (key === 'ratio') classes.push('calculated')
  return classes.join(' ')
}

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

const getPriceStatus = (symbol, market) => {
  if (market === 'us') {
    return props.priceStatus[`other_${symbol}`] || { loading: false, failed: false }
  }
  // 台股可能來自 ETF 或其它資產，兩個都檢查
  return props.priceStatus[`etf_${symbol}`] || props.priceStatus[`other_${symbol}`] || { loading: false, failed: false }
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

// 維持率計算
const showModal = ref(false)
const 追繳維持率百分比 = 130

const totalLoan = computed(() => {
  return props.loanDetails.reduce((sum, l) => sum + l.value, 0)
})

const maintainRatePercent = computed(() => {
  if (totalLoan.value === 0) return 0
  return Math.round((props.twSubtotal.已質押資產 / totalLoan.value) * 100)
})

const modalValues = computed(() => {
  const values = [
    { name: '已質押資產', value: formatNumber(props.twSubtotal.已質押資產) }
  ]
  props.loanDetails.forEach(l => {
    values.push({ name: l.name, value: formatNumber(l.value) })
  })
  values.push({ name: '貸款餘額合計', value: formatNumber(totalLoan.value) })
  return values
})

const resultFormula = computed(() => {
  return `${formatNumber(props.twSubtotal.已質押資產)} ÷ ${formatNumber(totalLoan.value)} × 100%`
})
</script>

<style scoped>
.category-header td {
  font-weight: bold;
  text-align: center;
  font-size: 0.95em;
  letter-spacing: 0.5px;
}

/* 台股 - 藍色系 */
.tw-header td {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* 美股 - 綠色系 */
.us-header td {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.category-subtotal td {
  background: #f5f5f5;
  font-style: italic;
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

.maintain-rate-section {
  margin-top: 10px;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.maintain-rate-box {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
}

.highlight-green {
  background: #d4edda;
  color: #155724;
}

.highlight-orange {
  background: #fff3cd;
  color: #856404;
}
</style>
