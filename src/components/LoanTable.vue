<template>
  <!-- 桌面版 -->
  <table v-if="!isMobile">
    <thead>
      <tr class="section-header">
        <th :colspan="sortedVisibleColumns.length">貸款</th>
      </tr>
      <tr>
        <th v-for="col in sortedVisibleColumns" :key="col.key" :class="getHeaderClass(col.key)">
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(loan, index) in loans" :key="index">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getCellClass(col.key)">
          <template v-if="col.key === 'loanType'">{{ loan.貸款別 }}</template>
          <template v-else-if="col.key === 'remark'">{{ loan.備註 }}</template>
          <template v-else-if="col.key === 'balance'">{{ formatNumber(loan.貸款餘額) }}</template>
          <template v-else-if="col.key === 'rate'">{{ formatPercent(loan.貸款利率) }}</template>
          <template v-else-if="col.key === 'monthlyPayment'">{{ formatNumber(loan.月繳金額) }}</template>
          <template v-else-if="col.key === 'annualInterest'">{{ formatNumber(loan.每年利息) }}</template>
        </td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="grand-total">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getFooterCellClass(col.key)">
          <template v-if="col === sortedVisibleColumns[0]">總計</template>
          <template v-else-if="col.key === 'remark'"></template>
          <template v-else-if="col.key === 'balance'">{{ formatNumber(total.貸款餘額) }}</template>
          <template v-else-if="col.key === 'rate'"></template>
          <template v-else-if="col.key === 'monthlyPayment'">{{ formatNumber(total.月繳金額) }}</template>
          <template v-else-if="col.key === 'annualInterest'">{{ formatNumber(total.每年利息) }}</template>
        </td>
      </tr>
    </tfoot>
  </table>

  <!-- 手機版：貸款名稱獨立一列 -->
  <table v-else class="mobile-loan-table">
    <thead>
      <tr class="section-header">
        <th :colspan="mobileDataColumns.length">貸款</th>
      </tr>
      <tr>
        <th v-for="col in mobileDataColumns" :key="col.key" :class="getHeaderClass(col.key)">
          {{ col.label }}
        </th>
      </tr>
    </thead>
    <tbody>
      <template v-for="(loan, index) in loans" :key="index">
        <tr class="loan-name-row">
          <td :colspan="mobileDataColumns.length">
            {{ loan.貸款別 }}<span v-if="loan.備註" class="remark-tag"> {{ loan.備註 }}</span>
          </td>
        </tr>
        <tr>
          <td v-for="col in mobileDataColumns" :key="col.key" :class="getCellClass(col.key)">
            <template v-if="col.key === 'balance'">{{ formatNumber(loan.貸款餘額) }}</template>
            <template v-else-if="col.key === 'rate'">{{ formatPercent(loan.貸款利率) }}</template>
            <template v-else-if="col.key === 'monthlyPayment'">{{ formatNumber(loan.月繳金額) }}</template>
            <template v-else-if="col.key === 'annualInterest'">{{ formatNumber(loan.每年利息) }}</template>
          </td>
        </tr>
      </template>
    </tbody>
    <tfoot>
      <tr class="grand-total">
        <td v-for="(col, i) in mobileDataColumns" :key="col.key" :class="getFooterCellClass(col.key)">
          <template v-if="i === 0">總計 {{ formatNumber(total.貸款餘額) }}</template>
          <template v-else-if="col.key === 'balance'">{{ formatNumber(total.貸款餘額) }}</template>
          <template v-else-if="col.key === 'rate'"></template>
          <template v-else-if="col.key === 'monthlyPayment'">{{ formatNumber(total.月繳金額) }}</template>
          <template v-else-if="col.key === 'annualInterest'">{{ formatNumber(total.每年利息) }}</template>
        </td>
      </tr>
    </tfoot>
  </table>
</template>

<script setup>
import { computed } from 'vue'
import { formatNumber, formatPercent } from '../utils/format'
import { useResponsive } from '../composables/useResponsive'

const { isMobile } = useResponsive()

const props = defineProps({
  loans: {
    type: Array,
    required: true
  },
  total: {
    type: Object,
    required: true
  },
  columnConfig: {
    type: Array,
    default: () => []
  }
})

// 欄位定義
const columnDefinitions = {
  loanType: { label: '貸款', defaultOrder: 1 },
  remark: { label: '備註', defaultOrder: 2 },
  balance: { label: '餘額', defaultOrder: 3 },
  rate: { label: '利率', defaultOrder: 4 },
  monthlyPayment: { label: '月繳', defaultOrder: 5 },
  annualInterest: { label: '年息', defaultOrder: 6 }
}

