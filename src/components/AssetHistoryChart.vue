<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  }
})

const chartData = computed(() => {
  if (!props.records || props.records.length === 0) {
    return { labels: [], datasets: [] }
  }

  const labels = props.records.map(r => r.記錄時間)
  const currentRateData = props.records.map(r => parseFloat(r.當時匯率資產總和萬))
  const rate30Data = props.records.map(r => parseFloat(r.還原匯率30資產總額萬))

  return {
    labels,
    datasets: [
      {
        label: '當時匯率資產總和(萬)',
        data: currentRateData,
        borderColor: '#4472c4',
        backgroundColor: '#4472c4',
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: '還原匯率30資產總額(萬)',
        data: rate30Data,
        borderColor: '#ff6b6b',
        backgroundColor: '#ff6b6b',
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        font: {
          size: 14,
          family: "'Microsoft JhengHei', 'PingFang TC', sans-serif"
        }
      }
    },
    title: {
      display: true,
      text: '資產變化趨勢圖',
      font: {
        size: 18,
        family: "'Microsoft JhengHei', 'PingFang TC', sans-serif",
        weight: 'bold'
      }
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          return context.dataset.label + ': ' + context.parsed.y + ' 萬'
        }
      }
    }
  },
  scales: {
    x: {
      title: {
        display: true,
        text: '時間',
        font: {
          size: 14,
          family: "'Microsoft JhengHei', 'PingFang TC', sans-serif"
        }
      },
      ticks: {
        font: {
          size: 12
        }
      }
    },
    y: {
      title: {
        display: true,
        text: '資產總和(萬)',
        font: {
          size: 14,
          family: "'Microsoft JhengHei', 'PingFang TC', sans-serif"
        }
      },
      ticks: {
        font: {
          size: 12
        }
      }
    }
  }
}
</script>

<template>
  <div v-if="records && records.length > 0" class="chart-container">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart-container {
  width: 100%;
  height: 400px;
  margin-top: 20px;
  margin-bottom: 25px;
  padding: 15px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
