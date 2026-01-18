<script setup>
/**
 * 模組畫廊元件
 * 顯示所有可用的儀表模組，讓用戶選擇要加入儀表板的模組
 * 分為「公用模組」和「自訂模組」兩區
 * 包含「設計我的儀表模組」功能，讓用戶透過 AI 對話創造自訂模組
 */
import { ref, computed, watch, onMounted } from 'vue'
import { Teleport } from 'vue'
import { getBuiltinModules } from './registry'
import ModuleCard from './ModuleCard.vue'
import ModuleDesigner from './ModuleDesigner.vue'
import {
  calculateBondDerivedData,
  calculateEtfDerivedData,
  calculateOtherAssetDerivedData,
  calculateLoanDerivedData,
  calculateBondSubtotal,
  calculateEtfSubtotal,
  calculateOtherAssetSubtotal,
  calculateLoanTotal
} from '../services/calculator'

const props = defineProps({
  // 控制顯示
  visible: {
    type: Boolean,
    default: false
  },
  // 用戶目前的模組配置
  currentConfig: {
    type: Array,
    default: () => []
  },
  // 模組使用統計
  moduleStats: {
    type: Object,
    default: () => ({})
  },
  // 當前用戶名（用於自訂模組）
  username: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'update', 'open-editor', 'module-saved', 'module-deleted'])

// 所有可用模組
const allModules = ref([])

// 自訂模組列表
const customModules = ref([])

// 模組設計器顯示狀態
const showDesigner = ref(false)

// 編輯模式的模組（null 表示新建）
const editingModule = ref(null)

// 刪除確認對話框
const deleteConfirm = ref({ visible: false, module: null })

// 刪除中的狀態
const deleting = ref(false)

// 選中的模組 UID 集合
const selectedModules = ref(new Set())

// 搜尋關鍵字
const searchQuery = ref('')

// 預覽用的資料（從 test 用戶載入）
const previewData = ref(null)
const previewLoading = ref(false)

// 初始化
onMounted(() => {
  allModules.value = getBuiltinModules()
  loadPreviewData()
  loadCustomModules()
})

// 監聽 visible 變化，初始化選中狀態
watch(() => props.visible, (visible) => {
  if (visible) {
    // 從 currentConfig 初始化選中的模組
    selectedModules.value = new Set(
      props.currentConfig
        .filter(m => m.enabled)
        .map(m => m.uid)
    )
    // 重新載入自訂模組
    loadCustomModules()
  }
})

// 載入自訂模組
async function loadCustomModules() {
  if (!props.username) return
  try {
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const apiKey = import.meta.env.VITE_API_KEY || ''
    const response = await fetch(`${serverUrl}/api/modules/users/${props.username}`, {
      headers: { 'X-API-Key': apiKey }
    })
    if (response.ok) {
      const data = await response.json()
      customModules.value = data.modules || []
    } else {
      // 嘗試舊 API
      const oldResponse = await fetch(`${serverUrl}/modules/custom/${props.username}`, {
        headers: { 'X-API-Key': apiKey }
      })
      if (oldResponse.ok) {
        const data = await oldResponse.json()
        customModules.value = data.modules || []
      }
    }
  } catch (err) {
    console.warn('[ModuleGallery] 載入自訂模組失敗:', err)
  }
}

// 載入預覽資料（使用 test 用戶）
async function loadPreviewData() {
  previewLoading.value = true
  try {
    const response = await fetch('/data/test.json')
    if (response.ok) {
      const data = await response.json()
      // 計算預覽用的資料
      previewData.value = calculatePreviewProps(data)
    }
  } catch (err) {
    console.warn('[ModuleGallery] 載入預覽資料失敗:', err)
    previewData.value = getMockPreviewData()
  } finally {
    previewLoading.value = false
  }
}

