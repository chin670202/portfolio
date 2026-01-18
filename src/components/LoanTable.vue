<template>
  <table>
    <thead>
      <tr class="section-header">
        <th :colspan="sortedVisibleColumns.length">貸款別</th>
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
          <!-- 貸款別 -->
          <template v-if="col.key === 'loanType'">
            {{ loan.貸款別 }}
            <span v-if="loan.備註">({{ loan.備註 }})</span>
          </template>
          <!-- 貸款餘額 -->
          <template v-else-if="col.key === 'balance'">{{ formatNumber(loan.貸款餘額) }}</template>
          <!-- 貸款利率 -->
          <template v-else-if="col.key === 'rate'">{{ formatPercent(loan.貸款利率) }}</template>
          <!-- 月繳金額 -->
          <template v-else-if="col.key === 'monthlyPayment'">{{ formatNumber(loan.月繳金額) }}</template>
          <!-- 每年利息 -->
          <template v-else-if="col.key === 'annualInterest'">{{ formatNumber(loan.每年利息) }}</template>
        </td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="grand-total">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getFooterCellClass(col.key)">
          <!-- 總計標籤（第一欄） -->
          <template v-if="col === sortedVisibleColumns[0]">總計</template>
          <!-- 貸款餘額 -->
          <template v-else-if="col.key === 'balance'">{{ formatNumber(total.貸款餘額) }}</template>
          <!-- 貸款利率 留空 -->
          <template v-else-if="col.key === 'rate'"></template>
          <!-- 月繳金額 -->
          <template v-else-if="col.key === 'monthlyPayment'">{{ formatNumber(total.月繳金額) }}</template>
          <!-- 每年利息 -->
          <template v-else-if="col.key === 'annualInterest'">{{ formatNumber(total.每年利息) }}</template>
        </td>
      </tr>
    </tfoot>
  </table>
</template>

<script setup>
import { computed } from 'vue'
// eslint-disable-next-line no-unused-vars
import { formatNumber, formatPercent } from '../utils/format'

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
  loanType: { label: '貸款別', defaultOrder: 1 },
  balance: { label: '貸款餘額', defaultOrder: 2 },
  rate: { label: '貸款利率', defaultOrder: 3 },
  monthlyPayment: { label: '月繳金額', defaultOrder: 4 },
  annualInterest: { label: '每年利息', defaultOrder: 5 }
}

const allColumnKeys = Object.keys(columnDefinitions)

// 排序後的可見欄位
const sortedVisibleColumns = computed(() => {
  if (!props.columnConfig || props.columnConfig.length === 0) {
    return allColumnKeys.map(key => ({
      key,
      label: columnDefinitions[key].label,
      order: columnDefinitions[key].defaultOrder
    })).sort((a, b) => a.order - b.order)
  }

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

// 取得表頭樣式
const getHeaderClass = (key) => {
  if (['balance', 'monthlyPayment', 'annualInterest'].includes(key)) return 'text-right'
  return ''
}

// 取得儲存格樣式
const getCellClass = (key) => {
  const classes = []
  if (key === 'loanType') classes.push('text-left')
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
