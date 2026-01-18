<script setup>
/**
 * 欄位編輯器元件
 * 讓用戶配置模組要顯示的欄位和順序
 */
import { ref, computed, watch } from 'vue'
import { getColumnDefinitions, getDefaultColumnConfig } from './columnDefinitions'

const props = defineProps({
  // 模組 UID
  moduleUid: {
    type: String,
    required: true
  },
  // 模組名稱
  moduleName: {
    type: String,
    required: true
  },
  // 當前欄位配置
  columnConfig: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update', 'close'])

// 所有欄位定義
const columnDefinitions = computed(() => getColumnDefinitions(props.moduleUid))

// 本地編輯狀態
const localConfig = ref([])

// 初始化本地配置
watch(() => [props.moduleUid, props.columnConfig], () => {
  initLocalConfig()
}, { immediate: true })

function initLocalConfig() {
  const definitions = columnDefinitions.value
  const userConfig = props.columnConfig || []

  // 建立配置對照表
  const configMap = {}
  userConfig.forEach(c => {
    configMap[c.key] = c
  })

  // 合併定義和用戶配置
  localConfig.value = definitions
    .map(col => ({
      key: col.key,
      label: col.label,
      visible: configMap[col.key]?.visible ?? col.defaultVisible,
      order: configMap[col.key]?.order ?? col.defaultOrder,
      isCalculated: col.isCalculated || false,
      isAction: col.isAction || false
    }))
    .sort((a, b) => a.order - b.order)
}

// 切換欄位顯示
function toggleColumn(key) {
  const col = localConfig.value.find(c => c.key === key)
  if (col) {
    col.visible = !col.visible
    emitUpdate()
  }
}

// 移動欄位順序
function moveColumn(key, direction) {
  const index = localConfig.value.findIndex(c => c.key === key)
  if (index < 0) return

  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= localConfig.value.length) return

  // 交換位置
  const temp = localConfig.value[index]
  localConfig.value[index] = localConfig.value[newIndex]
  localConfig.value[newIndex] = temp

  // 更新 order
  localConfig.value.forEach((c, i) => {
    c.order = i + 1
  })

  emitUpdate()
}

// 拖曳相關
const draggedItem = ref(null)

function onDragStart(event, key) {
  draggedItem.value = key
  event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

function onDrop(event, targetKey) {
  event.preventDefault()
  if (!draggedItem.value || draggedItem.value === targetKey) return

  const fromIndex = localConfig.value.findIndex(c => c.key === draggedItem.value)
  const toIndex = localConfig.value.findIndex(c => c.key === targetKey)

  if (fromIndex < 0 || toIndex < 0) return

  // 移動元素
  const item = localConfig.value.splice(fromIndex, 1)[0]
  localConfig.value.splice(toIndex, 0, item)

  // 更新 order
  localConfig.value.forEach((c, i) => {
    c.order = i + 1
  })

  draggedItem.value = null
  emitUpdate()
}

function onDragEnd() {
  draggedItem.value = null
}

// 發送更新事件
function emitUpdate() {
  const config = localConfig.value.map(c => ({
    key: c.key,
    visible: c.visible,
    order: c.order
  }))
  emit('update', config)
}

// 重置為預設
function resetToDefault() {
  const defaultConfig = getDefaultColumnConfig(props.moduleUid)
  const definitions = columnDefinitions.value

  // 建立定義對照表
  const defMap = {}
  definitions.forEach(d => {
    defMap[d.key] = d
  })

  localConfig.value = defaultConfig
    .map(c => ({
      key: c.key,
      label: defMap[c.key]?.label || c.key,
      visible: c.visible,
      order: c.order,
      isCalculated: defMap[c.key]?.isCalculated || false,
      isAction: defMap[c.key]?.isAction || false
    }))
    .sort((a, b) => a.order - b.order)

  emitUpdate()
}

// 全選/全不選
function toggleAll(visible) {
  localConfig.value.forEach(c => {
    c.visible = visible
  })
  emitUpdate()
}

// 計算可見欄位數量
const visibleCount = computed(() => {
  return localConfig.value.filter(c => c.visible).length
})

const totalCount = computed(() => localConfig.value.length)
</script>

<template>
  <div class="column-editor">
    <div class="column-editor-header">
      <h4>{{ moduleName }} - 欄位設定</h4>
      <button class="close-btn" @click="$emit('close')">&times;</button>
    </div>

    <div class="column-editor-toolbar">
      <span class="column-count">顯示 {{ visibleCount }} / {{ totalCount }} 欄</span>
      <div class="toolbar-actions">
        <button class="toolbar-btn" @click="toggleAll(true)">全選</button>
        <button class="toolbar-btn" @click="toggleAll(false)">全不選</button>
        <button class="toolbar-btn reset" @click="resetToDefault">重置</button>
      </div>
    </div>

    <div class="column-list">
      <div
        v-for="col in localConfig"
        :key="col.key"
        class="column-item"
        :class="{ disabled: !col.visible, dragging: draggedItem === col.key }"
        draggable="true"
        @dragstart="onDragStart($event, col.key)"
        @dragover="onDragOver"
        @drop="onDrop($event, col.key)"
        @dragend="onDragEnd"
      >
        <div class="drag-handle">
          <span class="handle-icon">⋮⋮</span>
        </div>

        <div class="column-info">
          <span class="column-label">{{ col.label }}</span>
          <span v-if="col.isCalculated" class="column-tag calculated">計算</span>
          <span v-if="col.isAction" class="column-tag action">操作</span>
        </div>

        <div class="column-actions">
          <button
            class="move-btn"
            :disabled="localConfig.indexOf(col) === 0"
            @click="moveColumn(col.key, -1)"
            title="上移"
          >▲</button>
          <button
            class="move-btn"
            :disabled="localConfig.indexOf(col) === localConfig.length - 1"
            @click="moveColumn(col.key, 1)"
            title="下移"
          >▼</button>
        </div>

        <label class="toggle-switch small">
          <input
            type="checkbox"
            :checked="col.visible"
            @change="toggleColumn(col.key)"
          >
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.column-editor {
  background: #252538;
  border-radius: 8px;
  margin-top: 8px;
  overflow: hidden;
}

.column-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #2d2d42;
  border-bottom: 1px solid #3a3a4e;
}

.column-editor-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #aaa;
}

