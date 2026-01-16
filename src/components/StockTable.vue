<template>
  <table>
    <thead>
      <tr class="section-header">
        <th colspan="16">海外債券</th>
      </tr>
      <tr>
        <th>公司名稱</th>
        <th>代號</th>
        <th>買入價格</th>
        <th>持有單位</th>
        <th>最新價格</th>
        <th>損益(%)</th>
        <th>台幣資產</th>
        <th>佔比</th>
        <th>票面利率</th>
        <th>年殖利率</th>
        <th>每年利息</th>
        <th>配息日</th>
        <th>剩餘天配息</th>
        <th>下次配息</th>
        <th>到期日</th>
        <th>剩餘年數</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(stock, index) in stocks" :key="index">
        <td class="text-left">{{ stock.公司名稱 }}</td>
        <td>{{ stock.代號 }}</td>
        <td class="cost-price">{{ formatDecimal(stock.買入價格) }}</td>
        <td>{{ formatNumber(stock.持有單位) }}</td>
        <td :class="['calculated', { 'price-failed': getPriceStatus(stock.代號).failed }]">
          {{ formatDecimal(stock.最新價格) }}
          <span v-if="getPriceStatus(stock.代號).loading" class="spinner"></span>
        </td>
        <td :class="['calculated', getColorClass(stock.損益百分比)]">{{ formatPercent(stock.損益百分比) }}</td>
        <td class="text-right calculated">{{ formatNumber(stock.台幣資產) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(stock.台幣資產)) }}</td>
        <td>{{ formatDecimal(stock.票面利率) }}</td>
        <td class="calculated">{{ formatPercent(stock.年殖利率) }}</td>
        <td class="text-right calculated">{{ formatNumber(stock.每年利息) }}</td>
        <td>{{ stock.配息日 }}</td>
        <td class="calculated">{{ stock.剩餘天配息 }}</td>
        <td class="text-right calculated">{{ formatNumber(stock.下次配息) }}</td>
        <td>{{ stock.到期日 }}</td>
        <td class="calculated">{{ getRemainingYears(stock.到期日) }}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="sub-total">
        <td colspan="6">小計</td>
        <td class="text-right calculated">{{ formatNumber(subtotal.台幣資產) }}</td>
        <td class="calculated">{{ formatPercent(getPercentage(subtotal.台幣資產)) }}</td>
        <td colspan="2"></td>
        <td class="text-right calculated">{{ formatNumber(subtotal.每年利息) }}</td>
        <td colspan="5"></td>
      </tr>
    </tfoot>
  </table>

  <div class="maintain-rate-section">
    <span class="maintain-rate-box highlight-green clickable" @click="showModal = true">
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
    title="海外債券整戶維持率"
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
  }
})

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
  // 解析到期日 (格式: YYYY/MM/DD)
  const [year, month, day] = maturityDate.split('/').map(Number)
  const maturity = new Date(year, month - 1, day)
  const today = new Date()
  const diffMs = maturity - today
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25)
  return diffYears > 0 ? diffYears.toFixed(1) : '0.0'
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
