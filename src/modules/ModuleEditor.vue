<script setup>
/**
 * 模組編輯器
 * 讓用戶選擇要顯示哪些模組、調整順序、配置欄位
 */
import { ref, computed, watch } from 'vue'
import { getBuiltinModules } from './registry'
import ColumnEditor from './ColumnEditor.vue'
import { getDefaultColumnConfig } from './columnDefinitions'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  // 當前的模組配置
  moduleConfig: {
    type: Array,
    required: true
  },
  // 是否正在儲存
  saving: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'save', 'preview', 'cancel'])

// 本地編輯狀態（複製一份避免直接修改 props）
const localConfig = ref([])

// 開啟編輯器時的原始配置（用於取消時恢復）
const originalConfig = ref([])

// 所有可用模組
const allModules = getBuiltinModules()

// 當前展開欄位編輯器的模組 UID（null 表示全部收起）
const expandedModuleUid = ref(null)

// 當 visible 變化時，重置本地狀態
watch(() => props.visible, (visible) => {
  if (visible) {
    // 深拷貝配置作為原始狀態和編輯狀態
    originalConfig.value = JSON.parse(JSON.stringify(props.moduleConfig))
    localConfig.value = JSON.parse(JSON.stringify(props.moduleConfig))
    // 收起所有欄位編輯器
    expandedModuleUid.value = null
  }
})

// 切換欄位編輯器展開狀態
function toggleColumnEditor(uid) {
  if (expandedModuleUid.value === uid) {
    expandedModuleUid.value = null
  } else {
    expandedModuleUid.value = uid
  }
}

// 更新模組的欄位配置
function updateColumnConfig(uid, columnConfig) {
  const config = localConfig.value.find(c => c.uid === uid)
  if (config) {
    config.columns = columnConfig
  }
}

// 取得模組的欄位配置（若無則使用預設）
function getModuleColumnConfig(uid) {
  const config = localConfig.value.find(c => c.uid === uid)
  return config?.columns || getDefaultColumnConfig(uid)
}

// 當 localConfig 變化時，即時通知父元件預覽
watch(localConfig, (newConfig) => {
  emit('preview', JSON.parse(JSON.stringify(newConfig)))
}, { deep: true })

// 取得模組定義
function getModuleInfo(config) {
  // 如果是自訂模組，資訊直接在 config 中
  if (config.isCustom) {
    return {
      uid: config.uid,
      name: config.name,
      icon: config.icon || '📊',
      description: config.description || '自訂模組'
    }
  }
  // 內建模組從 registry 查詢
  return allModules.find(m => m.uid === config.uid)
}

// 切換模組啟用狀態
function toggleModule(uid) {
  const config = localConfig.value.find(c => c.uid === uid)
  if (config) {
    config.enabled = !config.enabled
  }
}

// 移動模組順序
function moveModule(uid, direction) {
  const index = localConfig.value.findIndex(c => c.uid === uid)
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
}

// 拖曳相關
const draggedItem = ref(null)

