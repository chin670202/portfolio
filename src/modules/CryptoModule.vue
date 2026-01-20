<script setup>
/**
 * 加密貨幣模組
 * UID: crypto
 * 顯示加密貨幣持倉，包含價格、損益資訊
 */
import CryptoTable from '../components/CryptoTable.vue'

defineProps({
  config: {
    type: Object,
    required: true
  },
  // 計算後的加密貨幣資料
  calculatedCryptos: {
    type: Array,
    required: true
  },
  // 加密貨幣小計
  cryptoSubtotal: {
    type: Object,
    required: true
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
  <div class="module crypto-module" :data-module-uid="config.uid">
    <CryptoTable
      :cryptos="calculatedCryptos"
      :subtotal="cryptoSubtotal"
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
