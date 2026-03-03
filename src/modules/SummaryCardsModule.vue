<script setup>
/**
 * 摘要卡片模組
 * UID: summary-cards
 * 顯示關鍵財務指標的卡片式摘要
 */
import { computed } from 'vue'
import { formatNumber, formatWan } from '../utils/format'

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  // 匯率資料
  exchangeRate: {
    type: Object,
    default: () => ({})
  },
  // 總計資料
  grandTotal: {
    type: Object,
    default: () => ({ 台幣資產: 0, 每年利息: 0 })
  },
  // 貸款總計
  loanTotal: {
    type: Object,
    default: () => ({ 貸款餘額: 0, 每年利息: 0 })
  },
  // 全年淨收入
  netIncome: {
    type: Number,
    default: 0
  },
  // 是否正在更新
  updating: {
    type: Boolean,
    default: false
  }
})

// 預設顯示的欄位（全部顯示，與用戶截圖順序一致）
const defaultColumns = [
  { key: 'usdRate', label: '美元匯率', visible: true, order: 1 },
  { key: 'totalAssets', label: '台幣市值', visible: true, order: 2 },
  { key: 'totalLiability', label: '台幣負債', visible: true, order: 3 },
  { key: 'netWorth', label: '台幣淨值', visible: true, order: 4 },
  { key: 'annualInterestIncome', label: '每年收息', visible: true, order: 5 },
  { key: 'annualInterestExpense', label: '每年付息', visible: true, order: 6 },
  { key: 'annualIncome', label: '全年淨收', visible: true, order: 7 }
]

// 標籤對應表
const labelMap = {
  usdRate: '美元匯率',
  totalAssets: '台幣市值',
  totalLiability: '台幣負債',
  netWorth: '台幣淨值',
  annualInterestIncome: '每年收息',
  annualInterestExpense: '每年付息',
  annualIncome: '全年淨收'
}

// 取得啟用的欄位（支援 visible 和舊版 enabled 格式）
const enabledColumns = computed(() => {
  const configColumns = props.config.columns || defaultColumns
  return configColumns
    .filter(col => col.visible ?? col.enabled ?? true)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(col => ({
      ...col,
      label: col.label || labelMap[col.key] || col.key
    }))
})

// 計算各指標的值和樣式
const cardData = computed(() => {
  const usdRate = props.exchangeRate?.美元匯率 || 0
  const totalAssets = props.grandTotal?.台幣資產 || 0
  const totalLiability = props.loanTotal?.貸款餘額 || 0
  const netWorth = totalAssets - totalLiability
  const annualInterestIncome = props.grandTotal?.每年利息 || 0
  const annualInterestExpense = props.loanTotal?.每年利息 || 0
  const annualIncome = props.netIncome || 0

  return {
    usdRate: {
      value: usdRate,
      displayValue: usdRate.toFixed(3),
      color: 'green',
      tooltip: `美元匯率: ${usdRate}`
    },
    totalAssets: {
      value: totalAssets,
      displayValue: formatWan(totalAssets),
      color: 'blue',
      tooltip: `台幣市值: ${formatNumber(totalAssets)} 元`
    },
    totalLiability: {
      value: totalLiability,
      displayValue: formatWan(totalLiability),
      color: 'red',
      tooltip: `台幣負債: ${formatNumber(totalLiability)} 元`
    },
    netWorth: {
      value: netWorth,
      displayValue: formatWan(netWorth),
      color: 'teal',
      tooltip: `台幣淨值: ${formatNumber(netWorth)} 元`
    },
    annualInterestIncome: {
      value: annualInterestIncome,
      displayValue: formatWan(annualInterestIncome),
      color: 'orange',
      tooltip: `每年收息: ${formatNumber(annualInterestIncome)} 元`
    },
    annualInterestExpense: {
      value: annualInterestExpense,
      displayValue: formatWan(annualInterestExpense),
      color: 'pink',
      tooltip: `每年付息: ${formatNumber(annualInterestExpense)} 元`
    },
    annualIncome: {
      value: annualIncome,
      displayValue: formatWan(annualIncome),
      color: 'purple',
      tooltip: `全年淨收: ${formatNumber(annualIncome)} 元`
    }
  }
})

// 取得卡片的標籤和資料
function getCardInfo(column) {
  const data = cardData.value[column.key]
  return {
    label: column.label,
    value: data?.displayValue || '--',
    color: data?.color || 'blue',
    tooltip: data?.tooltip || ''
  }
}
</script>

<template>
  <div class="summary-cards-module" :data-module-uid="config.uid">
    <div class="cards-container">
      <div
        v-for="column in enabledColumns"
        :key="column.key"
        class="summary-card"
        :class="[`card-${getCardInfo(column).color}`]"
        :title="getCardInfo(column).tooltip"
      >
        <div class="card-label">{{ getCardInfo(column).label }}</div>
        <div class="card-value">
          <template v-if="updating && column.key !== 'usdRate'">
            --
            <span class="card-spinner"></span>
          </template>
          <template v-else>
            {{ getCardInfo(column).value }}
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-cards-module {
  margin-bottom: 20px;
}

.cards-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.summary-card {
  flex: 1;
  min-width: 140px;
  max-width: 200px;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: default;
  background: white;
  border: 1px solid #e5e7eb;
  transition: box-shadow 0.2s;
}

.summary-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.card-label {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  color: #6b7280;
}

.card-value {
  font-size: 22px;
  font-weight: 700;
  color: #18181b;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 顏色主題 - 底部色條 */
.card-green {
  border-bottom: 3px solid #16a34a;
}

.card-blue {
  border-bottom: 3px solid #2563eb;
}

.card-orange {
  border-bottom: 3px solid #d97706;
}

.card-red {
  border-bottom: 3px solid #dc2626;
}

.card-teal {
  border-bottom: 3px solid #0d9488;
}

.card-pink {
  border-bottom: 3px solid #db2777;
}

.card-purple {
  border-bottom: 3px solid #7c3aed;
}

/* Loading spinner */
.card-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #6b7280;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 響應式 */
@media (max-width: 768px) {
  .summary-card {
    min-width: 120px;
    padding: 12px 16px;
  }

  .card-value {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .cards-container {
    gap: 8px;
  }

  .summary-card {
    min-width: 100px;
    flex: 1 1 calc(50% - 4px);
    max-width: none;
  }

  .card-label {
    font-size: 12px;
  }

  .card-value {
    font-size: 18px;
  }
}
</style>
