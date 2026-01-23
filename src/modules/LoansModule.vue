<script setup>
/**
 * 貸款別模組
 * UID: loans
 * 顯示各項貸款資訊，包含餘額、利率、每月還款
 * 支援桌面版（表格）和手機版（卡片）
 */
import LoanTable from '../components/LoanTable.vue'
import AssetCard from '../components/mobile/AssetCard.vue'
import SummaryCard from '../components/mobile/SummaryCard.vue'
import { useResponsive } from '../composables/useResponsive'
import { loansCardConfig } from '../components/mobile/cardConfigs'

const { isMobile } = useResponsive()

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
    <!-- 桌面版：表格 -->
    <LoanTable
      v-if="!isMobile"
      :loans="calculatedLoans"
      :total="loanTotal"
      :column-config="config.columns"
    />

    <!-- 手機版：卡片列表 -->
    <div v-else class="mobile-card-list">
      <AssetCard
        v-for="loan in calculatedLoans"
        :key="loan.貸款別"
        :item="loan"
        :config="loansCardConfig"
      />

      <!-- 總計卡片 -->
      <SummaryCard
        title="貸款總計"
        :data="loanTotal"
        :is-debt="true"
      />
    </div>
  </div>
</template>

<style scoped>
.module {
  margin-bottom: 20px;
}

.mobile-card-list {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}
</style>
