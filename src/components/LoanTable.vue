<template>
  <table>
    <thead>
      <tr class="section-header">
        <th colspan="5">貸款別</th>
      </tr>
      <tr>
        <th>貸款別</th>
        <th>貸款餘額</th>
        <th>貸款利率</th>
        <th >月繳金額</th>
        <th >每年利息</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(loan, index) in loans" :key="index">
        <td class="text-left">
          {{ loan.貸款別 }}
          <span v-if="loan.備註">({{ loan.備註 }})</span>
        </td>
        <td class="text-right">{{ formatNumber(loan.貸款餘額) }}</td>
        <td>{{ formatPercent(loan.貸款利率) }}</td>
        <td class="text-right calculated">{{ formatNumber(loan.月繳金額) }}</td>
        <td class="text-right highlight-orange calculated">{{ formatNumber(loan.每年利息) }}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="grand-total">
        <td>總計</td>
        <td class="text-right calculated">{{ formatNumber(total.貸款餘額) }}</td>
        <td></td>
        <td class="text-right calculated">{{ formatNumber(total.月繳金額) }}</td>
        <td class="text-right calculated">{{ formatNumber(total.每年利息) }}</td>
      </tr>
    </tfoot>
  </table>
</template>

<script setup>
import { formatNumber, formatPercent } from '../utils/format'

defineProps({
  loans: {
    type: Array,
    required: true
  },
  total: {
    type: Object,
    required: true
  }
})
</script>

