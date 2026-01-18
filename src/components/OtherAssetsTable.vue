<template>
  <table>
    <thead>
      <tr class="section-header">
        <th :colspan="sortedVisibleColumns.length">無配息資產</th>
      </tr>
      <tr>
        <th v-for="col in sortedVisibleColumns" :key="col.key" :class="getHeaderClass(col.key)">
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <!-- 美股 -->
      <tr class="category-header">
        <td :colspan="sortedVisibleColumns.length">美股</td>
      </tr>
      <tr v-for="(asset, index) in usStocks" :key="'us-' + index" :class="{ 'highlighted-row': asset.代號 === highlightSymbol }">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getCellClass(col.key, asset)">
          <!-- 名稱 -->
          <template v-if="col.key === 'name'">{{ asset.名稱 }}</template>
          <!-- 代號 -->
          <template v-else-if="col.key === 'symbol'">{{ asset.代號 }}</template>
          <!-- 買入均價 -->
          <template v-else-if="col.key === 'buyPrice'">{{ formatDecimal(asset.買入均價) }}</template>
          <!-- 持有單位 -->
          <template v-else-if="col.key === 'units'">{{ asset.持有單位 }}</template>
          <!-- 最新價格 -->
          <template v-else-if="col.key === 'latestPrice'">
            {{ formatDecimal(asset.最新價格) }}
            <span v-if="getPriceStatus(asset.代號).loading" class="spinner"></span>
          </template>
          <!-- 台幣損益 -->
          <template v-else-if="col.key === 'twdProfit'">{{ formatNumber(asset.台幣損益) }}</template>
          <!-- 損益(%) -->
          <template v-else-if="col.key === 'profitPercent'">{{ formatPercent(asset.損益百分比) }}</template>
          <!-- 台幣資產 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(asset.台幣資產) }}</template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(asset.台幣資產)) }}</template>
          <!-- 新聞 -->
          <template v-else-if="col.key === 'news'">
            <div class="news-cell">
              <span v-if="isNewsLoading(asset.代號)" class="spinner news-spinner"></span>
              <button
                v-else-if="hasNews(asset.代號)"
                class="news-btn"
                :class="{ 'has-negative': hasNegativeNews(asset.代號) }"
                @click="$emit('open-news', asset.代號, asset.名稱)"
              >
                <span v-if="hasNegativeNews(asset.代號)">!</span>
                <span v-else>i</span>
                <span class="news-badge">{{ getNewsCount(asset.代號) }}</span>
              </button>
            </div>
          </template>
        </td>
      </tr>
      <tr class="category-subtotal">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getSubtotalCellClass(col.key)">
          <!-- 第一欄顯示小計標籤 -->
          <template v-if="col === sortedVisibleColumns[0]">美股小計</template>
          <!-- 台幣損益 -->
          <template v-else-if="col.key === 'twdProfit'">{{ formatNumber(usStockSubtotal.profitLoss) }}</template>
          <!-- 台幣資產 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(usStockSubtotal.asset) }}</template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(usStockSubtotal.asset)) }}</template>
          <!-- 其他欄位留空 -->
          <template v-else></template>
        </td>
      </tr>

      <!-- 台股 -->
      <tr class="category-header">
        <td :colspan="sortedVisibleColumns.length">台股</td>
      </tr>
      <tr v-for="(asset, index) in twStocks" :key="'tw-' + index" :class="{ 'highlighted-row': asset.代號 === highlightSymbol }">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getCellClass(col.key, asset)">
          <!-- 名稱 -->
          <template v-if="col.key === 'name'">{{ asset.名稱 }}</template>
          <!-- 代號 -->
          <template v-else-if="col.key === 'symbol'">{{ asset.代號 }}</template>
          <!-- 買入均價 -->
          <template v-else-if="col.key === 'buyPrice'">{{ formatDecimal(asset.買入均價) }}</template>
          <!-- 持有單位 -->
          <template v-else-if="col.key === 'units'">{{ asset.持有單位 }}</template>
          <!-- 最新價格 -->
          <template v-else-if="col.key === 'latestPrice'">
            {{ formatDecimal(asset.最新價格) }}
            <span v-if="getPriceStatus(asset.代號).loading" class="spinner"></span>
          </template>
          <!-- 台幣損益 -->
          <template v-else-if="col.key === 'twdProfit'">{{ formatNumber(asset.台幣損益) }}</template>
          <!-- 損益(%) -->
          <template v-else-if="col.key === 'profitPercent'">{{ formatPercent(asset.損益百分比) }}</template>
          <!-- 台幣資產 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(asset.台幣資產) }}</template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(asset.台幣資產)) }}</template>
          <!-- 新聞 -->
          <template v-else-if="col.key === 'news'">
            <div class="news-cell">
              <span v-if="isNewsLoading(asset.代號)" class="spinner news-spinner"></span>
              <button
                v-else-if="hasNews(asset.代號)"
                class="news-btn"
                :class="{ 'has-negative': hasNegativeNews(asset.代號) }"
                @click="$emit('open-news', asset.代號, asset.名稱)"
              >
                <span v-if="hasNegativeNews(asset.代號)">!</span>
                <span v-else>i</span>
                <span class="news-badge">{{ getNewsCount(asset.代號) }}</span>
              </button>
            </div>
          </template>
        </td>
      </tr>
      <tr class="category-subtotal">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getSubtotalCellClass(col.key)">
          <!-- 第一欄顯示小計標籤 -->
          <template v-if="col === sortedVisibleColumns[0]">台股小計</template>
          <!-- 台幣損益 -->
          <template v-else-if="col.key === 'twdProfit'">{{ formatNumber(twStockSubtotal.profitLoss) }}</template>
          <!-- 台幣資產 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(twStockSubtotal.asset) }}</template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(twStockSubtotal.asset)) }}</template>
          <!-- 其他欄位留空 -->
          <template v-else></template>
        </td>
      </tr>

      <!-- 加密貨幣 -->
      <tr class="category-header">
        <td :colspan="sortedVisibleColumns.length">加密貨幣</td>
      </tr>
      <tr v-for="(asset, index) in cryptos" :key="'crypto-' + index" :class="{ 'highlighted-row': asset.代號 === highlightSymbol }">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getCellClass(col.key, asset)">
          <!-- 名稱 -->
          <template v-if="col.key === 'name'">{{ asset.名稱 }}</template>
          <!-- 代號 -->
          <template v-else-if="col.key === 'symbol'">{{ asset.代號 }}</template>
          <!-- 買入均價 -->
          <template v-else-if="col.key === 'buyPrice'">{{ formatDecimal(asset.買入均價) }}</template>
          <!-- 持有單位 -->
          <template v-else-if="col.key === 'units'">{{ asset.持有單位 }}</template>
          <!-- 最新價格 -->
          <template v-else-if="col.key === 'latestPrice'">
            {{ formatDecimal(asset.最新價格) }}
            <span v-if="getPriceStatus(asset.代號).loading" class="spinner"></span>
          </template>
          <!-- 台幣損益 -->
          <template v-else-if="col.key === 'twdProfit'">{{ formatNumber(asset.台幣損益) }}</template>
          <!-- 損益(%) -->
          <template v-else-if="col.key === 'profitPercent'">{{ formatPercent(asset.損益百分比) }}</template>
          <!-- 台幣資產 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(asset.台幣資產) }}</template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(asset.台幣資產)) }}</template>
          <!-- 新聞 -->
          <template v-else-if="col.key === 'news'">
            <div class="news-cell">
              <span v-if="isNewsLoading(asset.代號)" class="spinner news-spinner"></span>
              <button
                v-else-if="hasNews(asset.代號)"
                class="news-btn"
                :class="{ 'has-negative': hasNegativeNews(asset.代號) }"
                @click="$emit('open-news', asset.代號, asset.名稱)"
              >
                <span v-if="hasNegativeNews(asset.代號)">!</span>
                <span v-else>i</span>
                <span class="news-badge">{{ getNewsCount(asset.代號) }}</span>
              </button>
            </div>
          </template>
        </td>
      </tr>
      <tr class="category-subtotal">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getSubtotalCellClass(col.key)">
          <!-- 第一欄顯示小計標籤 -->
          <template v-if="col === sortedVisibleColumns[0]">加密貨幣小計</template>
          <!-- 台幣損益 -->
          <template v-else-if="col.key === 'twdProfit'">{{ formatNumber(cryptoSubtotal.profitLoss) }}</template>
          <!-- 台幣資產 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(cryptoSubtotal.asset) }}</template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(cryptoSubtotal.asset)) }}</template>
          <!-- 其他欄位留空 -->
          <template v-else></template>
        </td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="sub-total">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getFooterCellClass(col.key)">
          <!-- 第一欄顯示小計標籤 -->
          <template v-if="col === sortedVisibleColumns[0]">小計</template>
          <!-- 台幣損益 -->
          <template v-else-if="col.key === 'twdProfit'">{{ formatNumber(totalProfitLoss) }}</template>
          <!-- 台幣資產 -->
          <template v-else-if="col.key === 'twdAsset'">{{ formatNumber(subtotal.台幣資產) }}</template>
          <!-- 佔比 -->
          <template v-else-if="col.key === 'ratio'">{{ formatPercent(getPercentage(subtotal.台幣資產)) }}</template>
          <!-- 其他欄位留空 -->
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
  assets: {
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
  if (key === 'news') return 'text-center'
  if (['twdProfit', 'twdAsset'].includes(key)) return 'text-right'
  return ''
}

