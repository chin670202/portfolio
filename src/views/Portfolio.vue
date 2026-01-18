<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import NewsModal from '../components/NewsModal.vue'
import QuickUpdate from '../components/QuickUpdate.vue'
import { ModuleContainer, getDefaultModuleConfig } from '../modules'
import ModuleEditor from '../modules/ModuleEditor.vue'
import { updateService } from '../config'
import { formatNumber, formatWan } from '../utils/format'
import {
  calculateBondDerivedData,
  calculateEtfDerivedData,
  calculateOtherAssetDerivedData,
  calculateLoanDerivedData,
  calculateBondSubtotal,
  calculateEtfSubtotal,
  calculateOtherAssetSubtotal,
  calculateLoanTotal,
  calculateGrandTotal,
  calculateNetIncome
} from '../services/calculator'
import { getBondPrice, getStockPrice, getLatestDividend, getNextDividendDate, getCryptoPrice, getUsdTwdRate, getUsStockPrice } from '../services/api'
import { useNews } from '../composables/useNews'
import packageJson from '../../package.json'

const route = useRoute()
const appVersion = packageJson.version
const rawData = ref(null)
const loading = ref(true)
const error = ref(null)
const updating = ref(false)
const lastUpdateTime = ref(null)
const currentUsername = computed(() => route.params.username || 'chin')
// 顯示名稱（優先使用 JSON 中的顯示名稱，若無則用帳號）
const displayName = computed(() => rawData.value?.顯示名稱 || currentUsername.value)

// 價格狀態追蹤: { [代號]: { loading: boolean, failed: boolean } }
const priceStatus = ref({})

// 模組配置（從用戶 JSON 載入，若無則使用預設）
const moduleConfig = ref(getDefaultModuleConfig())

// 模組編輯器狀態
const showModuleEditor = ref(false)
const savingModuleConfig = ref(false)

// 新聞管理（使用 composable）
const {
  newsData,
  showModal: showNewsModal,
  currentTitle: currentNewsTitle,
  currentSymbol,
  currentNews,
  modalLoading: newsLoading,
  openModal: openNewsModal,
  closeModal: closeNewsModal,
  hasNews,
  hasNegativeNews,
  getNewsCount,
  isLoading: isNewsLoading,
  fetchBatchNews,
  filterMode: newsFilterMode,
  setFilterMode: setNewsFilterMode
} = useNews()

// 美股代號列表（與 OtherAssetsTable 一致）
const usStockSymbols = ['TSLA', 'GLDM', 'SIVR', 'COPX', 'VOO']
const isCrypto = (symbol) => symbol.includes('/TWD')
const isTwStock = (symbol) => /^\d/.test(symbol) && !isCrypto(symbol)

// 所有商品列表（用於新聞滾輪切換，順序與畫面一致）
// 使用唯一 ID 避免重複代號問題
const allProducts = computed(() => {
  if (!rawData.value) return []
  const products = []
  // 1. 海外債券（使用索引建立唯一 ID）
  rawData.value.股票.forEach((bond, idx) => {
    products.push({ id: `bond_${idx}`, symbol: bond.代號, name: bond.公司名稱 })
  })
  // 2. ETF
  rawData.value.ETF.forEach((etf, idx) => {
    products.push({ id: `etf_${idx}`, symbol: etf.代號, name: etf.名稱 })
  })
  // 3. 其它資產（按畫面順序：美股 → 台股 → 加密貨幣）
  const otherAssets = rawData.value.其它資產
  // 美股
  otherAssets.filter(a => usStockSymbols.includes(a.代號)).forEach((asset, idx) => {
    products.push({ id: `us_${idx}`, symbol: asset.代號, name: asset.名稱 })
  })
  // 台股
  otherAssets.filter(a => isTwStock(a.代號)).forEach((asset, idx) => {
    products.push({ id: `tw_${idx}`, symbol: asset.代號, name: asset.名稱 })
  })
  // 加密貨幣
  otherAssets.filter(a => isCrypto(a.代號)).forEach((asset, idx) => {
    products.push({ id: `crypto_${idx}`, symbol: asset.代號, name: asset.名稱 })
  })
  return products
})

// 當前商品的唯一 ID（用於追蹤導航位置）
const currentProductId = ref('')

