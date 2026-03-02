<script setup>
/**
 * 股票模組
 * UID: stocks
 * 顯示台股與美股持倉，包含價格、損益、配息資訊
 * 支援桌面版（表格）和手機版（卡片）
 */
import StocksTable from '../components/StocksTable.vue'
import AssetCard from '../components/mobile/AssetCard.vue'
import SummaryCard from '../components/mobile/SummaryCard.vue'
import { useResponsive } from '../composables/useResponsive'
import { twStocksCardConfig, usStocksCardConfig } from '../components/mobile/cardConfigs'

const { isMobile } = useResponsive()

const props = defineProps({
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
  },
  // 累計配息資料
  dividendData: {
    type: Object,
    default: () => ({})
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

// 是否有維持率資訊（台股）
function hasTwMaintenanceRatio() {
  return props.stockLoanDetails && props.stockLoanDetails.length > 0
}
</script>

<template>
  <div class="module stocks-module" :data-module-uid="config.uid">
    <!-- 桌面版：表格 -->
    <StocksTable
      v-if="!isMobile"
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
      :dividend-data="dividendData"
      @open-news="handleOpenNews"
    />

    <!-- 手機版：卡片列表 -->
    <div v-else class="mobile-card-list">
      <!-- 台股區塊 -->
      <template v-if="calculatedTwStocks.length > 0">
        <div class="section-header">台股</div>
        <AssetCard
          v-for="stock in calculatedTwStocks"
          :key="stock.代號"
          :item="stock"
          :config="twStocksCardConfig"
          :price-loading="isPriceLoading(stock.代號)"
          :price-failed="isPriceFailed(stock.代號)"
          :news-count="getNewsCount(stock.代號)"
          :highlight="highlightSymbol === stock.代號"
          @open-news="handleOpenNews"
        />
        <SummaryCard
          title="台股小計"
          :data="twStockSubtotal"
          :total-assets="totalAssets"
          :show-maintenance-ratio="hasTwMaintenanceRatio()"
          :maintenance-info="twStockSubtotal"
        />
      </template>

      <!-- 美股區塊 -->
      <template v-if="calculatedUsStocks.length > 0">
        <div class="section-header">美股</div>
        <AssetCard
          v-for="stock in calculatedUsStocks"
          :key="stock.代號"
          :item="stock"
          :config="usStocksCardConfig"
          :price-loading="isPriceLoading(stock.代號)"
          :price-failed="isPriceFailed(stock.代號)"
          :news-count="getNewsCount(stock.代號)"
          :highlight="highlightSymbol === stock.代號"
          @open-news="handleOpenNews"
        />
        <SummaryCard
          title="美股小計"
          :data="usStockSubtotal"
          :total-assets="totalAssets"
        />
      </template>

      <!-- 股票總計 -->
      <SummaryCard
        v-if="calculatedTwStocks.length > 0 && calculatedUsStocks.length > 0"
        title="股票總計"
        :data="stockSubtotal"
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

.section-header {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  padding: 12px 8px 8px;
  margin-top: 8px;
}

.section-header:first-child {
  margin-top: 0;
}
</style>