// 計算各模組的預覽 props
function calculatePreviewProps(rawData) {
  // 匯率可能是數字或物件 { 美元匯率: number }
  const usdRate = typeof rawData.匯率 === 'object'
    ? (rawData.匯率?.美元匯率 || 32)
    : (rawData.匯率 || 32)

  // 海外債券
  const calculatedBonds = (rawData.股票 || []).map(bond =>
    calculateBondDerivedData(bond, usdRate)
  )
  const bondSubtotal = calculateBondSubtotal(calculatedBonds, [])

  // ETF
  const calculatedEtfs = (rawData.ETF || []).map(etf =>
    calculateEtfDerivedData(etf, usdRate)
  )
  const etfSubtotal = calculateEtfSubtotal(calculatedEtfs, [])

  // 其他資產
  const calculatedOtherAssets = (rawData.其它資產 || []).map(asset =>
    calculateOtherAssetDerivedData(asset, usdRate)
  )
  const otherAssetSubtotal = calculateOtherAssetSubtotal(calculatedOtherAssets)

  // 貸款
  const calculatedLoans = (rawData.貸款 || []).map(loan =>
    calculateLoanDerivedData(loan)
  )
  const loanTotal = calculateLoanTotal(calculatedLoans)

  // 資產記錄
  const assetHistoryRecords = rawData.資產變化記錄 || []

  // 計算總資產
  const totalAssets = bondSubtotal.台幣資產 + etfSubtotal.台幣資產 + otherAssetSubtotal.台幣資產

  return {
    calculatedBonds,
    bondSubtotal,
    bondLoanDetails: [],
    calculatedEtfs,
    etfSubtotal,
    etfLoanDetails: [],
    calculatedOtherAssets,
    otherAssetSubtotal,
    calculatedLoans,
    loanTotal,
    assetHistoryRecords,
    priceStatus: {},
    totalAssets,
    exchangeRate: usdRate,
    newsData: {},
    getNewsCount: () => 0,
    isNewsLoading: () => false,
    highlightSymbol: ''
  }
}

// 備用的模擬資料
function getMockPreviewData() {
  return {
    calculatedBonds: [],
    bondSubtotal: { 台幣資產: 0, 每年利息: 0 },
    bondLoanDetails: [],
    calculatedEtfs: [],
    etfSubtotal: { 台幣資產: 0, 每年利息: 0 },
    etfLoanDetails: [],
    calculatedOtherAssets: [],
    otherAssetSubtotal: { 台幣資產: 0 },
    calculatedLoans: [],
    loanTotal: { 貸款餘額: 0, 每年利息: 0, 月繳金額: 0 },
    assetHistoryRecords: [],
    priceStatus: {},
    totalAssets: 0,
    newsData: {},
    getNewsCount: () => 0,
    isNewsLoading: () => false,
    highlightSymbol: ''
  }
}

// 過濾後的公用模組列表
const filteredBuiltinModules = computed(() => {
  let modules = [...allModules.value]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    modules = modules.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.description.toLowerCase().includes(query)
    )
  }

  // 依熱門度排序
  modules.sort((a, b) => {
    const countA = props.moduleStats[a.uid] || 0
    const countB = props.moduleStats[b.uid] || 0
    return countB - countA
  })

  return modules
})

// 過濾後的自訂模組列表
const filteredCustomModules = computed(() => {
  let modules = [...customModules.value]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    modules = modules.filter(m =>
      m.name.toLowerCase().includes(query) ||
      (m.description || '').toLowerCase().includes(query)
    )
  }

  // 依建立時間排序（新的在前）
  modules.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0)
    const dateB = new Date(b.createdAt || 0)
    return dateB - dateA
  })

  return modules
})

// 取得模組的使用人數
function getUsageCount(uid) {
  return props.moduleStats[uid] || 0
}

// 切換模組選擇狀態
function toggleModule(uid) {
  if (selectedModules.value.has(uid)) {
    selectedModules.value.delete(uid)
  } else {
    selectedModules.value.add(uid)
  }
  // 觸發響應式更新
  selectedModules.value = new Set(selectedModules.value)
}

// 是否有變更
const hasChanges = computed(() => {
  const currentUids = new Set(
    props.currentConfig.filter(m => m.enabled).map(m => m.uid)
  )
  if (currentUids.size !== selectedModules.value.size) return true
  for (const uid of selectedModules.value) {
    if (!currentUids.has(uid)) return true
  }
  return false
})

// 選中數量
const selectedCount = computed(() => selectedModules.value.size)

// 確認選擇
function confirmSelection() {
  // 傳遞選中的 uid 列表和自訂模組的完整資訊
  const selectedUids = Array.from(selectedModules.value)
  const customModuleMap = {}

  // 建立自訂模組的完整資訊映射
  for (const module of customModules.value) {
    if (selectedUids.includes(module.uid)) {
      customModuleMap[module.uid] = module
    }
  }

  emit('update', { selectedUids, customModuleMap })
  emit('close')
}

