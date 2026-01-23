<script setup>
/**
 * 通用資產卡片元件（手機版）
 * 根據傳入的 config 顯示不同類型資產
 */
import { computed } from 'vue'

const props = defineProps({
  // 資產資料
  item: {
    type: Object,
    required: true
  },
  // 卡片配置
  config: {
    type: Object,
    required: true
  },
  // 價格載入狀態
  priceLoading: {
    type: Boolean,
    default: false
  },
  // 價格載入失敗
  priceFailed: {
    type: Boolean,
    default: false
  },
  // 新聞數量
  newsCount: {
    type: Number,
    default: 0
  },
  // 是否高亮
  highlight: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['open-news'])

// 計算損益顏色
const profitClass = computed(() => {
  const change = props.config.price?.change?.(props.item)
  if (change > 0) return 'profit-positive'
  if (change < 0) return 'profit-negative'
  return ''
})

// 格式化損益百分比
const formattedChange = computed(() => {
  const change = props.config.price?.change?.(props.item)
  if (change === null || change === undefined || isNaN(change)) return ''
  const sign = change > 0 ? '+' : ''
  const arrow = change > 0 ? '\u25B2' : change < 0 ? '\u25BC' : ''
  return `${arrow} ${sign}${change.toFixed(2)}%`
})

// 判斷詳細資訊是否顯示
function shouldShowDetail(detail) {
  if (detail.hide && detail.hide(props.item)) return false
  return true
}

// 判斷值是否為損益類型
function getDetailClass(detail) {
  if (!detail.isProfit) return ''
  const val = props.item.台幣損益
  if (val > 0) return 'profit-positive'
  if (val < 0) return 'profit-negative'
  return ''
}

function handleNewsClick() {
  const symbol = props.item.代號
  const name = props.item.公司名稱 || props.item.名稱
  emit('open-news', symbol, name)
}
</script>

<template>
  <div class="asset-card" :class="{ highlight }">
    <!-- 卡片頭部：名稱、代號、標籤、新聞 -->
    <div class="card-header">
      <div class="header-main">
        <div class="title">{{ config.primary.title(item) }}</div>
        <div class="subtitle-row">
          <span class="subtitle">{{ config.primary.subtitle?.(item) }}</span>
          <span v-if="config.primary.tag" class="tag">{{ config.primary.tag }}</span>
        </div>
      </div>
      <button
        v-if="newsCount > 0"
        class="news-btn"
        @click="handleNewsClick"
      >
        <span class="news-icon">&#128240;</span>
        <span class="news-count">{{ newsCount }}</span>
      </button>
    </div>

    <!-- 持倉與價格資訊（非貸款類型才顯示） -->
    <div v-if="config.position" class="card-position">
      <div class="position-info">
        <span class="position-label">{{ config.position.label }}</span>
        <span class="position-value">{{ config.position.value(item) }}</span>
        <span class="position-sub">{{ config.position.subValue(item) }}</span>
      </div>
      <div class="price-info">
        <span class="price-label">{{ config.price.label }}</span>
        <span class="price-value" :class="{ loading: priceLoading, failed: priceFailed }">
          <span v-if="priceLoading" class="spinner"></span>
          <template v-else>{{ config.price.value(item) }}</template>
        </span>
        <span class="price-change" :class="profitClass">{{ formattedChange }}</span>
      </div>
    </div>

    <!-- 詳細資訊 -->
    <div class="card-details">
      <template v-for="(detail, index) in config.details" :key="index">
        <div v-if="shouldShowDetail(detail)" class="detail-row">
          <span class="detail-label">{{ detail.label }}</span>
          <span class="detail-value" :class="getDetailClass(detail)">
            {{ detail.value(item) }}
            <span v-if="detail.extra?.(item)" class="detail-extra">{{ detail.extra(item) }}</span>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.asset-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 12px;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.asset-card.highlight {
  box-shadow: 0 0 0 2px #3b82f6;
}

/* 頭部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 12px 8px;
  border-bottom: 1px solid #f0f0f0;
  gap: 8px;
  max-width: 100%;
  overflow: hidden;
}

.header-main {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.subtitle-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.subtitle {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

.tag {
  font-size: 10px;
  padding: 1px 6px;
  background: #e5e7eb;
  color: #4b5563;
  border-radius: 4px;
}

.news-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background: #fef3c7;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.news-icon {
  font-size: 14px;
}

.news-count {
  color: #92400e;
  font-weight: 600;
}

/* 持倉與價格 */
.card-position {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f9fafb;
  gap: 8px;
  max-width: 100%;
  overflow: hidden;
}

.position-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.price-info {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  text-align: right;
  align-items: flex-end;
  max-width: 45%;
}

.position-label,
.price-label {
  font-size: 11px;
  color: #9ca3af;
  white-space: nowrap;
}

.position-value,
.price-value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.position-sub {
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.price-value.loading {
  color: #9ca3af;
}

.price-value.failed {
  color: #ef4444;
}

.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.price-change {
  font-size: 12px;
  font-weight: 500;
}

.profit-positive {
  color: #10b981;
}

.profit-negative {
  color: #ef4444;
}

/* 詳細資訊 */
.card-details {
  padding: 8px 12px 12px;
  max-width: 100%;
  overflow: hidden;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  gap: 8px;
  max-width: 100%;
  overflow: hidden;
}

.detail-row:not(:last-child) {
  border-bottom: 1px dashed #f0f0f0;
}

.detail-label {
  font-size: 13px;
  color: #6b7280;
  flex-shrink: 0;
  white-space: nowrap;
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  text-align: right;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-extra {
  font-size: 11px;
  color: #9ca3af;
  margin-left: 4px;
  flex-shrink: 0;
}
</style>
