<script setup>
/**
 * 貸款別模組
 * UID: loans
 * 顯示各項貸款資訊，包含餘額、利率、每月還款
 */
import LoanTable from '../../../components/LoanTable.vue'

defineProps({
  config: {
    type: Object,
    required: true
  },
  // 計算後的貸款資料
  calculatedLoans: {
    type: Array,
    required: true
  },
  // 貸款總計
  loanTotal: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div class="module loans-module" :data-module-uid="config.uid">
    <LoanTable
      :loans="calculatedLoans"
      :total="loanTotal"
      :column-config="config.columns"
    />
  </div>
</template>

<style scoped>
.module {
  margin-bottom: 20px;
}
</style>
