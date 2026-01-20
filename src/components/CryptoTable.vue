<template>
  <table>
    <thead>
      <tr class="section-header">
        <th :colspan="sortedVisibleColumns.length">加密貨幣</th>
      </tr>
      <tr>
        <th v-for="col in sortedVisibleColumns" :key="col.key" :class="getHeaderClass(col.key)">
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(crypto, index) in cryptos" :key="index" :class="{ 'highlighted-row': crypto.代號 === highlightSymbol }">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getCellClass(col.key, crypto)">
          <!-- 名稱 -->
          <template v-if="col.key === 'name'">{{ crypto.名稱 }}</template>
          <!-- 代號 -->
          <template v-else-if="col.key === 'symbol'">{{ crypto.代號 }}</template>
          <!-- 買入均價 -->
          <template v-else-if="col.key === 'buyPrice'">{{ formatDecimal(crypto.買入均價) }}</template>
          <!-- 持有單位 -->
          <template v-else-if="col.key === 'units'">{{ crypto.持有單位 }}</template>
          <!-- 最新價格 -->
          <template v-else-if="col.key === 'latestPrice'">
            {{ formatDecimal(crypto.最新價格) }}
            <span v-if="getPriceStatus(crypto.代號).loading" class="spinner"></span>
          </template>
          <!-- 台幣損益 -->
          <template v-else-if="col.key === 'twdProfit'">{{ formatNumber(crypto.台幣損益) }}</template>
          <!-- 損益(%) -->
          <template v-else-if="col.key === 'profitPercent'">{{ formatPercent(crypto.損益百分比) }}</template>
          <!-- 台幣資產 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(crypto.台幣資產) }}</template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(crypto.台幣資產)) }}</template>
          <!-- 新聞 -->
          <template v-else-if="col.key === 'news'">
            <div class="news-cell">
              <span v-if="isNewsLoading(crypto.代號)" class="spinner news-spinner"></span>
              <button
                v-else-if="hasNews(crypto.代號)"
                class="news-btn"
                :class="{
                  'has-negative': hasNegativeNews(crypto.代號) && !isNewsRead(crypto.代號),
                  'is-read': isNewsRead(crypto.代號)
                }"
                @click="$emit('open-news', crypto.代號, crypto.名稱)"
              >
                <span v-if="hasNegativeNews(crypto.代號) && !isNewsRead(crypto.代號)">!</span>
                <span v-else>i</span>
                <span v-if="!isNewsRead(crypto.代號)" class="news-badge">{{ getNewsCount(crypto.代號) }}</span>
              </button>
            </div>
          </template>
        </td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="sub-total">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getFooterCellClass(col.key)">
          <template v-if="col === sortedVisibleColumns[0]">小計</template>
          <template v-else-if="col.key === 'twdProfit'">{{ formatNumber(subtotal.台幣損益) }}</template>
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(subtotal.台幣資產) }}</template>
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(subtotal.台幣資產)) }}</template>
          <template v-else></template>
        </td>
      </tr>
    </tfoot>
  </table>
</template>

<script setup>
import { computed } from 'vue'
import { formatNumber, formatDecimal, formatPercent, getColorClass } from '../utils/format'

const props = defineProps({
  cryptos: {
    type: Array,
    required: true
  },
  subtotal: {
    type: Object,
    required: true
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

// 欄位定義（簡化版，無配息欄位）
const columnDefinitions = {
  name: { label: '名稱', defaultOrder: 1 },
  symbol: { label: '代號', defaultOrder: 2 },
  buyPrice: { label: '買入均價', defaultOrder: 3 },
  units: { label: '持有單位', defaultOrder: 4 },
  latestPrice: { label: '最新價格', defaultOrder: 5 },
  twdProfit: { label: '台幣損益', defaultOrder: 6 },
  profitPercent: { label: '損益(%)', defaultOrder: 7 },
  twdAsset: { label: '台幣資產', defaultOrder: 8 },
  ratio: { label: '佔比', defaultOrder: 9 },
  news: { label: '新聞', defaultOrder: 10 }
}

const allColumnKeys = Object.keys(columnDefinitions)

// 排序後的可見欄位
const sortedVisibleColumns = computed(() => {
  if (!props.columnConfig ||
      (Array.isArray(props.columnConfig) && props.columnConfig.length === 0) ||
      (typeof props.columnConfig === 'object' && !Array.isArray(props.columnConfig) && !props.columnConfig.order)) {
    return allColumnKeys.map(key => ({
      key,
      label: columnDefinitions[key].label,
      order: columnDefinitions[key].defaultOrder
    })).sort((a, b) => a.order - b.order)
  }

  if (typeof props.columnConfig === 'object' && !Array.isArray(props.columnConfig)) {
    const { order = [], hidden = [] } = props.columnConfig
    const hiddenSet = new Set(hidden)

    if (order.length > 0) {
      return order
        .filter(key => !hiddenSet.has(key) && columnDefinitions[key])
        .map((key, index) => ({
          key,
          label: columnDefinitions[key].label,
          order: index + 1
        }))
    }

    return allColumnKeys
      .filter(key => !hiddenSet.has(key))
      .map(key => ({
        key,
        label: columnDefinitions[key].label,
        order: columnDefinitions[key].defaultOrder
      }))
      .sort((a, b) => a.order - b.order)
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

const getHeaderClass = (key) => {
  if (key === 'news') return 'text-center'
  if (['twdProfit', 'twdAsset'].includes(key)) return 'text-right'
  return ''
}

const getCellClass = (key, crypto) => {
  const classes = []

  if (key === 'name') classes.push('text-left')
  if (key === 'buyPrice') classes.push('cost-price')
  if (['twdProfit', 'twdAsset'].includes(key)) classes.push('text-right')

  const calculatedCols = ['latestPrice', 'twdProfit', 'profitPercent', 'twdAsset', 'ratio']
  if (calculatedCols.includes(key)) classes.push('calculated')

  if (key === 'latestPrice' && getPriceStatus(crypto.代號).failed) classes.push('price-failed')
  if (key === 'twdProfit') {
    const colorClass = getColorClass(crypto.台幣損益)
    if (colorClass) classes.push(colorClass)
  }
  if (key === 'profitPercent') {
    const colorClass = getColorClass(crypto.損益百分比)
    if (colorClass) classes.push(colorClass)
  }

  return classes.join(' ')
}

const getFooterCellClass = (key) => {
  const classes = []
  if (['twdProfit', 'twdAsset'].includes(key)) classes.push('text-right', 'calculated')
  if (key === 'ratio') classes.push('calculated')
  return classes.join(' ')
}

const getPercentage = (value) => {
  if (!props.totalAssets || props.totalAssets === 0) return 0
  return (value / props.totalAssets) * 100
}

const getPriceStatus = (symbol) => {
  return props.priceStatus[`other_${symbol}`] || { loading: false, failed: false }
}

const hasNegativeNews = (symbol) => {
  const data = props.newsData[symbol]
  return data?.hasNegative || false
}

const hasNews = (symbol) => {
  const data = props.newsData[symbol]
  return data?.hasNews || false
}
</script>

<style scoped>
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
</style>
