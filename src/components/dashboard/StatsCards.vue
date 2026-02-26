<script setup>
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Target, Briefcase } from 'lucide-vue-next'

const props = defineProps({
  stats: { type: Object, default: null },
})
</script>

<template>
  <!-- Loading skeleton -->
  <div v-if="!stats" class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <Card v-for="i in 4" :key="i">
      <CardHeader class="pb-2">
        <CardTitle class="text-sm font-medium text-[var(--muted-foreground)]">
          載入中...
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="h-8 w-24 animate-pulse rounded bg-[var(--muted)]" />
      </CardContent>
    </Card>
  </div>

  <!-- Data loaded -->
  <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <!-- Total P&L -->
    <Card>
      <CardHeader class="flex flex-row items-center justify-between pb-2">
        <CardTitle class="text-sm font-medium text-[var(--muted-foreground)]">
          總損益
        </CardTitle>
        <component
          :is="stats.totalRealizedPnl >= 0 ? TrendingUp : TrendingDown"
          class="h-4 w-4 text-[var(--muted-foreground)]"
        />
      </CardHeader>
      <CardContent>
        <div
          class="text-2xl font-bold"
          :class="stats.totalRealizedPnl > 0 ? 'text-green-600' : stats.totalRealizedPnl < 0 ? 'text-red-600' : ''"
        >
          {{ stats.totalRealizedPnl >= 0 ? '+' : '' }}{{ stats.totalRealizedPnl.toLocaleString('zh-TW', { maximumFractionDigits: 0 }) }}
        </div>
      </CardContent>
    </Card>

    <!-- Win Rate -->
    <Card>
      <CardHeader class="flex flex-row items-center justify-between pb-2">
        <CardTitle class="text-sm font-medium text-[var(--muted-foreground)]">
          勝率
        </CardTitle>
        <Target class="h-4 w-4 text-[var(--muted-foreground)]" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">
          {{ stats.winCount + stats.lossCount > 0 ? (stats.winRate * 100).toFixed(1) + '%' : '-' }}
        </div>
        <p class="text-xs text-[var(--muted-foreground)]">
          {{ stats.winCount }} 勝 / {{ stats.lossCount }} 敗
        </p>
      </CardContent>
    </Card>

    <!-- Trade Count -->
    <Card>
      <CardHeader class="flex flex-row items-center justify-between pb-2">
        <CardTitle class="text-sm font-medium text-[var(--muted-foreground)]">
          交易次數
        </CardTitle>
        <Briefcase class="h-4 w-4 text-[var(--muted-foreground)]" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{{ stats.totalTrades }}</div>
      </CardContent>
    </Card>

    <!-- Open Positions -->
    <Card>
      <CardHeader class="flex flex-row items-center justify-between pb-2">
        <CardTitle class="text-sm font-medium text-[var(--muted-foreground)]">
          持倉中
        </CardTitle>
        <Briefcase class="h-4 w-4 text-[var(--muted-foreground)]" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{{ stats.openPositionCount }} 檔</div>
      </CardContent>
    </Card>
  </div>
</template>
