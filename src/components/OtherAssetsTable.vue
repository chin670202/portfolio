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
      <tr v-for="(asset, index) in assets" :key="index">
        <td class="text-left">{{ asset.名稱 }}</td>
        <td>{{ asset.代號 }}</td>
        <td>{{ formatDecimal(asset.買入均價) }}</td>
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
    </tbody>
    <tfoot>
      <tr class="sub-total">
        <td colspan="5">小計</td>
        <td class="text-right calculated">{{ formatNumber(totalProfitLoss) }}</td>
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

