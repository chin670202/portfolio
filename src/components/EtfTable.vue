<template>
  <table>
    <thead>
      <tr class="section-header">
        <th colspan="17">股票/ETF</th>
      </tr>
      <tr>
        <th>ETF名稱</th>
        <th>代號</th>
        <th>買入均價</th>
        <th>持有單位</th>
        <th>最新價格</th>
        <th>損益(%)</th>
        <th>台幣資產</th>
        <th>佔比</th>
        <th>每股配息</th>
        <th>年殖利率</th>
        <th>每年利息</th>
        <th>下次配息日</th>
        <th>剩餘天配息</th>
        <th>下次配息</th>
        <th>質押單位</th>
        <th>已質押資產</th>
        <th>最新殖利率</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(etf, index) in etfs" :key="index">
        <td class="text-left">{{ etf.名稱 }}</td>
        <td>{{ etf.代號 }}</td>
        <td>{{ formatDecimal(etf.買入均價) }}</td>
        <td>{{ formatNumber(etf.持有單位) }}</td>
        <td :class="['calculated', { 'price-failed': getPriceStatus(etf.代號).failed }]">
          {{ formatDecimal(etf.最新價格) }}
          <span v-if="getPriceStatus(etf.代號).loading" class="spinner"></span>
        </td>
        <td :class="['calculated', getColorClass(etf.損益百分比)]">{{ formatPercent(etf.損益百分比) }}</td>
        <td class="text-right calculated">{{ formatNumber(etf.台幣資產) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(etf.台幣資產)) }}</td>
        <td :class="['calculated', { 'price-failed': getDividendStatus(etf.代號).failed }]">
          {{ formatDecimal(etf.每股配息) }}
          <span v-if="getDividendStatus(etf.代號).loading" class="spinner"></span>
        </td>
        <td class="calculated">{{ formatPercent(etf.年殖利率) }}</td>
        <td class="text-right calculated">{{ formatNumber(etf.每年利息) }}</td>
        <td class="calculated">{{ etf.下次配息日 || '-' }}</td>
        <td class="calculated">{{ etf.剩餘天配息 !== null ? etf.剩餘天配息 : (etf.剩餘天配息備註 || '-') }}</td>
        <td class="text-right calculated">{{ formatNumber(etf.下次配息) }}</td>
        <td>{{ formatNumber(etf.質押單位) }}</td>
        <td class="text-right calculated">{{ formatNumber(etf.已質押資產) }}</td>
        <td class="calculated">{{ formatPercent(etf.最新殖利率) }}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="sub-total">
        <td colspan="6">小計</td>
        <td class="text-right calculated">{{ formatNumber(subtotal.台幣資產) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(subtotal.台幣資產)) }}</td>
        <td colspan="2"></td>
        <td class="text-right calculated">{{ formatNumber(subtotal.每年利息) }}</td>
        <td colspan="4"></td>
        <td class="text-right calculated">{{ formatNumber(subtotal.已質押資產) }}</td>
        <td></td>
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
  }
})

// 計算佔總投資比例
const getPercentage = (value) => {
  if (!props.totalAssets || props.totalAssets === 0) return 0
  return (value / props.totalAssets) * 100
}

// 取得價格狀態
const getPriceStatus = (symbol) => {
  return props.priceStatus[`etf_${symbol}`] || { loading: false, failed: false }
}

// 取得配息狀態
const getDividendStatus = (symbol) => {
  return props.priceStatus[`etf_div_${symbol}`] || { loading: false, failed: false }
}

const showModal = ref(false)

const totalLoan = computed(() => {
  return props.loanDetails.reduce((sum, l) => sum + l.value, 0)
})

const modalValues = computed(() => {
  const values = [
    { name: '已質押資產', value: formatNumber(props.subtotal.已質押資產) }
  ]
  // 動態加入各筆貸款
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
</style>