.close-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.column-editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: #2a2a3e;
  border-bottom: 1px solid #333;
}

.column-count {
  font-size: 12px;
  color: #888;
}

.toolbar-actions {
  display: flex;
  gap: 6px;
}

.toolbar-btn {
  background: #3a3a4e;
  border: none;
  color: #aaa;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.toolbar-btn:hover {
  background: #4a4a5e;
  color: #fff;
}

.toolbar-btn.reset {
  color: #f0ad4e;
}

.column-list {
  max-height: 280px;
  overflow-y: auto;
  padding: 8px;
}

.column-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #2a2a3e;
  border-radius: 6px;
  margin-bottom: 4px;
  cursor: grab;
  transition: all 0.15s;
}

.column-item:last-child {
  margin-bottom: 0;
}

.column-item:hover {
  background: #323248;
}

.column-item.disabled {
  opacity: 0.5;
}

.column-item.dragging {
  opacity: 0.5;
  transform: scale(1.01);
}

.drag-handle {
  color: #555;
  cursor: grab;
  font-size: 10px;
}

.column-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.column-label {
  color: #ddd;
  font-size: 13px;
}

.column-tag {
  font-size: 10px;
  padding: 2px 5px;
  border-radius: 3px;
}

.column-tag.calculated {
  background: #2d4a6a;
  color: #7ab8ff;
}

.column-tag.action {
  background: #4a3a2d;
  color: #ffb87a;
}

.column-actions {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.move-btn {
  background: #3a3a4e;
  border: none;
  color: #666;
  padding: 1px 6px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 8px;
  line-height: 1;
}

.move-btn:hover:not(:disabled) {
  background: #4a4a5e;
  color: #fff;
}

.move-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 小型 Toggle Switch */
.toggle-switch.small {
  position: relative;
  width: 32px;
  height: 18px;
}

.toggle-switch.small input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch.small .slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #4a4a5e;
  transition: 0.2s;
  border-radius: 18px;
}

.toggle-switch.small .slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

.toggle-switch.small input:checked + .slider {
  background-color: #4CAF50;
}

.toggle-switch.small input:checked + .slider:before {
  transform: translateX(14px);
}

/* 滾動條樣式 */
.column-list::-webkit-scrollbar {
  width: 6px;
}

.column-list::-webkit-scrollbar-track {
  background: #1e1e2e;
}

.column-list::-webkit-scrollbar-thumb {
  background: #4a4a5e;
  border-radius: 3px;
}

.column-list::-webkit-scrollbar-thumb:hover {
  background: #5a5a6e;
}
</style>