// 取得儲存格樣式
const getCellClass = (key, asset) => {
  const classes = []

  if (key === 'name') classes.push('text-left')
  if (key === 'buyPrice') classes.push('cost-price')
  if (['twdProfit', 'twdAsset'].includes(key)) classes.push('text-right')

  const calculatedCols = ['latestPrice', 'twdProfit', 'profitPercent', 'twdAsset', 'ratio']
  if (calculatedCols.includes(key)) classes.push('calculated')

  if (key === 'latestPrice' && getPriceStatus(asset.代號).failed) classes.push('price-failed')
  if (key === 'twdProfit') {
    const colorClass = getColorClass(asset.台幣損益)
    if (colorClass) classes.push(colorClass)
  }
  if (key === 'profitPercent') {
    const colorClass = getColorClass(asset.損益百分比)
    if (colorClass) classes.push(colorClass)
  }

  return classes.join(' ')
}

// 取得類別小計行樣式
const getSubtotalCellClass = (key) => {
  const classes = []
  if (['twdProfit', 'twdAsset'].includes(key)) classes.push('text-right', 'calculated')
  if (key === 'ratio') classes.push('calculated')
  return classes.join(' ')
}

// 取得總計行樣式
const getFooterCellClass = (key) => {
  const classes = []
  if (['twdProfit', 'twdAsset'].includes(key)) classes.push('text-right', 'calculated')
  if (key === 'ratio') classes.push('calculated')
  return classes.join(' ')
}

