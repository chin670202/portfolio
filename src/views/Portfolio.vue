<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import NewsModal from '../components/NewsModal.vue'
import QuickUpdate from '../components/QuickUpdate.vue'
import { ModuleContainer, getDefaultModuleConfig, mergeModuleConfig } from '../modules'
import SettingsModal from '../components/SettingsModal.vue'
import UserDashboard from '../components/UserDashboard.vue'
import { updateService } from '../config'
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

// 用戶儀表板（動態載入）
const userDashboardComponent = ref(null)
const dashboardLoading = ref(false)

// 設定視窗狀態
const showSettings = ref(false)

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
  isRead: isNewsRead,
  fetchBatchNews,
  filterMode: newsFilterMode,
  setFilterMode: setNewsFilterMode
} = useNews()

// 分類判斷函數（用於新分類：債券/股票/加密貨幣）
const isCrypto = (symbol) => symbol.includes('/TWD')
const isTwStock = (symbol) => /^\d{4}/.test(symbol) || /^00/.test(symbol)
const isUsStock = (symbol) => /^[A-Z]+$/.test(symbol) && !isCrypto(symbol)

// 所有商品列表（用於新聞滾輪切換，順序與畫面一致）
// 使用唯一 ID 避免重複代號問題
const allProducts = computed(() => {
  if (!rawData.value) return []
  const products = []
  // 1. 債券（原「股票」陣列）
  rawData.value.股票.forEach((bond, idx) => {
    products.push({ id: `bond_${idx}`, symbol: bond.代號, name: bond.公司名稱 })
  })
  // 2. 股票（台股：ETF 中的台股 + 其它資產中的台股）
  rawData.value.ETF.filter(etf => isTwStock(etf.代號)).forEach((etf, idx) => {
    products.push({ id: `tw_etf_${idx}`, symbol: etf.代號, name: etf.名稱 })
  })
  rawData.value.其它資產.filter(a => isTwStock(a.代號)).forEach((asset, idx) => {
    products.push({ id: `tw_other_${idx}`, symbol: asset.代號, name: asset.名稱 })
  })
  // 3. 股票（美股）
  rawData.value.其它資產.filter(a => isUsStock(a.代號)).forEach((asset, idx) => {
    products.push({ id: `us_${idx}`, symbol: asset.代號, name: asset.名稱 })
  })
  // 4. 加密貨幣
  rawData.value.其它資產.filter(a => isCrypto(a.代號)).forEach((asset, idx) => {
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
  // 判斷是否為債券，使用 assetType: 'bond' 過濾新聞
  const isBond = product.id?.startsWith('bond_')
  const options = isBond ? { assetType: 'bond' } : {}
  openNewsModal(product.symbol, product.name, options)
}

// 封裝開啟新聞 Modal（從表格點擊時用）
function handleOpenNews(symbol, name) {
  // 根據 symbol 找到對應的 product（如果有重複，取第一個）
  const product = allProducts.value.find(p => p.symbol === symbol)
  if (product) {
    currentProductId.value = product.id
  }
  // 判斷是否為債券，使用 assetType: 'bond' 過濾新聞
  // 債券只顯示公司自身財務/經營相關新聞，過濾掉公司對別人發表意見的新聞
  const isBond = product?.id?.startsWith('bond_')
  const options = isBond ? { assetType: 'bond' } : {}
  openNewsModal(symbol, name, options)
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

// ========== 新分類：股票/加密貨幣 ==========

// 計算後的台股資料（合併 ETF 中的台股 + 其它資產中的台股）
// 排序規則：有配息的排在上面
const calculatedTwStocks = computed(() => {
  if (!rawData.value) return []

  // 從 ETF 中篩選台股
  const twEtfs = calculatedEtfs.value.filter(etf => isTwStock(etf.代號))

  // 從其它資產中篩選台股
  const twOtherAssets = calculatedOtherAssets.value.filter(asset => isTwStock(asset.代號))

  // 合併資料，統一欄位格式（使用 ETF 的欄位結構）
  const merged = [
    ...twEtfs,
    ...twOtherAssets.map(asset => ({
      ...asset,
      名稱: asset.名稱,
      代號: asset.代號,
      買入均價: asset.買入均價,
      股數: asset.股數,
      最新價格: asset.最新價格,
      台幣損益: asset.台幣損益,
      報酬率: asset.報酬率,
      台幣資產: asset.台幣資產,
      每股配息: asset.每股配息 || 0,
      每年配息: asset.每年配息 || 0,
      殖利率: asset.殖利率 || 0,
      下次配息日: asset.下次配息日 || '',
      質押股數: asset.質押股數 || 0,
      貸款餘額: asset.貸款餘額 || 0
    }))
  ]

  // 排序：有配息的排在上面（按殖利率降序）
  return merged.sort((a, b) => {
    const aHasDividend = (a.每股配息 || 0) > 0
    const bHasDividend = (b.每股配息 || 0) > 0
    if (aHasDividend && !bHasDividend) return -1
    if (!aHasDividend && bHasDividend) return 1
    return (b.殖利率 || 0) - (a.殖利率 || 0)
  })
})

// 計算後的美股資料
const calculatedUsStocks = computed(() => {
  if (!rawData.value) return []
  return calculatedOtherAssets.value.filter(asset => isUsStock(asset.代號))
})

// 計算後的加密貨幣資料
const calculatedCryptos = computed(() => {
  if (!rawData.value) return []
  return calculatedOtherAssets.value.filter(asset => isCrypto(asset.代號))
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

// ========== 新分類小計 ==========

// 台股小計
const twStockSubtotal = computed(() => {
  const stocks = calculatedTwStocks.value
  if (!stocks.length) return { 台幣資產: 0, 台幣損益: 0, 每年配息: 0 }

  const 台幣資產 = stocks.reduce((sum, s) => sum + (s.台幣資產 || 0), 0)
  const 台幣損益 = stocks.reduce((sum, s) => sum + (s.台幣損益 || 0), 0)
  const 每年配息 = stocks.reduce((sum, s) => sum + (s.每年配息 || 0), 0)
  const 質押股數 = stocks.reduce((sum, s) => sum + (s.質押股數 || 0), 0)

  return {
    台幣資產,
    台幣損益,
    報酬率: 台幣資產 > 0 ? (台幣損益 / (台幣資產 - 台幣損益)) * 100 : 0,
    每年配息,
    殖利率: 台幣資產 > 0 ? (每年配息 / 台幣資產) * 100 : 0,
    質押股數
  }
})

// 美股小計
const usStockSubtotal = computed(() => {
  const stocks = calculatedUsStocks.value
  if (!stocks.length) return { 台幣資產: 0, 台幣損益: 0 }

  const 台幣資產 = stocks.reduce((sum, s) => sum + (s.台幣資產 || 0), 0)
  const 台幣損益 = stocks.reduce((sum, s) => sum + (s.台幣損益 || 0), 0)

  return {
    台幣資產,
    台幣損益,
    報酬率: 台幣資產 > 0 ? (台幣損益 / (台幣資產 - 台幣損益)) * 100 : 0
  }
})

// 股票總計（台股 + 美股）
const stockSubtotal = computed(() => {
  const tw = twStockSubtotal.value
  const us = usStockSubtotal.value

  const 台幣資產 = (tw.台幣資產 || 0) + (us.台幣資產 || 0)
  const 台幣損益 = (tw.台幣損益 || 0) + (us.台幣損益 || 0)
  const 每年配息 = tw.每年配息 || 0

  // 計算股票相關貸款餘額（用於維持率）
  const stockLoans = calculatedLoans.value.filter(l => l.貸款別.includes('股票'))
  const 貸款餘額 = stockLoans.reduce((sum, l) => sum + l.貸款餘額, 0)

  return {
    台幣資產,
    台幣損益,
    報酬率: 台幣資產 > 0 ? (台幣損益 / (台幣資產 - 台幣損益)) * 100 : 0,
    每年配息,
    殖利率: 台幣資產 > 0 ? (每年配息 / 台幣資產) * 100 : 0,
    貸款餘額,
    維持率: 貸款餘額 > 0 ? (台幣資產 / 貸款餘額) * 100 : 0
  }
})

// 加密貨幣小計
const cryptoSubtotal = computed(() => {
  const cryptos = calculatedCryptos.value
  if (!cryptos.length) return { 台幣資產: 0, 台幣損益: 0 }

  const 台幣資產 = cryptos.reduce((sum, c) => sum + (c.台幣資產 || 0), 0)
  const 台幣損益 = cryptos.reduce((sum, c) => sum + (c.台幣損益 || 0), 0)

  return {
    台幣資產,
    台幣損益,
    報酬率: 台幣資產 > 0 ? (台幣損益 / (台幣資產 - 台幣損益)) * 100 : 0
  }
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
  // 摘要卡片模組需要的資料
  exchangeRate: rawData.value?.匯率 || {},
  grandTotal: grandTotal.value,
  loanTotal: loanTotal.value,
  netIncome: netIncome.value,
  updating: updating.value,

  // 債券模組需要的資料（原海外債券）
  calculatedBonds: calculatedBonds.value,
  bondSubtotal: bondSubtotal.value,
  bondLoanDetails: bondLoanDetails.value,

  // 股票模組需要的資料（新分類：台股 + 美股）
  calculatedTwStocks: calculatedTwStocks.value,
  calculatedUsStocks: calculatedUsStocks.value,
  twStockSubtotal: twStockSubtotal.value,
  usStockSubtotal: usStockSubtotal.value,
  stockSubtotal: stockSubtotal.value,
  stockLoanDetails: etfLoanDetails.value, // 沿用 ETF 的貸款明細（股票質借）

  // 加密貨幣模組需要的資料
  calculatedCryptos: calculatedCryptos.value,
  cryptoSubtotal: cryptoSubtotal.value,

  // 舊模組相容（保留給可能還在使用的元件）
  calculatedEtfs: calculatedEtfs.value,
  etfSubtotal: etfSubtotal.value,
  etfLoanDetails: etfLoanDetails.value,
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
  isNewsRead,
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
    // 台股代號格式：數字開頭（如 00635U, 2330）
    const isTwStock = (symbol) => /^\d/.test(symbol)
    // 美股代號格式：純英文大寫（如 NVDA, TSLA）
    const isUsStock = (symbol) => /^[A-Z]+$/.test(symbol)

    const otherPromises = rawData.value.其它資產.map(asset => {
      const coinId = cryptoMapping[asset.代號]
      if (coinId) {
        return updatePriceWithStatus(`other_${asset.代號}`, () => getCryptoPrice(coinId, 'twd'), (price) => {
          asset.最新價格 = price
        })
      } else if (isUsStock(asset.代號)) {
        // 美股使用 getUsStockPrice
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

  // 海外債券 - 使用 assetType: 'bond' 進行特殊過濾
  // 只保留與公司自身財務/經營相關的新聞，過濾掉公司對別人發表意見的新聞
  rawData.value.股票.forEach(bond => {
    newsQueries.push({ symbol: bond.代號, name: bond.公司名稱, assetType: 'bond' })
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
    const response = await fetch(`${import.meta.env.BASE_URL}data/${username}.json?t=${Date.now()}`)
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`找不到使用者 "${username}" 的資料`)
      }
      throw new Error('載入失敗')
    }
    rawData.value = await response.json()

    // 載入模組配置（合併用戶配置與新內建模組）
    moduleConfig.value = mergeModuleConfig(rawData.value.模組配置)

    // 載入完成後自動更新價格
    updateAllPrices()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// 載入用戶儀表板配置
async function loadUserDashboard() {
  dashboardLoading.value = true
  try {
    // 直接從靜態檔案載入 dashboard.json
    const response = await fetch(`/data/${currentUsername.value}.dashboard.json?t=${Date.now()}`)
    if (response.ok) {
      const data = await response.json()
      // 版本檢查：如果用戶配置版本低於 2，重置為新分類配置
      if (!data.version || data.version < 2) {
        console.log('[Portfolio] 用戶儀表板配置版本過舊，重置為新配置')
        userDashboardComponent.value = {
          version: 2,
          sectionOrder: ['summary', 'bonds', 'stocks', 'crypto', 'loans', 'history'],
          sections: {
            summary: true,
            bonds: true,
            stocks: true,
            crypto: true,
            loans: true,
            history: true
          },
          theme: data.theme || {
            primaryColor: '#667eea',
            primaryGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            sectionGap: '20px'
          },
          columns: {}, // 重置欄位配置
          customCards: data.customCards || []
        }
      } else {
        userDashboardComponent.value = data
      }
    } else {
      // 如果找不到用戶專屬配置，使用預設配置
      userDashboardComponent.value = {
        version: 2,
        sectionOrder: ['summary', 'bonds', 'stocks', 'crypto', 'loans', 'history'],
        sections: {
          summary: true,
          bonds: true,
          stocks: true,
          crypto: true,
          loans: true,
          history: true
        },
        theme: {
          primaryColor: '#667eea',
          primaryGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          sectionGap: '20px'
        },
        columns: {},
        customCards: []
      }
    }
  } catch (e) {
    console.warn('[Portfolio] 載入用戶儀表板失敗，使用預設:', e)
    userDashboardComponent.value = null
  } finally {
    dashboardLoading.value = false
  }
}

// 處理儀表板更新事件
function handleDashboardUpdated() {
  loadUserDashboard()
}

function handleCustomDashboardCreated() {
  // 自訂儀表板已建立，可以在這裡添加通知或其他邏輯
  console.log('自訂儀表板已建立')
}

// 監聽路由變化，重新載入資料
watch(() => route.params.username, () => {
  loadData()
})

onMounted(() => {
  loadData()
  loadUserDashboard()
})
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>{{ displayName }} 的投資現況</h1>
      <div class="header-actions">
        <span v-if="lastUpdateTime" class="last-update">
          最後更新: {{ lastUpdateTime }}
        </span>
        <QuickUpdate :username="currentUsername" @updated="loadData" @dashboard-updated="handleDashboardUpdated" @custom-dashboard-created="handleCustomDashboardCreated" />
        <button class="settings-btn" @click="showSettings = true" title="設定">
          ⚙️
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="error" class="error">錯誤: {{ error }}</div>

    <template v-else-if="rawData">
      <!-- 用戶儀表板（動態載入）或預設模組容器 -->
      <UserDashboard
        v-if="userDashboardComponent"
        :dashboard-config="userDashboardComponent"
        :module-props="moduleProps"
        @open-news="handleOpenNews"
      />
      <ModuleContainer
        v-else
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

      <!-- 設定視窗 -->
      <SettingsModal
        :visible="showSettings"
        :username="currentUsername"
        :display-name="displayName"
        :news-filter-mode="newsFilterMode"
        @close="showSettings = false"
        @update:news-filter-mode="setNewsFilterMode"
      />
    </template>
  </div>
</template>
