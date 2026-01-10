<template>
  <table>
    <thead>
      <tr class="section-header">
        <th colspan="7">無配息資產</th>
      </tr>
      <tr>
        <th>名稱</th>
        <th>代號</th>
        <th>買入均價</th>
        <th>持有單位</th>
        <th >最新價格</th>
        <th >損益(%)</th>
        <th >台幣資產</th>
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
        <td :class="['calculated', getColorClass(asset.損益百分比)]">{{ formatPercent(asset.損益百分比) }}</td>
        <td class="text-right calculated">{{ formatNumber(asset.台幣資產) }}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="sub-total">
        <td colspan="6">小計</td>
        <td class="text-right calculated">{{ formatNumber(subtotal.台幣資產) }}</td>
      </tr>
    </tfoot>
  </table>
</template>

<script setup>
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
  }
})

// 取得價格狀態
const getPriceStatus = (symbol) => {
  return props.priceStatus[`other_${symbol}`] || { loading: false, failed: false }
}
</script>

