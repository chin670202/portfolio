<script setup>
import { Toaster } from '@/components/ui/sonner'
</script>

<template>
  <router-view />
  <Toaster position="top-center" :duration="3000" rich-colors />
</template>
