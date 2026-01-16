<template>
  <table>
    <thead>
      <tr class="section-header">
        <th colspan="9">無配息資產</th>
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
      </tr>
    </thead>
    <tbody>
      <!-- 美股 -->
      <tr class="category-header">
        <td colspan="9">美股</td>
      </tr>
      <tr v-for="(asset, index) in usStocks" :key="'us-' + index">
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
      </tr>
      <tr class="category-subtotal">
        <td colspan="5">美股小計</td>
        <td :class="['text-right', 'calculated', getColorClass(usStockSubtotal.profitLoss)]">{{ formatNumber(usStockSubtotal.profitLoss) }}</td>
        <td></td>
        <td class="text-right calculated">{{ formatNumber(usStockSubtotal.asset) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(usStockSubtotal.asset)) }}</td>
      </tr>

      <!-- 台股 -->
      <tr class="category-header">
        <td colspan="9">台股</td>
      </tr>
      <tr v-for="(asset, index) in twStocks" :key="'tw-' + index">
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
      </tr>
      <tr class="category-subtotal">
        <td colspan="5">台股小計</td>
        <td :class="['text-right', 'calculated', getColorClass(twStockSubtotal.profitLoss)]">{{ formatNumber(twStockSubtotal.profitLoss) }}</td>
        <td></td>
        <td class="text-right calculated">{{ formatNumber(twStockSubtotal.asset) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(twStockSubtotal.asset)) }}</td>
      </tr>

      <!-- 加密貨幣 -->
      <tr class="category-header">
        <td colspan="9">加密貨幣</td>
      </tr>
      <tr v-for="(asset, index) in cryptos" :key="'crypto-' + index">
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
      </tr>
      <tr class="category-subtotal">
        <td colspan="5">加密貨幣小計</td>
        <td :class="['text-right', 'calculated', getColorClass(cryptoSubtotal.profitLoss)]">{{ formatNumber(cryptoSubtotal.profitLoss) }}</td>
        <td></td>
        <td class="text-right calculated">{{ formatNumber(cryptoSubtotal.asset) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(cryptoSubtotal.asset)) }}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="sub-total">
        <td colspan="5">小計</td>
        <td :class="['text-right', 'calculated', getColorClass(totalProfitLoss)]">{{ formatNumber(totalProfitLoss) }}</td>
        <td></td>
        <td class="text-right calculated">{{ formatNumber(subtotal.台幣資產) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(subtotal.台幣資產)) }}</td>
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
  }
})

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
</style>
