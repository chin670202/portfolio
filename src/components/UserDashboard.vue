<script setup>
/**
 * 用戶儀表板動態載入元件
 * 接收後端編譯後的儀表板內容，動態渲染
 */
import { computed, h, defineAsyncComponent } from 'vue'

// 引入所有模組元件（用於動態渲染）
import SummaryCardsModule from '../modules/SummaryCardsModule.vue'
import OverseasBondsModule from '../modules/OverseasBondsModule.vue'
import StocksEtfModule from '../modules/StocksEtfModule.vue'
import OtherAssetsModule from '../modules/OtherAssetsModule.vue'
import LoansModule from '../modules/LoansModule.vue'
import AssetHistoryModule from '../modules/AssetHistoryModule.vue'

const props = defineProps({
  // 後端編譯的結果
  compiled: {
    type: Object,
    required: true
  },
  // 傳遞給模組的資料
  moduleProps: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-news'])

function handleOpenNews(symbol, name) {
  emit('open-news', symbol, name)
}

// 從編譯結果中提取配置
// 由於動態編譯 Vue SFC 在瀏覽器端較複雜，我們採用簡化方案：
// 解析 raw Vue 內容，提取 sections 和 themeVars 配置
const dashboardConfig = computed(() => {
  if (!props.compiled?.raw) {
    return {
      sections: {
        summary: true,
        bonds: true,
        etf: true,
        otherAssets: true,
        loans: true,
        history: true
      },
      themeVars: {},
      sectionOrder: ['summary', 'bonds', 'etf', 'otherAssets', 'loans', 'history']
    }
  }

  // 解析 Vue 檔案中的 sections 配置
  const raw = props.compiled.raw
  let sections = {
    summary: true,
    bonds: true,
    etf: true,
    otherAssets: true,
    loans: true,
    history: true
  }

  // 嘗試解析 sections 物件
  const sectionsMatch = raw.match(/const sections\s*=\s*\{([^}]+)\}/)
  if (sectionsMatch) {
    const sectionsStr = sectionsMatch[1]
    // 解析每個欄位
    const booleanMatch = (key) => {
      const match = sectionsStr.match(new RegExp(`${key}:\\s*(true|false)`))
      return match ? match[1] === 'true' : true
    }
    sections = {
      summary: booleanMatch('summary'),
      bonds: booleanMatch('bonds'),
      etf: booleanMatch('etf'),
      otherAssets: booleanMatch('otherAssets'),
      loans: booleanMatch('loans'),
      history: booleanMatch('history')
    }
  }

  // 嘗試解析 themeVars
  let themeVars = {}
  const themeMatch = raw.match(/const themeVars\s*=\s*\{([^}]+)\}/)
  if (themeMatch) {
    const themeStr = themeMatch[1]
    // 解析 CSS 變數
    const varMatches = themeStr.matchAll(/'([^']+)':\s*'([^']+)'/g)
    for (const match of varMatches) {
      themeVars[match[1]] = match[2]
    }
  }

  // 解析 template 中的 section 順序
  let sectionOrder = ['summary', 'bonds', 'etf', 'otherAssets', 'loans', 'history']
  const templateMatch = raw.match(/<template>([\s\S]*?)<\/template>/)
  if (templateMatch) {
    const template = templateMatch[1]
    const order = []
    const sectionTypes = [
      { key: 'summary', pattern: /summary-section/ },
      { key: 'bonds', pattern: /bonds-section/ },
      { key: 'etf', pattern: /etf-section/ },
      { key: 'otherAssets', pattern: /other-assets-section/ },
      { key: 'loans', pattern: /loans-section/ },
      { key: 'history', pattern: /history-section/ }
    ]

    // 找出每個 section 在 template 中的位置
    const positions = sectionTypes.map(({ key, pattern }) => {
      const match = template.match(pattern)
      return { key, pos: match ? match.index : -1 }
    }).filter(p => p.pos >= 0)

    // 按位置排序
    positions.sort((a, b) => a.pos - b.pos)
    sectionOrder = positions.map(p => p.key)
  }

  return { sections, themeVars, sectionOrder }
})

// 可見的區塊（按順序）
const visibleSections = computed(() => {
  const { sections, sectionOrder } = dashboardConfig.value
  return sectionOrder.filter(key => sections[key])
})

// 區塊元件對應
const sectionComponents = {
  summary: SummaryCardsModule,
  bonds: OverseasBondsModule,
  etf: StocksEtfModule,
  otherAssets: OtherAssetsModule,
  loans: LoansModule,
  history: AssetHistoryModule
}

// 區塊 props 對應
function getSectionProps(key) {
  const mp = props.moduleProps
  const baseConfig = { uid: key, enabled: true, options: {} }

  switch (key) {
    case 'summary':
      return {
        config: baseConfig,
        exchangeRate: mp.exchangeRate,
        grandTotal: mp.grandTotal,
        loanTotal: mp.loanTotal,
        netIncome: mp.netIncome,
        updating: mp.updating
      }
    case 'bonds':
      return {
        config: baseConfig,
        calculatedBonds: mp.calculatedBonds,
        bondSubtotal: mp.bondSubtotal,
        bondLoanDetails: mp.bondLoanDetails,
        priceStatus: mp.priceStatus,
        totalAssets: mp.totalAssets,
        newsData: mp.newsData,
        getNewsCount: mp.getNewsCount,
        isNewsLoading: mp.isNewsLoading,
        isNewsRead: mp.isNewsRead,
        highlightSymbol: mp.highlightSymbol
      }
    case 'etf':
      return {
        config: baseConfig,
        calculatedEtfs: mp.calculatedEtfs,
        etfSubtotal: mp.etfSubtotal,
        etfLoanDetails: mp.etfLoanDetails,
        priceStatus: mp.priceStatus,
        totalAssets: mp.totalAssets,
        newsData: mp.newsData,
        getNewsCount: mp.getNewsCount,
        isNewsLoading: mp.isNewsLoading,
        isNewsRead: mp.isNewsRead,
        highlightSymbol: mp.highlightSymbol
      }
    case 'otherAssets':
      return {
        config: baseConfig,
        calculatedOtherAssets: mp.calculatedOtherAssets,
        otherAssetSubtotal: mp.otherAssetSubtotal,
        priceStatus: mp.priceStatus,
        newsData: mp.newsData,
        getNewsCount: mp.getNewsCount,
        isNewsLoading: mp.isNewsLoading,
        isNewsRead: mp.isNewsRead,
        highlightSymbol: mp.highlightSymbol
      }
    case 'loans':
      return {
        config: baseConfig,
        calculatedLoans: mp.calculatedLoans,
        loanTotal: mp.loanTotal
      }
    case 'history':
      return {
        config: baseConfig,
        assetHistoryRecords: mp.assetHistoryRecords
      }
    default:
      return { config: baseConfig }
  }
}
</script>

<template>
  <div class="user-dashboard" :style="dashboardConfig.themeVars">
    <component
      v-for="sectionKey in visibleSections"
      :key="sectionKey"
      :is="sectionComponents[sectionKey]"
      v-bind="getSectionProps(sectionKey)"
      @open-news="handleOpenNews"
    />
  </div>
</template>

<style scoped>
.user-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap, 20px);
}
</style>
