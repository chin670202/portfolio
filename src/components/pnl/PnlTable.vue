<script setup>
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ASSET_TYPE_LABELS } from '@/lib/constants'

const props = defineProps({
  records: { type: Array, default: () => [] },
  summary: {
    type: Object,
    default: () => ({ totalPnl: 0, totalFees: 0, winCount: 0, lossCount: 0, winRate: 0 }),
  },
})

function pnlColor(value) {
  if (value > 0) return 'color: #16a34a'
  if (value < 0) return 'color: #dc2626'
  return ''
}

function formatPnl(value) {
  const prefix = value > 0 ? '+' : ''
  return prefix + value.toLocaleString('zh-TW', { maximumFractionDigits: 2 })
}

function returnPct(record) {
  const cost = record.buy_price * record.matched_qty
  if (cost === 0) return '0%'
  const pct = (record.realized_pnl / cost) * 100
  const prefix = pct > 0 ? '+' : ''
  return prefix + pct.toFixed(2) + '%'
}
</script>

<template>
  <!-- Summary Cards -->
  <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
    <Card>
      <CardContent class="p-4">
        <p class="text-sm text-[var(--muted-foreground)]">已實現損益</p>
        <p class="text-xl font-bold" :style="pnlColor(summary.totalPnl)">
          {{ formatPnl(summary.totalPnl) }}
        </p>
      </CardContent>
    </Card>
    <Card>
      <CardContent class="p-4">
        <p class="text-sm text-[var(--muted-foreground)]">手續費+稅</p>
        <p class="text-xl font-bold text-[var(--foreground)]">
          {{ summary.totalFees.toLocaleString('zh-TW', { maximumFractionDigits: 2 }) }}
        </p>
      </CardContent>
    </Card>
    <Card>
      <CardContent class="p-4">
        <p class="text-sm text-[var(--muted-foreground)]">勝率</p>
        <p class="text-xl font-bold text-[var(--foreground)]">
          {{ (summary.winRate * 100).toFixed(1) }}%
        </p>
      </CardContent>
    </Card>
    <Card>
      <CardContent class="p-4">
        <p class="text-sm text-[var(--muted-foreground)]">勝/敗</p>
        <p class="text-xl font-bold text-[var(--foreground)]">
          {{ summary.winCount }} / {{ summary.lossCount }}
        </p>
      </CardContent>
    </Card>
  </div>

  <!-- P&L Table -->
  <div v-if="records.length === 0" class="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
    <p class="text-lg">尚無損益記錄</p>
    <p class="text-sm">當你賣出持有部位後，損益會自動計算</p>
  </div>

  <div v-else class="rounded-md border border-[var(--border)]">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>賣出日期</TableHead>
          <TableHead>類型</TableHead>
          <TableHead>代號</TableHead>
          <TableHead class="text-right">買入價</TableHead>
          <TableHead class="text-right">賣出價</TableHead>
          <TableHead class="text-right">數量</TableHead>
          <TableHead class="text-right">費用</TableHead>
          <TableHead class="text-right">損益</TableHead>
          <TableHead class="text-right">報酬率</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="record in records" :key="record.id">
          <TableCell class="whitespace-nowrap">{{ record.sell_date }}</TableCell>
          <TableCell>
            <Badge variant="outline">
              {{ ASSET_TYPE_LABELS[record.asset_type] || record.asset_type }}
            </Badge>
          </TableCell>
          <TableCell class="font-mono font-medium">{{ record.symbol }}</TableCell>
          <TableCell class="text-right font-mono">
            {{ record.buy_price.toLocaleString('zh-TW') }}
          </TableCell>
          <TableCell class="text-right font-mono">
            {{ record.sell_price.toLocaleString('zh-TW') }}
          </TableCell>
          <TableCell class="text-right font-mono">
            {{ record.matched_qty.toLocaleString('zh-TW') }}
          </TableCell>
          <TableCell class="text-right font-mono text-[var(--muted-foreground)]">
            {{ (record.buy_fee + record.sell_fee + record.sell_tax).toLocaleString('zh-TW', { maximumFractionDigits: 2 }) }}
          </TableCell>
          <TableCell class="text-right font-mono font-medium" :style="pnlColor(record.realized_pnl)">
            {{ formatPnl(record.realized_pnl) }}
          </TableCell>
          <TableCell class="text-right font-mono" :style="pnlColor(record.realized_pnl)">
            {{ returnPct(record) }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