const allColumnKeys = Object.keys(columnDefinitions)

// 排序後的可見欄位
const sortedVisibleColumns = computed(() => {
  // 支援兩種格式：
  // 1. Array 格式（舊）: [{ key, order, visible }]
  // 2. Object 格式（新）: { order: [...], hidden: [...] }

  if (!props.columnConfig ||
      (Array.isArray(props.columnConfig) && props.columnConfig.length === 0) ||
      (typeof props.columnConfig === 'object' && !Array.isArray(props.columnConfig) && !props.columnConfig.order)) {
    // 沒有配置，使用預設順序，全部顯示
    return allColumnKeys.map(key => ({
      key,
      label: columnDefinitions[key].label,
      order: columnDefinitions[key].defaultOrder
    })).sort((a, b) => a.order - b.order)
  }

  // 新格式：{ order: [], hidden: [] }
  if (typeof props.columnConfig === 'object' && !Array.isArray(props.columnConfig)) {
    const { order = [], hidden = [] } = props.columnConfig
    const hiddenSet = new Set(hidden)

    // 如果有指定順序，按指定順序排列
    if (order.length > 0) {
      return order
        .filter(key => !hiddenSet.has(key) && columnDefinitions[key])
        .map((key, index) => ({
          key,
          label: columnDefinitions[key].label,
          order: index + 1
        }))
    }

    // 沒有指定順序，只過濾隱藏欄位
    return allColumnKeys
      .filter(key => !hiddenSet.has(key))
      .map(key => ({
        key,
        label: columnDefinitions[key].label,
        order: columnDefinitions[key].defaultOrder
      }))
      .sort((a, b) => a.order - b.order)
  }

  // 舊格式：Array
  const configMap = {}
  props.columnConfig.forEach(col => {
    configMap[col.key] = col
  })

  return allColumnKeys
    .filter(key => {
      const config = configMap[key]
      return config ? config.visible !== false : true
    })
    .map(key => ({
      key,
      label: columnDefinitions[key].label,
      order: configMap[key]?.order ?? columnDefinitions[key].defaultOrder
    }))
    .sort((a, b) => a.order - b.order)
})

// 手機版：排除貸款名稱和備註欄，名稱改為獨立 row
const mobileDataColumns = computed(() =>
  sortedVisibleColumns.value.filter(col => col.key !== 'loanType' && col.key !== 'remark')
)

// 取得表頭樣式
const getHeaderClass = (key) => {
  if (['balance', 'monthlyPayment', 'annualInterest'].includes(key)) return 'text-right'
  if (['loanType', 'remark'].includes(key)) return 'text-left'
  return ''
}

// 取得儲存格樣式
const getCellClass = (key) => {
  const classes = []
  if (key === 'loanType' || key === 'remark') classes.push('text-left')
  if (['balance', 'monthlyPayment', 'annualInterest'].includes(key)) classes.push('text-right')
  if (['monthlyPayment', 'annualInterest'].includes(key)) classes.push('calculated')
  return classes.join(' ')
}

// 取得小計行樣式
const getFooterCellClass = (key) => {
  const classes = []
  if (['balance', 'monthlyPayment', 'annualInterest'].includes(key)) classes.push('text-right', 'calculated')
  return classes.join(' ')
}
</script>

<style scoped>
table {
  width: 100% !important;
  table-layout: fixed;
}

table td,
table th {
  white-space: normal;
}

/* 桌面版：貸款名稱佔 20%，備註佔 15%，其餘平均分配 */
table:not(.mobile-loan-table) th:first-child,
table:not(.mobile-loan-table) td:first-child {
  width: 20%;
}

table:not(.mobile-loan-table) th:nth-child(2),
table:not(.mobile-loan-table) td:nth-child(2) {
  width: 15%;
}

table:not(.mobile-loan-table) th:not(:first-child),
table:not(.mobile-loan-table) td:not(:first-child) {
  white-space: nowrap;
}

.mobile-loan-table {
  width: 100% !important;
}

.mobile-loan-table th,
.mobile-loan-table td {
  width: auto !important;
  white-space: normal !important;
}

.loan-name-row td {
  font-weight: 600;
  font-size: 0.85em;
  text-align: left !important;
  padding-top: 8px !important;
  padding-bottom: 2px !important;
  border-bottom: none !important;
}

.remark-tag {
  color: var(--muted-foreground);
  font-weight: 400;
}
</style>