// 當前商品在列表中的索引
const currentProductIndex = computed(() => {
  // 優先用 ID 查找（避免重複代號問題）
  if (currentProductId.value) {
    const idx = allProducts.value.findIndex(p => p.id === currentProductId.value)
    if (idx >= 0) return idx
  }
  // 備用：用 symbol 查找
  const idx = allProducts.value.findIndex(p => p.symbol === currentSymbol.value)
  return idx >= 0 ? idx : 0
})

// 高亮的商品代號（只在 modal 打開時才高亮）
// 注意：重複代號會同時高亮，這是預期行為
const highlightSymbol = computed(() => {
  return showNewsModal.value ? currentSymbol.value : ''
})

// 判斷是否為債券（用於彈窗標題）
const isBondSymbol = (symbol) => {
  if (!rawData.value) return false
  return rawData.value.股票.some(bond => bond.代號 === symbol)
}

// 彈窗標題（非債券加上代號）
const newsModalTitle = computed(() => {
  if (!currentSymbol.value) return currentNewsTitle.value
  if (isBondSymbol(currentSymbol.value)) {
    return currentNewsTitle.value
  }
  return `${currentNewsTitle.value} (${currentSymbol.value})`
})

// 處理新聞彈窗的導航
function handleNewsNavigate(direction) {
  const products = allProducts.value
  if (products.length <= 1) return

  let newIndex = currentProductIndex.value + direction
  // 循環導航
  if (newIndex < 0) newIndex = products.length - 1
  if (newIndex >= products.length) newIndex = 0

  const product = products[newIndex]
  // 更新 ID 追蹤（避免重複代號問題）
  currentProductId.value = product.id
  openNewsModal(product.symbol, product.name)
}

// 封裝開啟新聞 Modal（從表格點擊時用）
function handleOpenNews(symbol, name) {
  // 根據 symbol 找到對應的 product（如果有重複，取第一個）
  const product = allProducts.value.find(p => p.symbol === symbol)
  if (product) {
    currentProductId.value = product.id
  }
  openNewsModal(symbol, name)
}

// 計算後的債券資料
const calculatedBonds = computed(() => {
  if (!rawData.value) return []
  const usdRate = rawData.value.匯率.美元匯率
  return rawData.value.股票.map(bond => calculateBondDerivedData(bond, usdRate))
})

// 計算後的 ETF 資料
const calculatedEtfs = computed(() => {
  if (!rawData.value) return []
  return rawData.value.ETF.map(etf => calculateEtfDerivedData(etf))
})

// 計算後的其他資產資料
const calculatedOtherAssets = computed(() => {
  if (!rawData.value) return []
  const usdRate = rawData.value.匯率.美元匯率
  return rawData.value.其它資產.map(asset => calculateOtherAssetDerivedData(asset, usdRate))
})

// 計算後的貸款資料
const calculatedLoans = computed(() => {
  if (!rawData.value) return []
  return rawData.value.貸款.map(loan => calculateLoanDerivedData(loan))
})

// 取得特定用途的貸款餘額
const getLoanBalanceByUsage = (usage) => {
  return calculatedLoans.value
    .filter(loan => loan.用途 === usage)
    .reduce((sum, loan) => sum + loan.貸款餘額, 0)
}

// 債券小計（需要金交債相關貸款餘額來計算維持率）
const bondSubtotal = computed(() => {
  if (!calculatedBonds.value.length) return {}
  // 查找包含「金交債」的貸款，加總所有金交債相關貸款
  const bondLoans = calculatedLoans.value.filter(l => l.貸款別.includes('金交債'))
  const totalBondLoan = bondLoans.reduce((sum, l) => sum + l.貸款餘額, 0)
  return calculateBondSubtotal(calculatedBonds.value, totalBondLoan, 0)
})

// ETF 小計（需要股票質借相關貸款餘額來計算維持率）
const etfSubtotal = computed(() => {
  if (!calculatedEtfs.value.length) return {}
  // 查找包含「股票」的貸款，加總所有股票相關貸款
  const etfLoans = calculatedLoans.value.filter(l => l.貸款別.includes('股票'))
  const totalEtfLoan = etfLoans.reduce((sum, l) => sum + l.貸款餘額, 0)
  return calculateEtfSubtotal(calculatedEtfs.value, totalEtfLoan, 0)
})

// 其他資產小計
const otherAssetSubtotal = computed(() => {
  if (!calculatedOtherAssets.value.length) return { 台幣資產: 0 }
  return calculateOtherAssetSubtotal(calculatedOtherAssets.value)
})

// 貸款總計
const loanTotal = computed(() => {
  if (!calculatedLoans.value.length) return {}
  return calculateLoanTotal(calculatedLoans.value)
})

