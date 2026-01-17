<template>
  <table>
    <thead>
      <tr class="section-header">
        <th colspan="10">無配息資產</th>
      </tr>
      <tr>
        <th>名稱</th>
        <th>代號</th>
        <th>買入均價</th>
        <th>持有單位</th>
        <th>最新價格</th>
        <th>台幣損益</th>
        <th>損益(%)</th>
        <th>台幣資產</th>
        <th>佔比</th>
        <th>新聞</th>
      </tr>
    </thead>
    <tbody>
      <!-- 美股 -->
      <tr class="category-header">
        <td colspan="10">美股</td>
      </tr>
      <tr v-for="(asset, index) in usStocks" :key="'us-' + index" :class="{ 'highlighted-row': asset.代號 === highlightSymbol }">
        <td class="text-left">{{ asset.名稱 }}</td>
        <td>{{ asset.代號 }}</td>
        <td class="cost-price">{{ formatDecimal(asset.買入均價) }}</td>
        <td>{{ asset.持有單位 }}</td>
        <td :class="['calculated', { 'price-failed': getPriceStatus(asset.代號).failed }]">
          {{ formatDecimal(asset.最新價格) }}
          <span v-if="getPriceStatus(asset.代號).loading" class="spinner"></span>
        </td>
        <td :class="['text-right', 'calculated', getColorClass(asset.台幣損益)]">{{ formatNumber(asset.台幣損益) }}</td>
        <td :class="['calculated', getColorClass(asset.損益百分比)]">{{ formatPercent(asset.損益百分比) }}</td>
        <td class="text-right calculated">{{ formatNumber(asset.台幣資產) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(asset.台幣資產)) }}</td>
        <td>
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
        </td>
      </tr>
      <tr class="category-subtotal">
        <td colspan="5">美股小計</td>
        <td :class="['text-right', 'calculated', getColorClass(usStockSubtotal.profitLoss)]">{{ formatNumber(usStockSubtotal.profitLoss) }}</td>
        <td></td>
        <td class="text-right calculated">{{ formatNumber(usStockSubtotal.asset) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(usStockSubtotal.asset)) }}</td>
        <td></td>
      </tr>

      <!-- 台股 -->
      <tr class="category-header">
        <td colspan="10">台股</td>
      </tr>
      <tr v-for="(asset, index) in twStocks" :key="'tw-' + index" :class="{ 'highlighted-row': asset.代號 === highlightSymbol }">
        <td class="text-left">{{ asset.名稱 }}</td>
        <td>{{ asset.代號 }}</td>
        <td class="cost-price">{{ formatDecimal(asset.買入均價) }}</td>
        <td>{{ asset.持有單位 }}</td>
        <td :class="['calculated', { 'price-failed': getPriceStatus(asset.代號).failed }]">
          {{ formatDecimal(asset.最新價格) }}
          <span v-if="getPriceStatus(asset.代號).loading" class="spinner"></span>
        </td>
        <td :class="['text-right', 'calculated', getColorClass(asset.台幣損益)]">{{ formatNumber(asset.台幣損益) }}</td>
        <td :class="['calculated', getColorClass(asset.損益百分比)]">{{ formatPercent(asset.損益百分比) }}</td>
        <td class="text-right calculated">{{ formatNumber(asset.台幣資產) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(asset.台幣資產)) }}</td>
        <td>
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
        </td>
      </tr>
      <tr class="category-subtotal">
        <td colspan="5">台股小計</td>
        <td :class="['text-right', 'calculated', getColorClass(twStockSubtotal.profitLoss)]">{{ formatNumber(twStockSubtotal.profitLoss) }}</td>
        <td></td>
        <td class="text-right calculated">{{ formatNumber(twStockSubtotal.asset) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(twStockSubtotal.asset)) }}</td>
        <td></td>
      </tr>

      <!-- 加密貨幣 -->
      <tr class="category-header">
        <td colspan="10">加密貨幣</td>
      </tr>
      <tr v-for="(asset, index) in cryptos" :key="'crypto-' + index" :class="{ 'highlighted-row': asset.代號 === highlightSymbol }">
        <td class="text-left">{{ asset.名稱 }}</td>
        <td>{{ asset.代號 }}</td>
        <td class="cost-price">{{ formatDecimal(asset.買入均價) }}</td>
        <td>{{ asset.持有單位 }}</td>
        <td :class="['calculated', { 'price-failed': getPriceStatus(asset.代號).failed }]">
          {{ formatDecimal(asset.最新價格) }}
          <span v-if="getPriceStatus(asset.代號).loading" class="spinner"></span>
        </td>
        <td :class="['text-right', 'calculated', getColorClass(asset.台幣損益)]">{{ formatNumber(asset.台幣損益) }}</td>
        <td :class="['calculated', getColorClass(asset.損益百分比)]">{{ formatPercent(asset.損益百分比) }}</td>
        <td class="text-right calculated">{{ formatNumber(asset.台幣資產) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(asset.台幣資產)) }}</td>
        <td>
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
        </td>
      </tr>
      <tr class="category-subtotal">
        <td colspan="5">加密貨幣小計</td>
        <td :class="['text-right', 'calculated', getColorClass(cryptoSubtotal.profitLoss)]">{{ formatNumber(cryptoSubtotal.profitLoss) }}</td>
        <td></td>
        <td class="text-right calculated">{{ formatNumber(cryptoSubtotal.asset) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(cryptoSubtotal.asset)) }}</td>
        <td></td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="sub-total">
        <td colspan="5">小計</td>
        <td :class="['text-right', 'calculated', getColorClass(totalProfitLoss)]">{{ formatNumber(totalProfitLoss) }}</td>
        <td></td>
        <td class="text-right calculated">{{ formatNumber(subtotal.台幣資產) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(subtotal.台幣資產)) }}</td>
        <td></td>
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
  }
})

defineEmits(['open-news'])

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
