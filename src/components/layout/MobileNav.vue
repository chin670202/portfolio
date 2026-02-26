<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Wallet, LayoutDashboard, ArrowLeftRight, TrendingUp } from 'lucide-vue-next'

const props = defineProps({
  username: { type: String, required: true }
})

const route = useRoute()

const navItems = computed(() => [
  { to: `/${props.username}`, label: '現況', icon: Wallet, exact: true },
  { to: `/${props.username}/dashboard`, label: '儀表板', icon: LayoutDashboard, exact: true },
  { to: `/${props.username}/trades`, label: '交易', icon: ArrowLeftRight, exact: true },
  { to: `/${props.username}/pnl`, label: '損益', icon: TrendingUp, exact: false },
])

function isActive(item) {
  if (item.exact) return route.path === item.to
  return route.path.startsWith(item.to)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 flex border-t border-[var(--border)] bg-white md:hidden">
    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      :class="[
        'flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors',
        isActive(item)
          ? 'text-[var(--primary)] font-medium'
          : 'text-[var(--muted-foreground)]'
      ]"
    >
      <component :is="item.icon" class="h-5 w-5" />
      {{ item.label }}
    </RouterLink>
  </nav>
</template>