// 投資總計
const grandTotal = computed(() => {
  if (!bondSubtotal.value.台幣資產) return {}
  return calculateGrandTotal(bondSubtotal.value, etfSubtotal.value, otherAssetSubtotal.value)
})

// 全年淨收入
const netIncome = computed(() => {
  if (!grandTotal.value.每年利息) return 0
  return calculateNetIncome(grandTotal.value.每年利息, loanTotal.value.每年利息)
})

// 股票（海外債券）的貸款明細 - 查找包含「金交債」的貸款
const bondLoanDetails = computed(() => {
  const loans = calculatedLoans.value.filter(l => l.貸款別.includes('金交債'))
  return loans.map(l => ({ name: l.貸款別, value: l.貸款餘額 }))
})

// ETF 的貸款明細 - 查找包含「股票」的貸款
const etfLoanDetails = computed(() => {
  const loans = calculatedLoans.value.filter(l => l.貸款別.includes('股票'))
  return loans.map(l => ({ name: l.貸款別, value: l.貸款餘額 }))
})

// 傳遞給 ModuleContainer 的所有 props
const moduleProps = computed(() => ({
  // 海外債券模組需要的資料
  calculatedBonds: calculatedBonds.value,
  bondSubtotal: bondSubtotal.value,
  bondLoanDetails: bondLoanDetails.value,

  // 股票/ETF 模組需要的資料
  calculatedEtfs: calculatedEtfs.value,
  etfSubtotal: etfSubtotal.value,
  etfLoanDetails: etfLoanDetails.value,

  // 無配息資產模組需要的資料
  calculatedOtherAssets: calculatedOtherAssets.value,
  otherAssetSubtotal: otherAssetSubtotal.value,

  // 貸款模組需要的資料
  calculatedLoans: calculatedLoans.value,
  loanTotal: loanTotal.value,

  // 資產變化記錄模組需要的資料
  assetHistoryRecords: rawData.value?.資產變化記錄 || [],

  // 共用資料
  priceStatus: priceStatus.value,
  totalAssets: grandTotal.value?.台幣資產 || 0,
  newsData: newsData.value,
  getNewsCount,
  isNewsLoading,
  highlightSymbol: highlightSymbol.value
}))

// 輔助函式：更新價格並追蹤狀態
async function updatePriceWithStatus(key, fetchFn, onSuccess) {
  priceStatus.value[key] = { loading: true, failed: false }
  try {
    const result = await fetchFn()
    if (typeof result === 'number') {
      onSuccess(result)
      priceStatus.value[key] = { loading: false, failed: false }
    } else if (typeof result === 'string') {
      const parsed = parseFloat(result)
      if (!isNaN(parsed) && parsed > 0) {
        onSuccess(parsed)
        priceStatus.value[key] = { loading: false, failed: false }
      } else {
        // 抓取失敗，保留舊值，標記為 failed
        priceStatus.value[key] = { loading: false, failed: true }
      }
    }
  } catch (e) {
    console.error(`${key} 更新失敗:`, e)
    priceStatus.value[key] = { loading: false, failed: true }
  }
}

