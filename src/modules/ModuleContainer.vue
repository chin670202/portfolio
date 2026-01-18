<script setup>
/**
 * 模組容器元件
 * 負責根據配置動態渲染啟用的模組
 * 支援內建模組和自訂模組的渲染
 */
import { computed, defineAsyncComponent } from 'vue'
import CustomModuleRenderer from './CustomModuleRenderer.vue'

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

// 動態載入模組元件（從新的 builtin 目錄結構）
const moduleComponents = {
  'summary-cards': defineAsyncComponent(() => import('./builtin/summary-cards/index.vue')),
  'overseas-bonds': defineAsyncComponent(() => import('./builtin/overseas-bonds/index.vue')),
  'stocks-etf': defineAsyncComponent(() => import('./builtin/stocks-etf/index.vue')),
  'other-assets': defineAsyncComponent(() => import('./builtin/other-assets/index.vue')),
  'loans': defineAsyncComponent(() => import('./builtin/loans/index.vue')),
  'asset-history': defineAsyncComponent(() => import('./builtin/asset-history/index.vue'))
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

// 檢查是否為自訂模組
function isCustomModule(config) {
  return config.isCustom === true
}

// 取得自訂模組的 spec
function getCustomModuleSpec(config) {
  // 自訂模組的配置本身就包含 spec 資訊
  return config
}

// 準備自訂模組的資料
function getCustomModuleData() {
  return {
    calculatedBonds: props.moduleProps.calculatedBonds || [],
    calculatedEtfs: props.moduleProps.calculatedEtfs || [],
    calculatedOtherAssets: props.moduleProps.calculatedOtherAssets || [],
    calculatedLoans: props.moduleProps.calculatedLoans || [],
    exchangeRate: props.moduleProps.exchangeRate || 32,
    assetHistoryRecords: props.moduleProps.assetHistoryRecords || []
  }
}
</script>

<template>
  <div class="module-container">
    <template v-for="config in enabledModules" :key="config.uid">
      <!-- 自訂模組 -->
      <div v-if="isCustomModule(config)" class="custom-module-wrapper">
        <div class="custom-module-header">
          <span class="custom-module-icon">{{ config.icon || '📊' }}</span>
          <h3 class="custom-module-title">{{ config.name }}</h3>
          <span class="custom-badge">自訂</span>
        </div>
        <CustomModuleRenderer
          :spec="getCustomModuleSpec(config)"
          :data="getCustomModuleData()"
          :config="config"
        />
      </div>

      <!-- 內建模組 -->
      <component
        v-else-if="getModuleComponent(config.uid)"
        :is="getModuleComponent(config.uid)"
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

/* 自訂模組包裝 */
.custom-module-wrapper {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #2a2a3e;
}

.custom-module-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #2a2a3e;
}

.custom-module-icon {
  font-size: 24px;
}

.custom-module-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  flex: 1;
}

.custom-badge {
  font-size: 11px;
  background: linear-gradient(135deg, #6b21a8 0%, #9333ea 100%);
  color: #fff;
  padding: 3px 8px;
  border-radius: 10px;
  font-weight: 500;
}
</style>
