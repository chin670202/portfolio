<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import StockTable from '../components/StockTable.vue'
import EtfTable from '../components/EtfTable.vue'
import OtherAssetsTable from '../components/OtherAssetsTable.vue'
import LoanTable from '../components/LoanTable.vue'
import AssetHistoryTable from '../components/AssetHistoryTable.vue'
import AssetHistoryChart from '../components/AssetHistoryChart.vue'
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
import packageJson from '../../package.json'

const route = useRoute()
const appVersion = packageJson.version
const rawData = ref(null)
const loading = ref(true)
const error = ref(null)
const updating = ref(false)
const lastUpdateTime = ref(null)
const currentUsername = computed(() => route.params.username || 'chin')

// 價格狀態追蹤: { [代號]: { loading: boolean, failed: boolean } }
const priceStatus = ref({})

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

  } catch (e) {
    console.error('價格更新失敗:', e)
  } finally {
    updating.value = false
  }
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

    // 載入完成後自動更新價格
    updateAllPrices()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
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
      <h1>{{ currentUsername }} 的投資現況</h1>
      <div class="header-actions">
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

      <!-- 股票(海外債券) -->
      <StockTable :stocks="calculatedBonds" :subtotal="bondSubtotal" :loan-details="bondLoanDetails" :price-status="priceStatus" :total-assets="grandTotal.台幣資產" />

      <!-- ETF -->
      <EtfTable :etfs="calculatedEtfs" :subtotal="etfSubtotal" :loan-details="etfLoanDetails" :price-status="priceStatus" :total-assets="grandTotal.台幣資產" />

      <!-- 其它資產 -->
      <OtherAssetsTable :assets="calculatedOtherAssets" :subtotal="otherAssetSubtotal" :price-status="priceStatus" :total-assets="grandTotal.台幣資產" />

      <!-- 貸款 -->
      <LoanTable :loans="calculatedLoans" :total="loanTotal" />

      <!-- 資產變化記錄 -->
      <AssetHistoryTable :records="rawData.資產變化記錄" />

      <!-- 資產變化趨勢圖 -->
      <AssetHistoryChart :records="rawData.資產變化記錄" />

      <div class="update-date">
        資料更新日期: {{ rawData.資料更新日期 }}
      </div>
    </template>
  </div>
</template>
