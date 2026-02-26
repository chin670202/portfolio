<script setup>
import { computed } from 'vue'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-vue-next'
import { ASSET_TYPE_LABELS, SIDE_LABELS } from '@/lib/constants'
import { deleteTrade } from '@/services/tradeApi'

const props = defineProps({
  trades: { type: Array, default: () => [] },
  username: { type: String, required: true },
  brokers: { type: Array, default: () => [] },
})

const brokerMap = computed(() => {
  const map = {}
  for (const b of props.brokers) map[b.id] = b.name
  return map
})

const emit = defineEmits(['refresh'])

async function handleDelete(id) {
  if (!confirm('確定要刪除此筆交易？相關損益將重新計算。')) return

  try {
    await deleteTrade(props.username, id)
    emit('refresh')
  } catch (err) {
    alert(err.message || '刪除失敗')
  }
}
</script>

<template>
  <div v-if="trades.length === 0" class="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
    <p class="text-lg">尚無交易紀錄</p>
    <p class="text-sm">在上方輸入框描述你的交易開始記錄</p>
  </div>

  <div v-else class="rounded-md border border-[var(--border)]">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>日期</TableHead>
          <TableHead>類型</TableHead>
          <TableHead>代號</TableHead>
          <TableHead>名稱</TableHead>
          <TableHead>方向</TableHead>
          <TableHead class="text-right">價格</TableHead>
          <TableHead class="text-right">數量</TableHead>
          <TableHead class="text-right">金額</TableHead>
          <TableHead class="text-right">手續費</TableHead>
          <TableHead>券商</TableHead>
          <TableHead>備註</TableHead>
          <TableHead class="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="trade in trades" :key="trade.id">
          <TableCell class="whitespace-nowrap">{{ trade.trade_date }}</TableCell>
          <TableCell>
            <Badge variant="outline">
              {{ ASSET_TYPE_LABELS[trade.asset_type] || trade.asset_type }}
            </Badge>
          </TableCell>
          <TableCell class="font-mono font-medium">{{ trade.symbol }}</TableCell>
          <TableCell class="text-[var(--muted-foreground)]">{{ trade.name || '-' }}</TableCell>
          <TableCell>
            <Badge :variant="trade.side === 'buy' ? 'default' : 'destructive'">
              {{ SIDE_LABELS[trade.side] }}
            </Badge>
          </TableCell>
          <TableCell class="text-right font-mono">
            {{ trade.price.toLocaleString('zh-TW') }}
          </TableCell>
          <TableCell class="text-right font-mono">
            {{ trade.quantity.toLocaleString('zh-TW') }}
          </TableCell>
          <TableCell class="text-right font-mono">
            {{ (trade.price * trade.quantity).toLocaleString('zh-TW') }}
          </TableCell>
          <TableCell class="text-right font-mono text-[var(--muted-foreground)]">
            {{ (trade.fee + trade.tax).toLocaleString('zh-TW') }}
          </TableCell>
          <TableCell class="text-[var(--muted-foreground)]">
            {{ trade.broker_id ? (brokerMap[trade.broker_id] || trade.broker_id) : '-' }}
          </TableCell>
          <TableCell class="max-w-[120px] truncate text-[var(--muted-foreground)]">
            {{ trade.notes || '-' }}
          </TableCell>
          <TableCell>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
              @click="handleDelete(trade.id)"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
