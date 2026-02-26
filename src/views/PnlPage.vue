<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PnlTable from '@/components/pnl/PnlTable.vue'
import { fetchPnl } from '@/services/tradeApi'

const route = useRoute()
const username = computed(() => route.params.username)

const records = ref([])
const summary = ref({ totalPnl: 0, totalFees: 0, winCount: 0, lossCount: 0, winRate: 0 })

async function loadPnl() {
  try {
    const data = await fetchPnl(username.value)
    records.value = data.records
    summary.value = data.summary
  } catch (err) {
    console.error('Failed to fetch P&L:', err)
  }
}

onMounted(loadPnl)
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <h2 class="text-2xl font-bold text-[var(--foreground)]">損益報表</h2>
    <PnlTable :records="records" :summary="summary" />
  </div>
</template>
