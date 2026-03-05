<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '../components/layout/AppSidebar.vue'
import MobileNav from '../components/layout/MobileNav.vue'
import { PanelLeftOpen, PanelLeftClose } from 'lucide-vue-next'

const route = useRoute()
const username = computed(() => route.params.username)
const collapsed = ref(false)

onMounted(() => document.body.classList.add('has-sidebar'))
onUnmounted(() => document.body.classList.remove('has-sidebar'))
</script>

<template>
  <div class="flex h-screen">
    <AppSidebar v-show="!collapsed" :username="username" />
    <main class="flex-1 min-w-0 overflow-auto pb-16 md:pb-0">
      <button
        class="sidebar-toggle hidden md:flex"
        @click="collapsed = !collapsed"
        :title="collapsed ? '展開側邊欄' : '收合側邊欄'"
      >
        <PanelLeftOpen v-if="collapsed" class="h-4 w-4" />
        <PanelLeftClose v-else class="h-4 w-4" />
      </button>
      <router-view />
    </main>
  </div>
  <MobileNav :username="username" />
</template>

<style scoped>
.sidebar-toggle {
  position: sticky;
  top: 0;
  z-index: 10;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 8px 8px 0;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--background);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.sidebar-toggle:hover {
  background: var(--accent);
  color: var(--accent-foreground);
}
</style>