function onDragStart(event, uid) {
  draggedItem.value = uid
  event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

function onDrop(event, targetUid) {
  event.preventDefault()
  if (!draggedItem.value || draggedItem.value === targetUid) return

  const fromIndex = localConfig.value.findIndex(c => c.uid === draggedItem.value)
  const toIndex = localConfig.value.findIndex(c => c.uid === targetUid)

  if (fromIndex < 0 || toIndex < 0) return

  // 移動元素
  const item = localConfig.value.splice(fromIndex, 1)[0]
  localConfig.value.splice(toIndex, 0, item)

  // 更新 order
  localConfig.value.forEach((c, i) => {
    c.order = i + 1
  })

  draggedItem.value = null
}

function onDragEnd() {
  draggedItem.value = null
}

// 儲存配置
function saveConfig() {
  emit('save', localConfig.value)
}

// 取消並恢復原始狀態
function cancelEdit() {
  emit('cancel', originalConfig.value)
  emit('close')
}

// 重置為預設
function resetToDefault() {
  localConfig.value = allModules
    .filter(m => m.defaultEnabled)
    .map(m => ({
      uid: m.uid,
      enabled: true,
      order: m.defaultOrder,
      options: { ...m.options }
    }))
    .sort((a, b) => a.order - b.order)
}

// 是否有變更（與開啟時的原始配置比較）
const hasChanges = computed(() => {
  return JSON.stringify(localConfig.value) !== JSON.stringify(originalConfig.value)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="cancelEdit">
      <div class="modal-content module-editor">
        <div class="modal-header">
          <h3>編輯模組配置</h3>
          <button class="close-btn" @click="cancelEdit">&times;</button>
        </div>

        <div class="modal-body">
          <p class="hint">拖曳調整順序，點擊開關切換顯示</p>

          <div class="module-list">
            <div
              v-for="config in localConfig"
              :key="config.uid"
              class="module-wrapper"
            >
              <div
                class="module-item"
                :class="{ disabled: !config.enabled, dragging: draggedItem === config.uid, expanded: expandedModuleUid === config.uid }"
                draggable="true"
                @dragstart="onDragStart($event, config.uid)"
                @dragover="onDragOver"
                @drop="onDrop($event, config.uid)"
                @dragend="onDragEnd"
              >
                <div class="drag-handle">
                  <span class="handle-icon">⋮⋮</span>
                </div>

                <div class="module-info">
                  <span class="module-icon">{{ getModuleInfo(config)?.icon }}</span>
                  <div class="module-text">
                    <span class="module-name">{{ getModuleInfo(config)?.name }}</span>
                    <span class="module-desc">{{ getModuleInfo(config)?.description }}</span>
                    <span v-if="config.isCustom" class="custom-badge">自訂</span>
                  </div>
                </div>

                <div class="module-actions">
                  <button
                    class="move-btn"
                    :disabled="localConfig.indexOf(config) === 0"
                    @click="moveModule(config.uid, -1)"
                    title="上移"
                  >▲</button>
                  <button
                    class="move-btn"
                    :disabled="localConfig.indexOf(config) === localConfig.length - 1"
                    @click="moveModule(config.uid, 1)"
                    title="下移"
                  >▼</button>
                </div>

                <button
                  v-if="!config.isCustom"
                  class="column-btn"
                  :class="{ active: expandedModuleUid === config.uid }"
                  @click.stop="toggleColumnEditor(config.uid)"
                  title="設定欄位"
                >
                  ⚙
                </button>

                <label class="toggle-switch">
                  <input
                    type="checkbox"
                    :checked="config.enabled"
                    @change="toggleModule(config.uid)"
                  >
                  <span class="slider"></span>
                </label>
              </div>

              <!-- 欄位編輯器（展開時顯示，自訂模組不支援） -->
              <ColumnEditor
                v-if="expandedModuleUid === config.uid && !config.isCustom"
                :module-uid="config.uid"
                :module-name="getModuleInfo(config)?.name || config.uid"
                :column-config="getModuleColumnConfig(config.uid)"
                @update="updateColumnConfig(config.uid, $event)"
                @close="expandedModuleUid = null"
              />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="reset-btn" @click="resetToDefault">
            重置為預設
          </button>
          <div class="footer-actions">
            <button class="cancel-btn" @click="cancelEdit">
              取消
            </button>
            <button
              class="save-btn"
              :disabled="!hasChanges || saving"
              @click="saveConfig"
            >
              {{ saving ? '儲存中...' : '儲存' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #1e1e2e;
  border-radius: 12px;
  width: 90%;
  max-width: 580px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.modal-header h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.hint {
  color: #888;
  font-size: 13px;
  margin: 0 0 16px 0;
}

.module-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.module-wrapper {
  display: flex;
  flex-direction: column;
}

.module-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #2a2a3e;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s;
}

.module-item.expanded {
  border-radius: 8px 8px 0 0;
  background: #323248;
}

.module-item:hover {
  background: #323248;
}

.module-item.disabled {
  opacity: 0.5;
}

.module-item.dragging {
  opacity: 0.5;
  transform: scale(1.02);
}

.column-btn {
  background: #3a3a4e;
  border: none;
  color: #888;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.column-btn:hover {
  background: #4a4a5e;
  color: #fff;
}

.column-btn.active {
  background: #4a6a8a;
  color: #7ab8ff;
}

.drag-handle {
  color: #666;
  cursor: grab;
}

.handle-icon {
  font-size: 14px;
  letter-spacing: 2px;
}

.module-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.module-icon {
  font-size: 20px;
}

.module-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.module-name {
  color: #fff;
  font-weight: 500;
  font-size: 14px;
}

.module-desc {
  color: #888;
  font-size: 12px;
}

.custom-badge {
  display: inline-block;
  font-size: 10px;
  background: linear-gradient(135deg, #6b21a8 0%, #9333ea 100%);
  color: #fff;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: 6px;
  font-weight: 500;
}

.module-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.move-btn {
  background: #3a3a4e;
  border: none;
  color: #888;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
}

.move-btn:hover:not(:disabled) {
  background: #4a4a5e;
  color: #fff;
}

.move-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #4a4a5e;
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #4CAF50;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #333;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.reset-btn {
  background: none;
  border: 1px solid #666;
  color: #888;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.reset-btn:hover {
  border-color: #888;
  color: #fff;
}

.cancel-btn {
  background: #3a3a4e;
  border: none;
  color: #fff;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background: #4a4a5e;
}

.save-btn {
  background: #4CAF50;
  border: none;
  color: #fff;
  padding: 8px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.save-btn:hover:not(:disabled) {
  background: #45a049;
}

.save-btn:disabled {
  background: #3a5a3a;
  cursor: not-allowed;
}
</style>