// 更新所有價格
async function updateAllPrices() {
  if (!rawData.value || updating.value) return

  updating.value = true

  try {
    // 更新美元匯率
    await updatePriceWithStatus('匯率', getUsdTwdRate, (rate) => {
      rawData.value.匯率.美元匯率 = rate
    })

    // 更新海外債券價格 (並行)
    const bondPromises = rawData.value.股票.map(bond =>
      updatePriceWithStatus(`bond_${bond.代號}`, () => getBondPrice(bond.代號), (price) => {
        bond.最新價格 = price
      })
    )
    await Promise.all(bondPromises)

    // 更新 ETF 價格和配息資料 (並行)
    const etfPromises = rawData.value.ETF.map(async etf => {
      // 價格
      await updatePriceWithStatus(`etf_${etf.代號}`, () => getStockPrice(etf.代號), (price) => {
        etf.最新價格 = price
      })
      // 配息
      await updatePriceWithStatus(`etf_div_${etf.代號}`, () => getLatestDividend(etf.代號), (dividend) => {
        etf.每股配息 = dividend
      })
      // 下次配息日
      try {
        const nextDate = await getNextDividendDate(etf.代號)
        if (typeof nextDate === 'string' && nextDate.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
          etf.下次配息日 = nextDate
        }
      } catch (e) {
        console.error(`ETF ${etf.代號} 配息日更新失敗:`, e)
      }
    })
    await Promise.all(etfPromises)

    // 更新其他資產價格 (並行)
    const cryptoMapping = { 'BTC/TWD': 'bitcoin', 'ETH/TWD': 'ethereum' }
    const usStockSymbols = ['TSLA', 'GLDM', 'SIVR', 'COPX', 'VOO']
    // 台股代號格式：數字開頭（如 00635U, 2330）
    const isTwStock = (symbol) => /^\d/.test(symbol)

    const otherPromises = rawData.value.其它資產.map(asset => {
      const coinId = cryptoMapping[asset.代號]
      if (coinId) {
        return updatePriceWithStatus(`other_${asset.代號}`, () => getCryptoPrice(coinId, 'twd'), (price) => {
          asset.最新價格 = price
        })
      } else if (usStockSymbols.includes(asset.代號)) {
        return updatePriceWithStatus(`other_${asset.代號}`, () => getUsStockPrice(asset.代號), (price) => {
          asset.最新價格 = price
        })
      } else if (isTwStock(asset.代號)) {
        // 台股 ETF 使用 getStockPrice
        return updatePriceWithStatus(`other_${asset.代號}`, () => getStockPrice(asset.代號), (price) => {
          asset.最新價格 = price
        })
      }
      return Promise.resolve()
    })
    await Promise.all(otherPromises)

    // 觸發響應式更新
    rawData.value = { ...rawData.value }
    lastUpdateTime.value = new Date().toLocaleTimeString('zh-TW')

    // 價格更新完成後，自動抓取所有商品的新聞
    fetchAllNews()

  } catch (e) {
    console.error('價格更新失敗:', e)
  } finally {
    updating.value = false
  }
}

// 抓取所有商品的新聞
async function fetchAllNews() {
  if (!rawData.value) return

  const newsQueries = []

  // 海外債券
  rawData.value.股票.forEach(bond => {
    newsQueries.push({ symbol: bond.代號, name: bond.公司名稱 })
  })

  // ETF
  rawData.value.ETF.forEach(etf => {
    newsQueries.push({ symbol: etf.代號, name: etf.名稱 })
  })

  // 其它資產
  rawData.value.其它資產.forEach(asset => {
    newsQueries.push({ symbol: asset.代號, name: asset.名稱 })
  })

  // 批次抓取新聞
  await fetchBatchNews(newsQueries)
}

async function loadData() {
  loading.value = true
  error.value = null
  rawData.value = null
  priceStatus.value = {}

  try {
    const username = currentUsername.value
    const response = await fetch(`${import.meta.env.BASE_URL}data/${username}.json`)
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`找不到使用者 "${username}" 的資料`)
      }
      throw new Error('載入失敗')
    }
    rawData.value = await response.json()

    // 載入模組配置（若用戶 JSON 中有配置則使用，否則使用預設）
    if (rawData.value.模組配置 && Array.isArray(rawData.value.模組配置)) {
      moduleConfig.value = rawData.value.模組配置
    } else {
      moduleConfig.value = getDefaultModuleConfig()
    }

    // 載入完成後自動更新價格
    updateAllPrices()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// 即時預覽模組配置（不儲存）
function previewModuleConfig(newConfig) {
  moduleConfig.value = newConfig
}

// 取消編輯時恢復原始配置
function restoreModuleConfig(originalConfig) {
  moduleConfig.value = originalConfig
}

// 儲存模組配置到後端
async function saveModuleConfig(newConfig) {
  savingModuleConfig.value = true
  try {
    const response = await fetch(`${updateService.baseUrl}/config/${currentUsername.value}/modules`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': updateService.apiKey
      },
      body: JSON.stringify({ moduleConfig: newConfig })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '儲存失敗')
    }

    // 更新本地狀態
    moduleConfig.value = newConfig
    showModuleEditor.value = false

    // 同時更新 rawData 以保持一致
    if (rawData.value) {
      rawData.value.模組配置 = newConfig
    }
  } catch (e) {
    alert(`儲存失敗: ${e.message}`)
  } finally {
    savingModuleConfig.value = false
  }
}

