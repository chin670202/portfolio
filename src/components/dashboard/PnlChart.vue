<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip)

const props = defineProps({
  data: { type: Array, default: () => [] },
})

const chartData = computed(() => ({
  labels: props.data.map(d => d.month),
  datasets: [{
    data: props.data.map(d => d.pnl),
    backgroundColor: props.data.map(d => d.pnl >= 0 ? '#22c55e' : '#ef4444'),
    borderRadius: 4,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `損益: ${Number(ctx.raw).toLocaleString('zh-TW')}`,
      },
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      grid: { color: 'rgba(0,0,0,0.06)' },
      ticks: {
        callback: (v) => Number(v).toLocaleString('zh-TW'),
      },
    },
  },
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>月度損益</CardTitle>
    </CardHeader>
    <CardContent>
      <div v-if="data.length === 0" class="flex h-[250px] items-center justify-center text-[var(--muted-foreground)]">
        尚無損益資料
      </div>
      <div v-else class="h-[250px]">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </CardContent>
  </Card>
</template>
