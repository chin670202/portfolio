<script setup>
/**
 * 資產變化記錄與趨勢圖模組
 * UID: asset-history
 * 顯示資產變化歷史記錄與趨勢圖表
 * 支援桌面版（表格）和手機版（卡片）
 */
import AssetHistoryTable from '../components/AssetHistoryTable.vue'
import AssetHistoryChart from '../components/AssetHistoryChart.vue'
import HistoryCard from '../components/mobile/HistoryCard.vue'
import { useResponsive } from '../composables/useResponsive'

const { isMobile } = useResponsive()

defineProps({
  config: {
    type: Object,
    required: true
  },
  // 資產變化記錄
  assetHistoryRecords: {
    type: Array,
    required: true
  }
})
</script>

<template>
  <div class="module asset-history-module" :data-module-uid="config.uid">
    <!-- 桌面版：表格 -->
    <template v-if="!isMobile">
      <AssetHistoryTable
        v-if="config.options?.showTable !== false"
        :records="assetHistoryRecords"
        :column-config="config.columns"
      />
    </template>

    <!-- 手機版：卡片列表 -->
    <template v-else>
      <div class="mobile-section-header">
        <span class="section-icon">&#128200;</span>
        <span class="section-title">資產變化記錄</span>
      </div>
      <div class="mobile-card-list">
        <HistoryCard
          v-for="(record, index) in assetHistoryRecords"
          :key="index"
          :record="record"
        />
      </div>
    </template>

    <!-- 資產變化趨勢圖（兩個版本都顯示） -->
    <AssetHistoryChart
      v-if="config.options?.showChart !== false"
      :records="assetHistoryRecords"
    />
  </div>
</template>

<style scoped>
.module {
  margin-bottom: 20px;
}

.mobile-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0 8px;
  border-bottom: 2px solid #4472c4;
  margin-bottom: 12px;
}

.section-icon {
  font-size: 18px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #4472c4;
}

.mobile-card-list {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}
</style>
