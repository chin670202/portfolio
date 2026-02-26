<script setup>
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ASSET_TYPE_LABELS, SIDE_LABELS } from '@/lib/constants'
import { useRouter } from 'vue-router'

const props = defineProps({
  trades: { type: Array, default: () => [] },
  username: { type: String, required: true },
})

const router = useRouter()
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between">
      <CardTitle>最近交易</CardTitle>
      <Button variant="ghost" size="sm" @click="router.push({ name: 'trades', params: { username } })">
        查看全部
      </Button>
    </CardHeader>
    <CardContent>
      <p v-if="trades.length === 0" class="py-8 text-center text-[var(--muted-foreground)]">
        尚無交易紀錄
      </p>
      <div v-else class="space-y-3">
        <div
          v-for="trade in trades"
          :key="trade.id"
          class="flex items-center justify-between rounded-md border p-3"
        >
          <div class="flex items-center gap-3">
            <Badge :variant="trade.side === 'buy' ? 'default' : 'destructive'">
              {{ SIDE_LABELS[trade.side] }}
            </Badge>
            <div>
              <div class="font-medium">
                {{ trade.symbol }}
                <span v-if="trade.name" class="ml-1 text-sm text-[var(--muted-foreground)]">
                  {{ trade.name }}
                </span>
              </div>
              <div class="text-xs text-[var(--muted-foreground)]">
                {{ trade.trade_date }} · {{ ASSET_TYPE_LABELS[trade.asset_type] || trade.asset_type }}
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-mono text-sm font-medium">
              {{ trade.price.toLocaleString('zh-TW') }} x
              <span class="text-red-600">{{ trade.quantity.toLocaleString('zh-TW') }}</span>
            </div>
            <div class="font-mono text-xs text-[var(--muted-foreground)]">
              {{ (trade.price * trade.quantity).toLocaleString('zh-TW') }}
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
