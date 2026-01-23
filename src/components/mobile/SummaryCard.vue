<script setup>
/**
 * 小計/總計卡片元件（手機版）
 * 顯示各類資產的小計資訊
 */
import { formatNumber, formatCurrency } from './cardConfigs.js'

defineProps({
  // 標題（如：海外債券小計、台股小計）
  title: {
    type: String,
    required: true
  },
  // 小計資料
  data: {
    type: Object,
    required: true
  },
  // 總資產（用於計算佔比）
  totalAssets: {
    type: Number,
    default: 0
  },
  // 是否顯示維持率
  showMaintenanceRatio: {
    type: Boolean,
    default: false
  },
  // 維持率資訊
  maintenanceInfo: {
    type: Object,
    default: null
  },
  // 是否為負債類型（貸款）
  isDebt: {
    type: Boolean,
    default: false
  }
})

// 計算佔比
function getRatio(assets, total) {
  if (!total || total === 0) return '--'
  return ((assets / total) * 100).toFixed(1) + '%'
}

// 取得維持率樣式類別
function getMaintenanceClass(ratio, info) {
  if (!info) return ''
  if (ratio <= info.追繳維持率百分比) return 'maint-danger'
  if (ratio <= info.預警維持率百分比) return 'maint-warning'
  return 'maint-safe'
}
</script>

<template>
  <div class="summary-card" :class="{ debt: isDebt }">
    <div class="summary-header">
      <span class="summary-icon">&#128202;</span>
      <span class="summary-title">{{ title }}</span>
    </div>

    <div class="summary-content">
      <!-- 台幣資產/貸款餘額 -->
      <div class="summary-row main">
        <span class="label">{{ isDebt ? '貸款餘額' : '台幣資產' }}</span>
        <span class="value">{{ formatCurrency(isDebt ? data.貸款餘額 : data.台幣資產) }}</span>
      </div>

      <!-- 佔比（非貸款） -->
      <div v-if="!isDebt && totalAssets" class="summary-row">
        <span class="label">佔比</span>
        <span class="value">{{ getRatio(data.台幣資產, totalAssets) }}</span>
      </div>

      <!-- 每年利息 -->
      <div v-if="data.每年利息 !== undefined" class="summary-row">
        <span class="label">每年利息</span>
        <span class="value" :class="{ 'text-red': isDebt }">{{ formatCurrency(data.每年利息) }}</span>
      </div>

      <!-- 月繳金額（貸款） -->
      <div v-if="data.月繳金額 !== undefined" class="summary-row">
        <span class="label">月繳金額</span>
        <span class="value">{{ formatCurrency(data.月繳金額) }}</span>
      </div>

      <!-- 台幣損益（其他資產） -->
      <div v-if="data.台幣損益 !== undefined" class="summary-row">
        <span class="label">台幣損益</span>
        <span class="value" :class="data.台幣損益 >= 0 ? 'profit-positive' : 'profit-negative'">
          {{ formatCurrency(data.台幣損益) }}
        </span>
      </div>
    </div>

    <!-- 維持率資訊 -->
    <div v-if="showMaintenanceRatio && maintenanceInfo" class="maintenance-info">
      <div class="maintenance-row">
        <span class="maint-label">維持率</span>
        <span class="maint-value" :class="getMaintenanceClass(maintenanceInfo.整戶維持率百分比, maintenanceInfo)">
          {{ formatNumber(maintenanceInfo.整戶維持率百分比, 1) }}%
        </span>
        <span class="maint-thresholds">
          (預警 {{ maintenanceInfo.預警維持率百分比 }}% / 追繳 {{ maintenanceInfo.追繳維持率百分比 }}%)
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-card {
  background: #f0f9ff;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid #bae6fd;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.summary-card.debt {
  background: #fef2f2;
  border-color: #fecaca;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.summary-icon {
  font-size: 16px;
}

.summary-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e40af;
}

.summary-card.debt .summary-title {
  color: #991b1b;
}

.summary-content {
  padding: 8px 12px 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.summary-row.main {
  padding-bottom: 8px;
  margin-bottom: 4px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.1);
}

.label {
  font-size: 13px;
  color: #4b5563;
}

.value {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.summary-row.main .value {
  font-size: 16px;
}

.text-red {
  color: #dc2626;
}

.profit-positive {
  color: #10b981;
}

.profit-negative {
  color: #ef4444;
}

/* 維持率 */
.maintenance-info {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.5);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.maintenance-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.maint-label {
  font-size: 12px;
  color: #6b7280;
}

.maint-value {
  font-size: 14px;
  font-weight: 600;
}

.maint-safe {
  color: #10b981;
}

.maint-warning {
  color: #f59e0b;
}

.maint-danger {
  color: #ef4444;
}

.maint-thresholds {
  font-size: 11px;
  color: #9ca3af;
}
</style>
