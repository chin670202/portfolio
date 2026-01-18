<script setup>
/**
 * 海外債券模組
 * UID: overseas-bonds
 * 顯示海外債券持倉，包含價格、殖利率、配息資訊
 */
import StockTable from '../components/StockTable.vue'

defineProps({
  config: {
    type: Object,
    required: true
  },
  // 計算後的債券資料
  calculatedBonds: {
    type: Array,
    required: true
  },
  // 債券小計
  bondSubtotal: {
    type: Object,
    required: true
  },
  // 貸款詳情（用於維持率計算）
  bondLoanDetails: {
    type: Array,
    default: () => []
  },
  // 價格狀態
  priceStatus: {
    type: Object,
    default: () => ({})
  },
  // 總資產（用於計算佔比）
  totalAssets: {
    type: Number,
    default: 0
  },
  // 新聞資料
  newsData: {
    type: Object,
    default: () => ({})
  },
  // 新聞相關方法
  getNewsCount: {
    type: Function,
    default: () => 0
  },
  isNewsLoading: {
    type: Function,
    default: () => false
  },
  // 高亮代號
  highlightSymbol: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['open-news'])

function handleOpenNews(symbol, name) {
  emit('open-news', symbol, name)
}
</script>

<template>
  <div class="module overseas-bonds-module" :data-module-uid="config.uid">
    <StockTable
      :stocks="calculatedBonds"
      :subtotal="bondSubtotal"
      :loan-details="bondLoanDetails"
      :price-status="priceStatus"
      :total-assets="totalAssets"
      :news-data="newsData"
      :get-news-count="getNewsCount"
      :is-news-loading="isNewsLoading"
      :highlight-symbol="highlightSymbol"
      :column-config="config.columns"
      @open-news="handleOpenNews"
    />
  </div>
</template>

<style scoped>
.module {
  margin-bottom: 20px;
}
</style>
