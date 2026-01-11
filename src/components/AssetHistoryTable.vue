<script setup>
import { defineProps } from 'vue'
import { formatNumber } from '../utils/format'

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  }
})
</script>

<template>
  <table v-if="records && records.length > 0">
    <thead>
      <tr class="section-header">
        <th colspan="10">資產變化記錄</th>
      </tr>
      <tr>
        <th>記錄時間</th>
        <th>美元匯率</th>
        <th>部位總額</th>
        <th>負債總額</th>
        <th>還原匯率30<br/>部位總額</th>
        <th>當時匯率<br/>部位總額(萬)</th>
        <th>台幣<br/>負債總額(萬)</th>
        <th>當時匯率<br/>資產總和(萬)</th>
        <th>還原匯率30<br/>部位總額(萬)</th>
        <th>還原匯率30<br/>資產總額(萬)</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(record, index) in records" :key="index">
        <td>{{ record.記錄時間 }}</td>
        <td>{{ record.美元匯率 }}</td>
        <td class="text-right">{{ formatNumber(record.部位總額) }}</td>
        <td class="text-right">{{ formatNumber(record.負債總額) }}</td>
        <td class="text-right">{{ formatNumber(record.還原匯率30部位總額) }}</td>
        <td class="text-right">{{ record.當時匯率部位總額萬 }}</td>
        <td class="text-right">{{ record.台幣負債總額萬 }}</td>
        <td class="text-right" :class="{ 'positive': parseFloat(record.當時匯率資產總和萬) > 0, 'negative': parseFloat(record.當時匯率資產總和萬) < 0 }">
          {{ record.當時匯率資產總和萬 }}
        </td>
        <td class="text-right">{{ record.還原匯率30部位總額萬 }}</td>
        <td class="text-right" :class="{ 'positive': parseFloat(record.還原匯率30資產總額萬) > 0, 'negative': parseFloat(record.還原匯率30資產總額萬) < 0 }">
          {{ record.還原匯率30資產總額萬 }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
