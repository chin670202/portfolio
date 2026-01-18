<script setup>
/**
 * 模組畫廊元件
 * 顯示所有可用的儀表模組，讓用戶選擇要加入儀表板的模組
 * 獨立於 ModuleEditor，專注於模組的瀏覽和選擇
 */
import { ref, computed, watch, onMounted } from 'vue'
import { Teleport } from 'vue'
import { getAllModules } from './moduleRegistry'
import ModuleCard from './ModuleCard.vue'
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
  }
})

const emit = defineEmits(['close', 'update', 'open-editor'])

// 所有可用模組
const allModules = ref([])

// 選中的模組 UID 集合
const selectedModules = ref(new Set())

// 搜尋關鍵字
const searchQuery = ref('')

// 預覽用的資料（從 test 用戶載入）
const previewData = ref(null)
const previewLoading = ref(false)

// 初始化
onMounted(() => {
  allModules.value = getAllModules()
  loadPreviewData()
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
  }
})

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
  const usdRate = rawData.匯率 || 32

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

// 過濾後的模組列表（依搜尋和熱門度排序）
const filteredModules = computed(() => {
  let modules = [...allModules.value]

  // 搜尋過濾
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
  emit('update', Array.from(selectedModules.value))
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

        <!-- 模組網格 -->
        <div class="gallery-content">
          <div v-if="previewLoading" class="loading-state">
            <span class="spinner"></span>
            <span>載入預覽資料中...</span>
          </div>
          <div v-else class="module-grid">
            <ModuleCard
              v-for="module in filteredModules"
              :key="module.uid"
              :module="module"
              :usage-count="getUsageCount(module.uid)"
              :is-selected="selectedModules.has(module.uid)"
              :preview-data="previewData"
              @toggle="toggleModule"
            />
          </div>
          <div v-if="filteredModules.length === 0 && !previewLoading" class="empty-state">
            <span>找不到符合的模組</span>
          </div>
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

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.loading-state,
.empty-state {
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
}
</style>
