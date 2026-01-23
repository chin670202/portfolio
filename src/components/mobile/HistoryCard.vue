<script setup>
/**
 * 資產變化記錄卡片（手機版）
 * 顯示單筆歷史記錄的關鍵資訊
 */

defineProps({
  record: {
    type: Object,
    required: true
  }
})

// 格式化數字（萬元顯示，帶單位）- 用於已經是萬的值
function formatWan(value) {
  if (value === undefined || value === null) return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return num.toLocaleString() + '萬'
}

// 格式化大數字為萬元（自動轉換）
function formatToWan(value) {
  if (value === undefined || value === null) return '--'
  const num = parseFloat(value)
  if (isNaN(num)) return value
  const wan = Math.round(num / 10000)
  return wan.toLocaleString() + '萬'
}

// 取得淨值顏色
function getNetValueClass(value) {
  const num = parseFloat(value)
  if (num > 0) return 'positive'
  if (num < 0) return 'negative'
  return ''
}
</script>

<template>
  <div class="history-card">
    <!-- 日期標題 -->
    <div class="card-header">
      <span class="record-date">{{ record.記錄時間 }}</span>
      <span class="exchange-rate">匯率 {{ record.美元匯率 }}</span>
    </div>

    <!-- 主要數據 -->
    <div class="card-body">
      <div class="data-row">
        <span class="label">部位總額</span>
        <span class="value">{{ formatToWan(record.部位總額) }}</span>
      </div>
      <div class="data-row">
        <span class="label">負債總額</span>
        <span class="value debt">{{ formatToWan(record.負債總額) }}</span>
      </div>
      <div class="data-row highlight">
        <span class="label">當時資產淨值</span>
        <span class="value" :class="getNetValueClass(record.當時匯率資產總和萬)">
          {{ formatWan(record.當時匯率資產總和萬) }}
        </span>
      </div>
      <div class="data-row">
        <span class="label">還原匯率30淨值</span>
        <span class="value" :class="getNetValueClass(record.還原匯率30資產總額萬)">
          {{ formatWan(record.還原匯率30資產總額萬) }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 10px;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #4472c4;
  color: white;
}

.record-date {
  font-size: 14px;
  font-weight: 600;
}

.exchange-rate {
  font-size: 12px;
  opacity: 0.9;
}

.card-body {
  padding: 8px 12px 12px;
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed #f0f0f0;
}

.data-row:last-child {
  border-bottom: none;
}

.data-row.highlight {
  background: #fffbeb;
  margin: 4px -12px;
  padding: 8px 12px;
  border-bottom: none;
}

.label {
  font-size: 13px;
  color: #6b7280;
  flex-shrink: 0;
}

.value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  text-align: right;
}

.value.debt {
  color: #dc2626;
}

.value.positive {
  color: #10b981;
}

.value.negative {
  color: #ef4444;
}
</style>
