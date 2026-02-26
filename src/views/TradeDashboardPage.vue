<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import StatsCards from '@/components/dashboard/StatsCards.vue'
import PnlChart from '@/components/dashboard/PnlChart.vue'
import RecentTrades from '@/components/dashboard/RecentTrades.vue'
import { fetchStats, fetchTrades } from '@/services/tradeApi'

const route = useRoute()
const username = computed(() => route.params.username)

const stats = ref(null)
const recentTrades = ref([])

onMounted(async () => {
  try {
    const [statsData, tradesData] = await Promise.all([
      fetchStats(username.value),
      fetchTrades(username.value, { limit: 5 }),
    ])
    stats.value = statsData
    recentTrades.value = tradesData.trades
  } catch (err) {
    console.error('Failed to load dashboard data:', err)
  }
})
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <h2 class="text-2xl font-bold">儀表板</h2>
    <StatsCards :stats="stats" />
    <div class="grid gap-6 lg:grid-cols-2">
      <PnlChart :data="stats?.pnlByMonth || []" />
      <RecentTrades :trades="recentTrades" :username="username" />
    </div>
  </div>
</template>
