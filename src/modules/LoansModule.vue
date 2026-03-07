<script setup>
/**
 * 貸款模組
 * UID: loans
 * 顯示各項貸款資訊，包含餘額、利率、每月還款
 */
import LoanTable from '../components/LoanTable.vue'

defineProps({
  config: {
    type: Object,
    required: true
  },
  calculatedLoans: {
    type: Array,
    required: true
  },
  loanTotal: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['loan-add', 'loan-select'])
</script>

<template>
  <div class="module loans-module" :data-module-uid="config.uid">
    <LoanTable
      :loans="calculatedLoans"
      :total="loanTotal"
      :column-config="config.columns"
      @add="emit('loan-add')"
      @select="(loan) => emit('loan-select', loan)"
    />
  </div>
</template>

<style scoped>
.module {
  margin-bottom: 20px;
}
</style>
