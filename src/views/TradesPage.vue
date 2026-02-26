<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import TradeInput from '@/components/trades/TradeInput.vue'
import TradePreview from '@/components/trades/TradePreview.vue'
import TradeTable from '@/components/trades/TradeTable.vue'
import { fetchTrades, fetchBrokers, getDefaultBroker, calculateFee } from '@/services/tradeApi'

const route = useRoute()
const username = computed(() => route.params.username)

const trades = ref([])
const total = ref(0)
const parsedTrade = ref(null)
const previewOpen = ref(false)
const brokers = ref([])
const defaultBrokerId = ref(null)

async function loadTrades() {
  try {
    const data = await fetchTrades(username.value)
    trades.value = data.trades
    total.value = data.total
  } catch (err) {
    console.error('Failed to fetch trades:', err)
  }
}

async function loadBrokerData() {
  try {
    const [brokerList, defaultData] = await Promise.all([
      fetchBrokers(),
      getDefaultBroker(username.value),
    ])
    brokers.value = brokerList
    defaultBrokerId.value = defaultData.brokerId
  } catch (err) {
    console.error('Failed to load broker data:', err)
  }
}

async function handleParsed(parsed) {
  // If user has a default broker, auto-calculate fees
  if (defaultBrokerId.value) {
    try {
      const { fee, tax } = await calculateFee({
        brokerId: defaultBrokerId.value,
        assetType: parsed.assetType,
        price: parsed.price,
        quantity: parsed.quantity,
        side: parsed.side,
        symbol: parsed.symbol,
      })
      parsed.fee = fee
      parsed.tax = tax
      parsed.brokerId = defaultBrokerId.value
    } catch (err) {
      console.error('Fee calculation failed:', err)
    }
  }
  parsedTrade.value = parsed
  previewOpen.value = true
}

function handleClosePreview() {
  previewOpen.value = false
  parsedTrade.value = null
}

function handleDefaultBrokerChanged(brokerId) {
  defaultBrokerId.value = brokerId
}

onMounted(() => {
  loadTrades()
  loadBrokerData()
})
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <h2 class="text-2xl font-bold text-[var(--foreground)]">交易紀錄</h2>

    <Card>
      <CardHeader>
        <CardTitle>新增交易</CardTitle>
      </CardHeader>
      <CardContent>
        <TradeInput :username="username" @parsed="handleParsed" />
      </CardContent>
    </Card>

    <TradePreview
      :trade="parsedTrade"
      :open="previewOpen"
      :username="username"
      :brokers="brokers"
      :default-broker-id="defaultBrokerId"
      @close="handleClosePreview"
      @saved="loadTrades"
      @default-broker-changed="handleDefaultBrokerChanged"
    />

    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-[var(--foreground)]">
        歷史紀錄
        <span v-if="total > 0" class="text-[var(--muted-foreground)]">({{ total }} 筆)</span>
      </h3>
    </div>

    <TradeTable :trades="trades" :username="username" :brokers="brokers" @refresh="loadTrades" />
  </div>
</template>
