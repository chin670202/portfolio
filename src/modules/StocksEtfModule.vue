<script setup>
/**
 * 股票/ETF 模組
 * UID: stocks-etf
 * 顯示股票與 ETF 持倉，包含價格、損益、配息資訊
 */
import EtfTable from '../components/EtfTable.vue'

defineProps({
  config: {
    type: Object,
    required: true
  },
  // 計算後的 ETF 資料
  calculatedEtfs: {
    type: Array,
    required: true
  },
  // ETF 小計
  etfSubtotal: {
    type: Object,
    required: true
  },
  // 貸款詳情（用於維持率計算）
  etfLoanDetails: {
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
  <div class="module stocks-etf-module" :data-module-uid="config.uid">
    <EtfTable
      :etfs="calculatedEtfs"
      :subtotal="etfSubtotal"
      :loan-details="etfLoanDetails"
      :price-status="priceStatus"
      :total-assets="totalAssets"
      :news-data="newsData"
      :get-news-count="getNewsCount"
      :is-news-loading="isNewsLoading"
      :highlight-symbol="highlightSymbol"
      @open-news="handleOpenNews"
    />
  </div>
</template>

<style scoped>
.module {
  margin-bottom: 20px;
}
</style>
