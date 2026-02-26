<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Wallet, LayoutDashboard, ArrowLeftRight, TrendingUp } from 'lucide-vue-next'

const props = defineProps({
  username: { type: String, required: true }
})

const route = useRoute()

const navItems = computed(() => [
  { to: `/${props.username}`, label: '投資現況', icon: Wallet, exact: true },
  { to: `/${props.username}/dashboard`, label: '儀表板', icon: LayoutDashboard, exact: true },
  { to: `/${props.username}/trades`, label: '交易紀錄', icon: ArrowLeftRight, exact: true },
  { to: `/${props.username}/pnl`, label: '損益報表', icon: TrendingUp, exact: false },
])

function isActive(item) {
  if (item.exact) return route.path === item.to
  return route.path.startsWith(item.to)
}
</script>

<template>
  <aside class="hidden w-56 shrink-0 border-r border-[var(--border)] bg-white md:block">
    <div class="flex h-14 items-center border-b border-[var(--border)] px-4">
      <h1 class="text-lg font-bold text-[var(--foreground)]">{{ username }}</h1>
    </div>
    <nav class="flex flex-col gap-1 p-2">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          isActive(item)
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
            : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]'
        ]"
      >
        <component :is="item.icon" class="h-4 w-4" />
        {{ item.label }}
      </RouterLink>
    </nav>
  </aside>
</template>