// 關閉
function close() {
  emit('close')
}

// 開啟進階設定（ModuleEditor）
function openEditor() {
  emit('close')
  emit('open-editor')
}

// 開啟模組設計器（新建）
function openDesigner() {
  editingModule.value = null
  showDesigner.value = true
}

// 編輯自訂模組
function editModule(module) {
  editingModule.value = module
  showDesigner.value = true
}

// 關閉模組設計器
function closeDesigner() {
  showDesigner.value = false
  editingModule.value = null
}

// 模組設計器儲存回調
function handleDesignerSave(moduleSpec) {
  // 重新載入自訂模組列表
  loadCustomModules()
  // 通知父元件
  emit('module-saved', moduleSpec)
  // 關閉設計器
  showDesigner.value = false
  editingModule.value = null
}

// 顯示刪除確認
function showDeleteConfirm(module) {
  deleteConfirm.value = { visible: true, module }
}

// 取消刪除
function cancelDelete() {
  deleteConfirm.value = { visible: false, module: null }
}

// 確認刪除
async function confirmDelete() {
  const module = deleteConfirm.value.module
  if (!module) return

  deleting.value = true
  try {
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const apiKey = import.meta.env.VITE_API_KEY || ''

    // 嘗試新 API
    let response = await fetch(`${serverUrl}/api/modules/users/${props.username}/${module.uid}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey }
    })

    // 若失敗嘗試舊 API
    if (!response.ok) {
      response = await fetch(`${serverUrl}/modules/custom/${props.username}/${module.uid}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey }
      })
    }

    if (response.ok) {
      // 從選中列表移除
      selectedModules.value.delete(module.uid)
      selectedModules.value = new Set(selectedModules.value)

      // 重新載入
      await loadCustomModules()

      // 通知父元件
      emit('module-deleted', module)
    } else {
      const error = await response.json()
      console.error('刪除模組失敗:', error)
      alert('刪除失敗: ' + (error.message || '未知錯誤'))
    }
  } catch (err) {
    console.error('刪除模組失敗:', err)
    alert('刪除失敗: ' + err.message)
  } finally {
    deleting.value = false
    deleteConfirm.value = { visible: false, module: null }
  }
}

