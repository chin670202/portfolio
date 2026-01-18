<script setup>
/**
 * 無配息資產模組
 * UID: other-assets
 * 顯示美股、台股、加密貨幣等無固定配息資產
 */
import OtherAssetsTable from '../components/OtherAssetsTable.vue'

defineProps({
  config: {
    type: Object,
    required: true
  },
  // 計算後的其它資產資料
  calculatedOtherAssets: {
    type: Array,
    required: true
  },
  // 其它資產小計
  otherAssetSubtotal: {
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
  <div class="module other-assets-module" :data-module-uid="config.uid">
    <OtherAssetsTable
      :assets="calculatedOtherAssets"
      :subtotal="otherAssetSubtotal"
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