// 監聽路由變化，重新載入資料
watch(() => route.params.username, () => {
  loadData()
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>{{ displayName }} 的投資現況</h1>
      <div class="header-actions">
        <!-- 新聞篩選切換 -->
        <div class="news-filter">
          <span class="filter-label">新聞:</span>
          <button
            :class="['filter-btn', { active: newsFilterMode === 'all' }]"
            @click="setNewsFilterMode('all')"
          >全部</button>
          <button
            :class="['filter-btn', 'bullish', { active: newsFilterMode === 'bullish' }]"
            @click="setNewsFilterMode('bullish')"
          >看漲</button>
          <button
            :class="['filter-btn', 'bearish', { active: newsFilterMode === 'bearish' }]"
            @click="setNewsFilterMode('bearish')"
          >看跌</button>
        </div>
        <span v-if="lastUpdateTime" class="last-update">
          最後更新: {{ lastUpdateTime }}
        </span>
        <button
          class="update-btn"
          :disabled="updating || loading"
          @click="updateAllPrices"
        >
          {{ updating ? '更新中...' : '更新價格' }}
        </button>
        <QuickUpdate :username="currentUsername" @updated="loadData" />
        <button class="module-edit-btn" @click="showModuleEditor = true" title="編輯模組配置">
          ⚙️
        </button>
        <span class="version">v{{ appVersion }}</span>
      </div>
    </div>

    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="error" class="error">錯誤: {{ error }}</div>

    <template v-else-if="rawData">
      <!-- 頂部摘要列 -->
      <div class="top-summary">
        <span class="summary-item">
          美元匯率: <span class="calculated">{{ rawData.匯率.美元匯率 }}</span>
          <span v-if="updating" class="spinner"></span>
        </span>
        <span class="summary-item asset tooltip-container">
          台幣資產: <span v-if="updating" class="calculated-value">--<span class="spinner"></span></span>
          <span v-else class="calculated-value">{{ formatWan(grandTotal.台幣資產) }}</span>
          <span class="tooltip-text">台幣資產: {{ formatNumber(grandTotal.台幣資產) }} 元</span>
        </span>
        <span class="summary-item liability tooltip-container">
          台幣負債: <span class="calculated-value">{{ formatWan(loanTotal.貸款餘額) }}</span>
          <span class="tooltip-text">台幣負債: {{ formatNumber(loanTotal.貸款餘額) }} 元</span>
        </span>
        <span class="summary-item equity tooltip-container">
          台幣淨值: <span v-if="updating" class="calculated-value">--<span class="spinner"></span></span>
          <span v-else class="calculated-value">{{ formatWan(grandTotal.台幣資產 - loanTotal.貸款餘額) }}</span>
          <span class="tooltip-text">台幣淨值: {{ formatNumber(grandTotal.台幣資產 - loanTotal.貸款餘額) }} 元</span>
        </span>
        <span class="summary-item interest tooltip-container">
          每年收息: <span v-if="updating" class="calculated-value">--<span class="spinner"></span></span>
          <span v-else class="calculated-value">{{ formatWan(grandTotal.每年利息) }}</span>
          <span class="tooltip-text">每年收息: {{ formatNumber(grandTotal.每年利息) }} 元</span>
        </span>
        <span class="summary-item expense tooltip-container">
          每年付息: <span class="calculated-value">{{ formatWan(loanTotal.每年利息) }}</span>
          <span class="tooltip-text">每年付息: {{ formatNumber(loanTotal.每年利息) }} 元</span>
        </span>
        <span class="summary-item income tooltip-container">
          全年淨收: <span v-if="updating" class="calculated-value">--<span class="spinner"></span></span>
          <span v-else class="calculated-value">{{ formatWan(netIncome) }}</span>
          <span class="tooltip-text">全年淨收: {{ formatNumber(netIncome) }} 元</span>
        </span>
      </div>

      <!-- 模組化區塊 -->
      <ModuleContainer
        :module-config="moduleConfig"
        :module-props="moduleProps"
        @open-news="handleOpenNews"
      />

      <div class="update-date">
        資料更新日期: {{ rawData.資料更新日期 }}
      </div>

      <!-- 新聞 Modal -->
      <NewsModal
        :visible="showNewsModal"
        :title="newsModalTitle"
        :news="currentNews"
        :loading="newsLoading"
        :current-index="currentProductIndex"
        :total-count="allProducts.length"
        @close="showNewsModal = false"
        @navigate="handleNewsNavigate"
      />

      <!-- 模組編輯器 -->
      <ModuleEditor
        :visible="showModuleEditor"
        :module-config="moduleConfig"
        :saving="savingModuleConfig"
        @close="showModuleEditor = false"
        @save="saveModuleConfig"
        @preview="previewModuleConfig"
        @cancel="restoreModuleConfig"
      />
    </template>
  </div>
</template>
