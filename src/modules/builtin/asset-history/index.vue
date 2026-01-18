<script setup>
/**
 * 資產變化記錄與趨勢圖模組
 * UID: asset-history
 * 顯示資產變化歷史記錄與趨勢圖表
 */
import AssetHistoryTable from '../../../components/AssetHistoryTable.vue'
import AssetHistoryChart from '../../../components/AssetHistoryChart.vue'

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
    <!-- 資產變化記錄表格 -->
    <AssetHistoryTable
      v-if="config.options?.showTable !== false"
      :records="assetHistoryRecords"
      :column-config="config.columns"
    />

    <!-- 資產變化趨勢圖 -->
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
</style>
