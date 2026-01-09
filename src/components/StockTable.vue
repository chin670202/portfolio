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
        <th >最新價格</th>
        <th >損益(%)</th>
        <th >台幣資產</th>
        <th>票面利率</th>
        <th >年殖利率</th>
        <th >每年利息</th>
        <th>配息日</th>
        <th >剩餘天配息</th>
        <th >下次配息</th>
        <th>質押單位</th>
        <th >已質押資產</th>
        <th>到期日</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(stock, index) in stocks" :key="index">
        <td class="text-left">{{ stock.公司名稱 }}</td>
        <td>{{ stock.代號 }}</td>
        <td>{{ formatDecimal(stock.買入價格) }}</td>
        <td>{{ formatNumber(stock.持有單位) }}</td>
        <td class="calculated">{{ formatDecimal(stock.最新價格) }}</td>
        <td :class="['calculated', getColorClass(stock.損益百分比)]">{{ formatPercent(stock.損益百分比) }}</td>
        <td class="text-right calculated">{{ formatNumber(stock.台幣資產) }}</td>
        <td>{{ formatDecimal(stock.票面利率) }}</td>
        <td class="calculated">{{ formatPercent(stock.年殖利率) }}</td>
        <td class="text-right calculated">{{ formatNumber(stock.每年利息) }}</td>
        <td>{{ stock.配息日 }}</td>
        <td class="calculated">{{ stock.剩餘天配息 }}</td>
        <td class="text-right calculated">{{ formatNumber(stock.下次配息) }}</td>
        <td>{{ formatNumber(stock.質押單位) }}</td>
        <td class="text-right calculated">{{ formatNumber(stock.已質押資產) }}</td>
        <td>{{ stock.到期日 }}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="sub-total">
        <td colspan="6">小計</td>
        <td class="text-right calculated">{{ formatNumber(subtotal.台幣資產) }}</td>
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
  }
})

const showModal = ref(false)

const modalValues = computed(() => [
  { name: '已質押資產', value: formatNumber(props.subtotal.已質押資產) },
  { name: '金交債質貸', value: formatNumber(props.loanDetails.金交債質貸 || 0) },
  { name: '金交債質貸款', value: formatNumber(props.loanDetails.金交債質貸款 || 0) },
  { name: '貸款餘額合計', value: formatNumber((props.loanDetails.金交債質貸 || 0) + (props.loanDetails.金交債質貸款 || 0)) }
])

const resultFormula = computed(() => {
  const totalLoan = (props.loanDetails.金交債質貸 || 0) + (props.loanDetails.金交債質貸款 || 0)
  return `${formatNumber(props.subtotal.已質押資產)} ÷ ${formatNumber(totalLoan)} × 100%`
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

