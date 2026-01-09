<script setup>
import { ref, computed, onMounted } from 'vue'
import StockTable from './components/StockTable.vue'
import EtfTable from './components/EtfTable.vue'
import OtherAssetsTable from './components/OtherAssetsTable.vue'
import LoanTable from './components/LoanTable.vue'
import { formatNumber } from './utils/format'
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
} from './services/calculator'
import { getBondPrice, getStockPrice, getLatestDividend, getNextDividendDate, getCryptoPrice, getUsdTwdRate, getUsStockPrice } from './services/api'

const rawData = ref(null)
const loading = ref(true)
const error = ref(null)
const updating = ref(false)
const lastUpdateTime = ref(null)

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

// 債券小計（需要股票用途的貸款餘額來計算維持率）
const bondSubtotal = computed(() => {
  if (!calculatedBonds.value.length) return {}
  const loanG42 = calculatedLoans.value.find(l => l.貸款別 === '金交債質貸')?.貸款餘額 || 28407164
  const loanG43 = calculatedLoans.value.find(l => l.貸款別 === '金交債質貸款')?.貸款餘額 || 12420000
  return calculateBondSubtotal(calculatedBonds.value, loanG42, loanG43)
})

// ETF 小計（需要 ETF 用途的貸款餘額來計算維持率）
const etfSubtotal = computed(() => {
  if (!calculatedEtfs.value.length) return {}
  const loanG44 = calculatedLoans.value.find(l => l.貸款別 === '股票貸款2.15%')?.貸款餘額 || 7888670
  const loanG45 = calculatedLoans.value.find(l => l.貸款別 === '股票貸款2.69%')?.貸款餘額 || 3120703
  return calculateEtfSubtotal(calculatedEtfs.value, loanG44, loanG45)
})

