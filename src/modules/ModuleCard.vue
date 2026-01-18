<script setup>
/**
 * 模組卡片元件
 * 用於在 ModuleGallery 中顯示單一模組的預覽和選擇狀態
 */
import { computed, defineAsyncComponent } from 'vue'

const props = defineProps({
  // 模組定義 (來自 moduleRegistry)
  module: {
    type: Object,
    required: true
  },
  // 使用人數（熱門度）
  usageCount: {
    type: Number,
    default: 0
  },
  // 是否已選擇
  isSelected: {
    type: Boolean,
    default: false
  },
  // 預覽用的資料
  previewData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['toggle'])

// 動態載入模組元件用於預覽（從新的 builtin 目錄結構）
const moduleComponents = {
  'summary-cards': defineAsyncComponent(() => import('./builtin/summary-cards/index.vue')),
  'overseas-bonds': defineAsyncComponent(() => import('./builtin/overseas-bonds/index.vue')),
  'stocks-etf': defineAsyncComponent(() => import('./builtin/stocks-etf/index.vue')),
  'other-assets': defineAsyncComponent(() => import('./builtin/other-assets/index.vue')),
  'loans': defineAsyncComponent(() => import('./builtin/loans/index.vue')),
  'asset-history': defineAsyncComponent(() => import('./builtin/asset-history/index.vue'))
}

const getModuleComponent = (uid) => {
  return moduleComponents[uid] || null
}

// 預覽用的配置
const previewConfig = computed(() => ({
  uid: props.module.uid,
  enabled: true,
  order: 1,
  options: props.module.options || {}
}))

// 熱門度等級
const popularityLevel = computed(() => {
  if (props.usageCount >= 50) return 'hot'
  if (props.usageCount >= 20) return 'popular'
  return 'normal'
})

// 點擊卡片切換選擇狀態
function handleClick() {
  emit('toggle', props.module.uid)
}
</script>

<template>
  <div
    class="module-card"
    :class="{ 'is-selected': isSelected }"
    @click="handleClick"
  >
    <!-- 選擇 checkbox -->
    <div class="card-checkbox">
      <input
        type="checkbox"
        :checked="isSelected"
        @click.stop
        @change="handleClick"
      />
    </div>

    <!-- 模組預覽區域 -->
    <div class="card-preview">
      <div class="preview-container">
        <component
          v-if="getModuleComponent(module.uid) && previewData"
          :is="getModuleComponent(module.uid)"
          :config="previewConfig"
          v-bind="previewData"
          class="preview-content"
        />
        <div v-else class="preview-placeholder">
          <span class="preview-icon">{{ module.icon }}</span>
        </div>
      </div>
    </div>

    <!-- 模組資訊 -->
    <div class="card-info">
      <div class="card-header">
        <span class="card-icon">{{ module.icon }}</span>
        <h3 class="card-title">{{ module.name }}</h3>
      </div>
      <p class="card-description">{{ module.description }}</p>
      <div class="card-footer">
        <span class="popularity-badge" :class="popularityLevel">
          <span v-if="popularityLevel === 'hot'">🔥</span>
          {{ usageCount }} 人使用
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.module-card {
  background: #2a2a3e;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
}

.module-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  border-color: #4a4a6a;
}

.module-card.is-selected {
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
}

.card-checkbox {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
}

.card-checkbox input[type="checkbox"] {
  width: 22px;
  height: 22px;
  cursor: pointer;
  accent-color: #4CAF50;
}

.card-preview {
  width: 100%;
  height: 140px;
  background: #1e1e2e;
  overflow: hidden;
  position: relative;
}

.preview-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.preview-content {
  transform: scale(0.25);
  transform-origin: top left;
  width: 400%;
  height: 400%;
}

.preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2a2a3e 0%, #1e1e2e 100%);
}

.preview-icon {
  font-size: 48px;
  opacity: 0.6;
}

.card-info {
  padding: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.card-icon {
  font-size: 20px;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.card-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #a0a0b0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.popularity-badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  background: #3a3a4e;
  color: #a0a0b0;
}

.popularity-badge.popular {
  background: #3d4f3d;
  color: #8bc34a;
}

.popularity-badge.hot {
  background: #4f3d3d;
  color: #ff6b6b;
}
</style>
