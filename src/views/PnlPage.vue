<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PnlTable from '@/components/pnl/PnlTable.vue'
import { fetchPnl } from '@/services/tradeApi'

const route = useRoute()
const username = computed(() => route.params.username)

const records = ref([])
const summary = ref({ totalPnl: 0, totalFees: 0, winCount: 0, lossCount: 0, winRate: 0 })

/**
 * 同一筆賣出交易（sell_trade_id 相同）的 FIFO 多批配對記錄聚合成一列，
 * 買入價以配對數量加權平均，費用與損益加總。
 */
function aggregateBySell(rows) {
  const groups = new Map()
  for (const r of rows) {
    let g = groups.get(r.sell_trade_id)
    if (!g) {
      g = {
        id: `sell-${r.sell_trade_id}`,
        sell_trade_id: r.sell_trade_id,
        sell_date: r.sell_date,
        asset_type: r.asset_type,
        symbol: r.symbol,
        name: r.name,
        sell_price: r.sell_price,
        matched_qty: 0,
        buy_price: 0,
        buy_fee: 0,
        sell_fee: 0,
        sell_tax: 0,
        realized_pnl: 0,
        _buyCost: 0,
      }
      groups.set(r.sell_trade_id, g)
    }
    g.matched_qty += r.matched_qty
    g._buyCost += r.buy_price * r.matched_qty
    g.buy_fee += r.buy_fee
    g.sell_fee += r.sell_fee
    g.sell_tax += r.sell_tax
    g.realized_pnl += r.realized_pnl
  }
  return [...groups.values()].map((g) => {
    g.buy_price = g.matched_qty > 0 ? g._buyCost / g.matched_qty : 0
    delete g._buyCost
    return g
  })
}

/**
 * 以聚合後的記錄重算摘要（勝/敗以一筆賣出為單位計算）。
 */
function computeSummary(rows) {
  const totalPnl = rows.reduce((s, r) => s + r.realized_pnl, 0)
  const totalFees = rows.reduce((s, r) => s + r.buy_fee + r.sell_fee + r.sell_tax, 0)
  const winCount = rows.filter((r) => r.realized_pnl > 0).length
  const lossCount = rows.filter((r) => r.realized_pnl < 0).length
  const totalClosed = winCount + lossCount
  return {
    totalPnl,
    totalFees,
    winCount,
    lossCount,
    winRate: totalClosed > 0 ? winCount / totalClosed : 0,
  }
}

async function loadPnl() {
  try {
    const data = await fetchPnl(username.value)
    const aggregated = aggregateBySell(data.records || [])
    records.value = aggregated
    summary.value = computeSummary(aggregated)
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