// 其他資產小計
const otherAssetSubtotal = computed(() => {
  if (!calculatedOtherAssets.value.length) return {}
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

// 股票（海外債券）的貸款明細
const bondLoanDetails = computed(() => {
  const 金交債質貸 = calculatedLoans.value.find(l => l.貸款別 === '金交債質貸')?.貸款餘額 || 0
  const 金交債質貸款 = calculatedLoans.value.find(l => l.貸款別 === '金交債質貸款')?.貸款餘額 || 0
  return { 金交債質貸, 金交債質貸款 }
})

// ETF 的貸款明細
const etfLoanDetails = computed(() => {
  const 股票貸款215 = calculatedLoans.value.find(l => l.貸款別 === '股票貸款2.15%')?.貸款餘額 || 0
  const 股票貸款269 = calculatedLoans.value.find(l => l.貸款別 === '股票貸款2.69%')?.貸款餘額 || 0
  return { 股票貸款215, 股票貸款269 }
})

// 更新所有價格
async function updateAllPrices() {
  if (!rawData.value || updating.value) return

  updating.value = true

  try {
    // 更新美元匯率
    try {
      const rate = await getUsdTwdRate()
      if (typeof rate === 'number') {
        rawData.value.匯率.美元匯率 = rate
      } else if (typeof rate === 'string') {
        const parsed = parseFloat(rate)
        if (!isNaN(parsed) && parsed > 0) {
          rawData.value.匯率.美元匯率 = parsed
        } else {
          rawData.value.匯率.美元匯率 = rate // 顯示錯誤訊息
        }
      }
    } catch (e) {
      console.error('美元匯率更新失敗:', e)
      rawData.value.匯率.美元匯率 = '抓取失敗'
    }

    // 更新海外債券價格
    for (const bond of rawData.value.股票) {
      try {
        const price = await getBondPrice(bond.代號)
        if (typeof price === 'number') {
          bond.最新價格 = price
        } else if (typeof price === 'string') {
          const parsed = parseFloat(price)
          if (!isNaN(parsed) && parsed > 0) {
            bond.最新價格 = parsed
          } else {
            bond.最新價格 = price // 顯示錯誤訊息
          }
        }
      } catch (e) {
        console.error(`債券 ${bond.代號} 價格更新失敗:`, e)
        bond.最新價格 = '抓取失敗'
      }
    }

    // 更新 ETF 價格和配息資料
    for (const etf of rawData.value.ETF) {
      try {
        const [price, dividend, nextDate] = await Promise.all([
          getStockPrice(etf.代號),
          getLatestDividend(etf.代號),
          getNextDividendDate(etf.代號)
        ])

        // 處理價格
        if (typeof price === 'number') {
          etf.最新價格 = price
        } else if (typeof price === 'string') {
          const parsed = parseFloat(price)
          if (!isNaN(parsed) && parsed > 0) {
            etf.最新價格 = parsed
          } else {
            etf.最新價格 = price // 顯示錯誤訊息
          }
        }

        // 處理配息
        if (typeof dividend === 'number') {
          etf.每股配息 = dividend
        } else if (typeof dividend === 'string') {
          const parsed = parseFloat(dividend)
          if (!isNaN(parsed) && parsed > 0) {
            etf.每股配息 = parsed
          } else {
            etf.每股配息 = dividend // 顯示錯誤訊息
          }
        }

        // 處理下次配息日
        if (typeof nextDate === 'string' && nextDate.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
          etf.下次配息日 = nextDate
        } else if (nextDate) {
          etf.下次配息日 = nextDate // 顯示錯誤訊息或其他狀態
        }
      } catch (e) {
        console.error(`ETF ${etf.代號} 資料更新失敗:`, e)
        etf.最新價格 = '抓取失敗'
      }
    }

    // 更新其他資產價格
    const cryptoMapping = {
      'BTC/TWD': 'bitcoin',
      'ETH/TWD': 'ethereum'
    }
    // 美股代號列表
    const usStockSymbols = ['TSLA', 'GLDM', 'SIVR', 'COPX']

    for (const asset of rawData.value.其它資產) {
      const coinId = cryptoMapping[asset.代號]
      if (coinId) {
        // 加密貨幣 - 使用 CoinGecko（回傳台幣價格）
        try {
          const price = await getCryptoPrice(coinId, 'twd')
          if (typeof price === 'number') {
            asset.最新價格 = price
          } else {
            asset.最新價格 = price // 顯示錯誤訊息
          }
        } catch (e) {
          console.error(`加密貨幣 ${asset.代號} 價格更新失敗:`, e)
          asset.最新價格 = '抓取失敗'
        }
      } else if (usStockSymbols.includes(asset.代號)) {
        // 美股 - 使用 Yahoo Finance（回傳美元價格，需乘匯率轉台幣）
        try {
          const price = await getUsStockPrice(asset.代號)
          if (typeof price === 'number') {
            asset.最新價格 = price
          } else {
            asset.最新價格 = price // 顯示錯誤訊息
          }
        } catch (e) {
          console.error(`美股 ${asset.代號} 價格更新失敗:`, e)
          asset.最新價格 = '抓取失敗'
        }
      }
    }

    // 觸發響應式更新
    rawData.value = { ...rawData.value }
    lastUpdateTime.value = new Date().toLocaleTimeString('zh-TW')

  } catch (e) {
    console.error('價格更新失敗:', e)
  } finally {
    updating.value = false
  }
}

onMounted(async () => {
  try {
    const response = await fetch('/投資總資料.json')
    if (!response.ok) throw new Error('載入失敗')
    rawData.value = await response.json()

    // 載入完成後自動更新價格
    updateAllPrices()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>我的投資現況</h1>
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
      </div>
    </div>

    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="error" class="error">錯誤: {{ error }}</div>

    <template v-else-if="rawData">
      <div class="exchange-rate">
        美元匯率: <span class="calculated">{{ rawData.匯率.美元匯率 }}</span>
      </div>

      <!-- 股票(海外債券) -->
      <StockTable :stocks="calculatedBonds" :subtotal="bondSubtotal" :loan-details="bondLoanDetails" />

      <!-- ETF -->
      <EtfTable :etfs="calculatedEtfs" :subtotal="etfSubtotal" :loan-details="etfLoanDetails" />

      <!-- 其它資產 -->
      <OtherAssetsTable :assets="calculatedOtherAssets" :subtotal="otherAssetSubtotal" />

      <!-- 總計 -->
      <div class="summary-section">
        <span class="summary-box red">
          總計台幣資產: <span class="calculated-value">{{ formatNumber(grandTotal.台幣資產) }}</span>
        </span>
        <span class="summary-box green">
          總計每年利息: <span class="calculated-value">{{ formatNumber(grandTotal.每年利息) }}</span>
        </span>
      </div>

      <!-- 貸款 -->
      <LoanTable :loans="calculatedLoans" :total="loanTotal" />

      <!-- 淨收入 -->
      <div class="net-income">
        全年淨收入: <span class="calculated-value">{{ formatNumber(netIncome) }}</span>
      </div>

      <div class="update-date">
        資料更新日期: {{ rawData.資料更新日期 }}
      </div>
    </template>
  </div>
</template>