// 美股代號列表
const usStockSymbols = ['TSLA', 'GLDM', 'SIVR', 'COPX', 'VOO']

// 加密貨幣判斷
const isCrypto = (symbol) => symbol.includes('/TWD')

// 台股判斷（數字開頭且非加密貨幣）
const isTwStock = (symbol) => /^\d/.test(symbol) && !isCrypto(symbol)

// 美股
const usStocks = computed(() => {
  return props.assets.filter(a => usStockSymbols.includes(a.代號))
})

// 台股
const twStocks = computed(() => {
  return props.assets.filter(a => isTwStock(a.代號))
})

// 加密貨幣
const cryptos = computed(() => {
  return props.assets.filter(a => isCrypto(a.代號))
})

// 美股小計
const usStockSubtotal = computed(() => {
  const assets = usStocks.value
  return {
    profitLoss: assets.reduce((sum, a) => sum + (a.台幣損益 || 0), 0),
    asset: assets.reduce((sum, a) => sum + (a.台幣資產 || 0), 0)
  }
})

// 台股小計
const twStockSubtotal = computed(() => {
  const assets = twStocks.value
  return {
    profitLoss: assets.reduce((sum, a) => sum + (a.台幣損益 || 0), 0),
    asset: assets.reduce((sum, a) => sum + (a.台幣資產 || 0), 0)
  }
})

// 加密貨幣小計
const cryptoSubtotal = computed(() => {
  const assets = cryptos.value
  return {
    profitLoss: assets.reduce((sum, a) => sum + (a.台幣損益 || 0), 0),
    asset: assets.reduce((sum, a) => sum + (a.台幣資產 || 0), 0)
  }
})

// 計算台幣損益小計
const totalProfitLoss = computed(() => {
  return props.assets.reduce((sum, asset) => sum + (asset.台幣損益 || 0), 0)
})

// 計算佔總投資比例
const getPercentage = (value) => {
  if (!props.totalAssets || props.totalAssets === 0) return 0
  return (value / props.totalAssets) * 100
}

// 取得價格狀態
const getPriceStatus = (symbol) => {
  return props.priceStatus[`other_${symbol}`] || { loading: false, failed: false }
}

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
</script>

<style scoped>
.category-header td {
  background: #e8e8e8;
  font-weight: bold;
  text-align: left;
  padding-left: 10px;
}

.category-subtotal td {
  background: #f5f5f5;
  font-style: italic;
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