// 合併內建模組和自訂模組的列表（向後相容）
const allModulesWithCustom = computed(() => {
  return [...allModules.value, ...customModules.value]
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="gallery-overlay" @click.self="close">
      <div class="gallery-modal">
        <!-- 標題列 -->
        <div class="gallery-header">
          <div class="header-title">
            <h2>瀏覽儀表模組</h2>
            <span class="selected-count">已選 {{ selectedCount }} 個模組</span>
          </div>
          <button class="close-btn" @click="close">&times;</button>
        </div>

        <!-- 搜尋列 -->
        <div class="gallery-search">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋模組..."
            class="search-input"
          />
        </div>

        <!-- 模組內容 -->
        <div class="gallery-content">
          <div v-if="previewLoading" class="loading-state">
            <span class="spinner"></span>
            <span>載入預覽資料中...</span>
          </div>

          <template v-else>
            <!-- ════════════════════════════════════════ -->
            <!-- 公用模組區 -->
            <!-- ════════════════════════════════════════ -->
            <div class="module-section">
              <div class="section-header">
                <h3>公用模組</h3>
                <span class="section-count">{{ filteredBuiltinModules.length }} 個</span>
              </div>
              <div class="module-grid">
                <ModuleCard
                  v-for="module in filteredBuiltinModules"
                  :key="module.uid"
                  :module="module"
                  :usage-count="getUsageCount(module.uid)"
                  :is-selected="selectedModules.has(module.uid)"
                  :preview-data="previewData"
                  @toggle="toggleModule"
                />
              </div>
              <div v-if="filteredBuiltinModules.length === 0" class="empty-section">
                找不到符合的公用模組
              </div>
            </div>

            <!-- ════════════════════════════════════════ -->
            <!-- 自訂模組區 -->
            <!-- ════════════════════════════════════════ -->
            <div class="module-section custom-section">
              <div class="section-header">
                <h3>
                  <span class="custom-icon">✨</span>
                  我的自訂模組
                </h3>
                <span class="section-count">{{ filteredCustomModules.length }} 個</span>
              </div>

              <div class="module-grid">
                <!-- 設計我的儀表模組 - 特殊入口卡片 -->
                <div class="design-card" @click="openDesigner">
                  <div class="design-icon">✨</div>
                  <h3>設計新模組</h3>
                  <p>透過 AI 對話創造專屬的儀表模組</p>
                  <div class="design-hint">支援文字描述或上傳圖片</div>
                </div>

                <!-- 自訂模組卡片（帶編輯/刪除按鈕） -->
                <div
                  v-for="module in filteredCustomModules"
                  :key="module.uid"
                  class="custom-module-card"
                  :class="{ 'is-selected': selectedModules.has(module.uid) }"
                >
                  <!-- 選擇 checkbox -->
                  <div class="card-checkbox">
                    <input
                      type="checkbox"
                      :checked="selectedModules.has(module.uid)"
                      @click.stop
                      @change="toggleModule(module.uid)"
                    />
                  </div>

                  <!-- 操作按鈕 -->
                  <div class="card-actions">
                    <button
                      class="action-btn edit-btn"
                      title="編輯模組"
                      @click.stop="editModule(module)"
                    >
                      <span>✏️</span>
                    </button>
                    <button
                      class="action-btn delete-btn"
                      title="刪除模組"
                      @click.stop="showDeleteConfirm(module)"
                    >
                      <span>🗑️</span>
                    </button>
                  </div>

                  <!-- 卡片內容（點擊切換選擇） -->
                  <div class="card-body" @click="toggleModule(module.uid)">
                    <div class="card-preview">
                      <div class="preview-placeholder">
                        <span class="preview-icon">{{ module.icon || '📊' }}</span>
                      </div>
                    </div>
                    <div class="card-info">
                      <div class="card-header">
                        <span class="card-icon">{{ module.icon || '📊' }}</span>
                        <h4 class="card-title">{{ module.name }}</h4>
                        <span class="custom-badge">自訂</span>
                      </div>
                      <p class="card-description">{{ module.description || '自訂儀表模組' }}</p>
                      <div class="card-meta">
                        <span class="meta-item">
                          {{ new Date(module.createdAt || module.updatedAt).toLocaleDateString() }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="filteredCustomModules.length === 0 && !searchQuery" class="empty-section">
                <p>還沒有自訂模組</p>
                <p class="empty-hint">點擊上方「設計新模組」開始創建</p>
              </div>
              <div v-else-if="filteredCustomModules.length === 0" class="empty-section">
                找不到符合的自訂模組
              </div>
            </div>
          </template>
        </div>

        <!-- 底部按鈕 -->
        <div class="gallery-footer">
          <button class="btn-advanced" @click="openEditor" title="調整模組順序與欄位配置">
            ⚙️ 進階設定
          </button>
          <div class="footer-actions">
            <button class="btn-cancel" @click="close">取消</button>
            <button
              class="btn-confirm"
              :disabled="!hasChanges"
              @click="confirmSelection"
            >
              確認選擇
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 刪除確認對話框 -->
    <div v-if="deleteConfirm.visible" class="delete-overlay" @click.self="cancelDelete">
      <div class="delete-modal">
        <h3>確認刪除</h3>
        <p>確定要刪除「{{ deleteConfirm.module?.name }}」模組嗎？</p>
        <p class="delete-warning">此操作無法復原</p>
        <div class="delete-actions">
          <button class="btn-cancel" @click="cancelDelete" :disabled="deleting">取消</button>
          <button class="btn-delete" @click="confirmDelete" :disabled="deleting">
            {{ deleting ? '刪除中...' : '確認刪除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 模組設計器 -->
    <ModuleDesigner
      :visible="showDesigner"
      :username="username"
      :preview-data="previewData"
      :editing-module="editingModule"
      @close="closeDesigner"
      @save="handleDesignerSave"
    />
  </Teleport>
</template>

<style scoped>
.gallery-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.gallery-modal {
  background: #1e1e2e;
  border-radius: 16px;
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #2a2a3e;
}

.header-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.header-title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.selected-count {
  font-size: 14px;
  color: #4CAF50;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #fff;
}

.gallery-search {
  padding: 16px 24px;
  border-bottom: 1px solid #2a2a3e;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  background: #2a2a3e;
  border: 1px solid #3a3a4e;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #4CAF50;
}

.search-input::placeholder {
  color: #666;
}

.gallery-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* 模組區段 */
.module-section {
  margin-bottom: 32px;
}

.module-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #2a2a3e;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-icon {
  font-size: 18px;
}

.section-count {
  font-size: 13px;
  color: #888;
  background: #2a2a3e;
  padding: 2px 10px;
  border-radius: 12px;
}

.custom-section .section-header {
  border-bottom-color: #3a2a4e;
}

.custom-section .section-header h3 {
  color: #c084fc;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

/* 設計卡片 - 特殊入口 */
.design-card {
  background: linear-gradient(135deg, #6b21a8 0%, #9333ea 50%, #c084fc 100%);
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 180px;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.design-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30%, 30%); }
}

.design-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(147, 51, 234, 0.4);
  border-color: rgba(255, 255, 255, 0.2);
}

.design-icon {
  font-size: 48px;
  margin-bottom: 12px;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}

.design-card h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.design-card p {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.design-hint {
  margin-top: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(0, 0, 0, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
}

/* 自訂模組卡片 */
.custom-module-card {
  background: #2a2a3e;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
}

.custom-module-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  border-color: #4a4a6a;
}

.custom-module-card.is-selected {
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
}

.custom-module-card .card-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
}

.custom-module-card .card-checkbox input[type="checkbox"] {
  width: 22px;
  height: 22px;
  cursor: pointer;
  accent-color: #4CAF50;
}

.custom-module-card .card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.custom-module-card:hover .card-actions {
  opacity: 1;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.edit-btn {
  background: #3a4a5a;
  color: #fff;
}

.edit-btn:hover {
  background: #4a5a6a;
}

.delete-btn {
  background: #5a3a3a;
  color: #fff;
}

.delete-btn:hover {
  background: #7a4a4a;
}

.card-body {
  display: flex;
  flex-direction: column;
}

.custom-module-card .card-preview {
  width: 100%;
  height: 100px;
  background: #1e1e2e;
  overflow: hidden;
  position: relative;
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
  font-size: 40px;
  opacity: 0.6;
}

.custom-module-card .card-info {
  padding: 16px;
}

.custom-module-card .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.card-icon {
  font-size: 18px;
}

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-badge {
  font-size: 10px;
  background: linear-gradient(135deg, #6b21a8 0%, #9333ea 100%);
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.card-description {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #a0a0b0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-item {
  font-size: 12px;
  color: #666;
}

/* 空狀態 */
.empty-section {
  text-align: center;
  padding: 40px 20px;
  color: #888;
}

.empty-section p {
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 13px;
  color: #666;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: #888;
  font-size: 16px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #3a3a4e;
  border-top-color: #4CAF50;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 刪除確認對話框 */
.delete-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.delete-modal {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  text-align: center;
}

.delete-modal h3 {
  margin: 0 0 16px 0;
  color: #fff;
  font-size: 18px;
}

.delete-modal p {
  margin: 0 0 12px 0;
  color: #ccc;
}

.delete-warning {
  color: #e74c3c !important;
  font-size: 13px;
}

.delete-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

.btn-delete {
  background: #e74c3c;
  border: none;
  color: #fff;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-delete:hover:not(:disabled) {
  background: #c0392b;
}

.btn-delete:disabled {
  background: #5a3a3a;
  cursor: not-allowed;
}

/* 底部 */
.gallery-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #2a2a3e;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.btn-advanced {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  background: transparent;
  border: 1px solid #3a3a4e;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-advanced:hover {
  background: #2a2a3e;
  color: #fff;
  border-color: #4a4a5e;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #3a3a4e;
  border: none;
  color: #fff;
}

.btn-cancel:hover {
  background: #4a4a5e;
}

.btn-confirm {
  background: #4CAF50;
  border: none;
  color: #fff;
}

.btn-confirm:hover:not(:disabled) {
  background: #45a049;
}

.btn-confirm:disabled {
  background: #3a3a4e;
  color: #666;
  cursor: not-allowed;
}

/* 響應式 */
@media (max-width: 768px) {
  .gallery-modal {
    max-height: 100vh;
    border-radius: 0;
  }

  .module-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }

  .gallery-header {
    padding: 16px;
  }

  .gallery-content {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .module-grid {
    grid-template-columns: 1fr;
  }

  .custom-module-card .card-actions {
    opacity: 1;
  }
}
</style>
