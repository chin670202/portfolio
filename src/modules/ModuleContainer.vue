<script setup>
/**
 * 模組容器元件
 * 負責根據配置動態渲染啟用的模組
 */
import { computed, defineAsyncComponent } from 'vue'

const props = defineProps({
  // 用戶的模組配置
  moduleConfig: {
    type: Array,
    required: true
  },
  // 傳遞給模組的資料和方法
  moduleProps: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-news'])

function handleOpenNews(symbol, name) {
  emit('open-news', symbol, name)
}

// 動態載入模組元件
const moduleComponents = {
  'overseas-bonds': defineAsyncComponent(() => import('./OverseasBondsModule.vue')),
  'stocks-etf': defineAsyncComponent(() => import('./StocksEtfModule.vue')),
  'other-assets': defineAsyncComponent(() => import('./OtherAssetsModule.vue')),
  'loans': defineAsyncComponent(() => import('./LoansModule.vue')),
  'asset-history': defineAsyncComponent(() => import('./AssetHistoryModule.vue'))
}

// 過濾並排序啟用的模組
const enabledModules = computed(() => {
  return props.moduleConfig
    .filter(m => m.enabled)
    .sort((a, b) => a.order - b.order)
})

// 取得模組元件
function getModuleComponent(uid) {
  return moduleComponents[uid] || null
}
</script>

<template>
  <div class="module-container">
    <template v-for="config in enabledModules" :key="config.uid">
      <component
        :is="getModuleComponent(config.uid)"
        v-if="getModuleComponent(config.uid)"
        :config="config"
        v-bind="moduleProps"
        @open-news="handleOpenNews"
      />
    </template>
  </div>
</template>

<style scoped>
.module-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
