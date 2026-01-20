<script setup>
/**
 * 股票模組
 * UID: stocks
 * 顯示台股與美股持倉，包含價格、損益、配息資訊
 */
import StocksTable from '../components/StocksTable.vue'

defineProps({
  config: {
    type: Object,
    required: true
  },
  // 計算後的台股資料
  calculatedTwStocks: {
    type: Array,
    required: true
  },
  // 計算後的美股資料
  calculatedUsStocks: {
    type: Array,
    required: true
  },
  // 台股小計
  twStockSubtotal: {
    type: Object,
    required: true
  },
  // 美股小計
  usStockSubtotal: {
    type: Object,
    required: true
  },
  // 股票總小計
  stockSubtotal: {
    type: Object,
    required: true
  },
  // 貸款詳情（用於維持率計算）
  stockLoanDetails: {
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
  isNewsRead: {
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
  <div class="module stocks-module" :data-module-uid="config.uid">
    <StocksTable
      :tw-stocks="calculatedTwStocks"
      :us-stocks="calculatedUsStocks"
      :tw-subtotal="twStockSubtotal"
      :us-subtotal="usStockSubtotal"
      :total-subtotal="stockSubtotal"
      :loan-details="stockLoanDetails"
      :price-status="priceStatus"
      :total-assets="totalAssets"
      :news-data="newsData"
      :get-news-count="getNewsCount"
      :is-news-loading="isNewsLoading"
      :is-news-read="isNewsRead"
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
