<script setup>
/**
 * 海外債券模組
 * UID: overseas-bonds
 * 顯示海外債券持倉，包含價格、殖利率、配息資訊
 * 支援桌面版（表格）和手機版（卡片）
 */
import StockTable from '../components/StockTable.vue'
import AssetCard from '../components/mobile/AssetCard.vue'
import SummaryCard from '../components/mobile/SummaryCard.vue'
import { useResponsive } from '../composables/useResponsive'
import { bondsCardConfig } from '../components/mobile/cardConfigs'

const { isMobile } = useResponsive()

const props = defineProps({
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

// 是否有維持率資訊
function hasMaintenanceRatio() {
  return props.bondLoanDetails && props.bondLoanDetails.length > 0
}
</script>

<template>
  <div class="module overseas-bonds-module" :data-module-uid="config.uid">
    <!-- 桌面版：表格 -->
    <StockTable
      v-if="!isMobile"
      :stocks="calculatedBonds"
      :subtotal="bondSubtotal"
      :loan-details="bondLoanDetails"
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
        v-for="bond in calculatedBonds"
        :key="bond.代號"
        :item="bond"
        :config="bondsCardConfig"
        :price-loading="isPriceLoading(bond.代號)"
        :price-failed="isPriceFailed(bond.代號)"
        :news-count="getNewsCount(bond.代號)"
        :highlight="highlightSymbol === bond.代號"
        @open-news="handleOpenNews"
      />

      <!-- 小計卡片 -->
      <SummaryCard
        title="海外債券小計"
        :data="bondSubtotal"
        :total-assets="totalAssets"
        :show-maintenance-ratio="hasMaintenanceRatio()"
        :maintenance-info="bondSubtotal"
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
