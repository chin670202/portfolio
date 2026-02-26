<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '../components/layout/AppSidebar.vue'
import MobileNav from '../components/layout/MobileNav.vue'

const route = useRoute()
const username = computed(() => route.params.username)

onMounted(() => document.body.classList.add('has-sidebar'))
onUnmounted(() => document.body.classList.remove('has-sidebar'))
</script>

<template>
  <div class="flex h-screen">
    <AppSidebar :username="username" />
    <main class="flex-1 overflow-auto pb-16 md:pb-0">
      <router-view />
    </main>
  </div>
  <MobileNav :username="username" />
</template>
