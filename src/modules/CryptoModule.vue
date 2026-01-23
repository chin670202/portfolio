<script setup>
/**
 * 加密貨幣模組
 * UID: crypto
 * 顯示加密貨幣持倉，包含價格、損益資訊
 * 支援桌面版（表格）和手機版（卡片）
 */
import CryptoTable from '../components/CryptoTable.vue'
import AssetCard from '../components/mobile/AssetCard.vue'
import SummaryCard from '../components/mobile/SummaryCard.vue'
import { useResponsive } from '../composables/useResponsive'
import { cryptoCardConfig } from '../components/mobile/cardConfigs'

const { isMobile } = useResponsive()

const props = defineProps({
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

// 檢查價格是否載入中
function isPriceLoading(symbol) {
  return props.priceStatus[symbol]?.loading
}

// 檢查價格是否失敗
function isPriceFailed(symbol) {
  return props.priceStatus[symbol]?.failed
}
</script>

<template>
  <div class="module crypto-module" :data-module-uid="config.uid">
    <!-- 桌面版：表格 -->
    <CryptoTable
      v-if="!isMobile"
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

    <!-- 手機版：卡片列表 -->
    <div v-else class="mobile-card-list">
      <AssetCard
        v-for="crypto in calculatedCryptos"
        :key="crypto.代號"
        :item="crypto"
        :config="cryptoCardConfig"
        :price-loading="isPriceLoading(crypto.代號)"
        :price-failed="isPriceFailed(crypto.代號)"
        :news-count="getNewsCount(crypto.代號)"
        :highlight="highlightSymbol === crypto.代號"
        @open-news="handleOpenNews"
      />

      <!-- 小計卡片 -->
      <SummaryCard
        title="加密貨幣小計"
        :data="cryptoSubtotal"
        :total-assets="totalAssets"
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
