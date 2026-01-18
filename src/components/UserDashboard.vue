<script setup>
/**
 * 用戶儀表板動態載入元件
 * 解析用戶的 Vue 檔案，根據配置渲染儀表板
 */
import { ref, computed, watch, onErrorCaptured } from 'vue'

// 引入所有模組元件
import SummaryCardsModule from '../modules/SummaryCardsModule.vue'
import OverseasBondsModule from '../modules/OverseasBondsModule.vue'
import StocksEtfModule from '../modules/StocksEtfModule.vue'
import OtherAssetsModule from '../modules/OtherAssetsModule.vue'
import LoansModule from '../modules/LoansModule.vue'
import AssetHistoryModule from '../modules/AssetHistoryModule.vue'

const props = defineProps({
  // 後端編譯的結果（包含 raw 原始內容）
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

// 錯誤狀態
const hasError = ref(false)
const errorMessage = ref('')

// 錯誤捕獲
onErrorCaptured((err, instance, info) => {
  console.error('[UserDashboard] 元件錯誤:', err)
  hasError.value = true
  errorMessage.value = `儀表板渲染錯誤: ${err.message}`
  return false
})

// 預設配置
const defaultSections = {
  summary: true,
  bonds: true,
  etf: true,
  otherAssets: true,
  loans: true,
  history: true
}

const defaultThemeVars = {
  '--primary-color': '#667eea',
  '--primary-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  '--section-gap': '20px'
}

// 從原始 Vue 內容解析配置
const parsedConfig = computed(() => {
  const raw = props.compiled?.raw || ''

  let sections = { ...defaultSections }
  let themeVars = { ...defaultThemeVars }
  let sectionOrder = ['summary', 'bonds', 'etf', 'otherAssets', 'loans', 'history']
  let customSections = []

  try {
    // 解析 sections
    const sectionsMatch = raw.match(/const sections\s*=\s*\{([\s\S]*?)\n\s*\}/)
    if (sectionsMatch) {
      const sectionsContent = sectionsMatch[1]
      const sectionEntries = sectionsContent.match(/(\w+)\s*:\s*(true|false)/g)
      if (sectionEntries) {
        sectionEntries.forEach(entry => {
          const [key, value] = entry.split(':').map(s => s.trim())
          sections[key] = value === 'true'
        })
      }
    }

    // 解析 themeVars
    const themeMatch = raw.match(/const themeVars\s*=\s*\{([\s\S]*?)\n\s*\}/)
    if (themeMatch) {
      const themeContent = themeMatch[1]
      const themeEntries = themeContent.match(/'([^']+)'\s*:\s*'([^']+)'/g)
      if (themeEntries) {
        themeEntries.forEach(entry => {
          const match = entry.match(/'([^']+)'\s*:\s*'([^']+)'/)
          if (match) {
            themeVars[match[1]] = match[2]
          }
        })
      }
    }

    // 從 template 解析區塊順序
    const templateMatch = raw.match(/<template>([\s\S]*?)<\/template>/)
    if (templateMatch) {
      const templateContent = templateMatch[1]

      // 找出所有 section 的順序（匹配 xxx-section 格式）
      const sectionRegex = /<section[^>]*class="[^"]*\b([\w-]+)-section\b[^"]*"[^>]*>/g
      const foundSections = []
      let match
      while ((match = sectionRegex.exec(templateContent)) !== null) {
        const sectionType = match[1]
        // 映射 class 名稱到 section key
        const keyMap = {
          'summary': 'summary',
          'bonds': 'bonds',
          'etf': 'etf',
          'other-assets': 'otherAssets',
          'loans': 'loans',
          'history': 'history'
        }
        const key = keyMap[sectionType]
        if (key && !foundSections.includes(key)) {
          foundSections.push(key)
        }
      }

      if (foundSections.length > 0) {
        sectionOrder = foundSections
      }

      // 解析自訂區塊
      const customSectionRegex = /<section[^>]*class="[^"]*custom-([^-\s"]+)-section[^"]*"[^>]*>([\s\S]*?)<\/section>/g
      while ((match = customSectionRegex.exec(templateContent)) !== null) {
        const customType = match[1]
        const customContent = match[2]
        customSections.push({
          type: customType,
          content: customContent
        })
      }
    }

  } catch (e) {
    console.warn('[UserDashboard] 解析配置失敗，使用預設值:', e)
  }

  return { sections, themeVars, sectionOrder, customSections }
})

// 處理 open-news 事件
function handleOpenNews(symbol, name) {
  emit('open-news', symbol, name)
}

// 注入自訂樣式
const injectedStyleIds = new Set()
watch(
  () => props.compiled,
  () => {
    if (props.compiled?.compiled?.styles) {
      const scopeId = props.compiled.compiled.scopeId || 'user'
      props.compiled.compiled.styles.forEach((style, index) => {
        const styleId = `user-dashboard-style-${scopeId}-${index}`
        if (injectedStyleIds.has(styleId)) return

        const styleEl = document.createElement('style')
        styleEl.id = styleId
        styleEl.textContent = style.code
        document.head.appendChild(styleEl)
        injectedStyleIds.add(styleId)
      })
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="user-dashboard-container">
    <!-- 錯誤狀態 -->
    <div v-if="hasError" class="dashboard-error">
      <div class="error-icon">⚠️</div>
      <h3>儀表板載入失敗</h3>
      <p>{{ errorMessage }}</p>
      <p class="error-hint">請嘗試重新整理頁面，或聯繫管理員</p>
    </div>

    <!-- 正常渲染 -->
    <div v-else class="user-dashboard" :style="parsedConfig.themeVars">
      <template v-for="sectionKey in parsedConfig.sectionOrder" :key="sectionKey">
        <!-- 摘要卡片 -->
        <section
          v-if="sectionKey === 'summary' && parsedConfig.sections.summary"
          class="dashboard-section summary-section"
        >
          <SummaryCardsModule
            :config="{ uid: 'summary-cards', enabled: true, options: {} }"
            :exchange-rate="moduleProps.exchangeRate"
            :grand-total="moduleProps.grandTotal"
            :loan-total="moduleProps.loanTotal"
            :net-income="moduleProps.netIncome"
            :updating="moduleProps.updating"
          />
        </section>

        <!-- 海外債券 -->
        <section
          v-if="sectionKey === 'bonds' && parsedConfig.sections.bonds"
          class="dashboard-section bonds-section"
        >
          <OverseasBondsModule
            :config="{ uid: 'overseas-bonds', enabled: true, options: {} }"
            :calculated-bonds="moduleProps.calculatedBonds"
            :bond-subtotal="moduleProps.bondSubtotal"
            :bond-loan-details="moduleProps.bondLoanDetails"
            :price-status="moduleProps.priceStatus"
            :total-assets="moduleProps.totalAssets"
            :news-data="moduleProps.newsData"
            :get-news-count="moduleProps.getNewsCount"
            :is-news-loading="moduleProps.isNewsLoading"
            :is-news-read="moduleProps.isNewsRead"
            :highlight-symbol="moduleProps.highlightSymbol"
            @open-news="handleOpenNews"
          />
        </section>

        <!-- 股票/ETF -->
        <section
          v-if="sectionKey === 'etf' && parsedConfig.sections.etf"
          class="dashboard-section etf-section"
        >
          <StocksEtfModule
            :config="{ uid: 'stocks-etf', enabled: true, options: {} }"
            :calculated-etfs="moduleProps.calculatedEtfs"
            :etf-subtotal="moduleProps.etfSubtotal"
            :etf-loan-details="moduleProps.etfLoanDetails"
            :price-status="moduleProps.priceStatus"
            :total-assets="moduleProps.totalAssets"
            :news-data="moduleProps.newsData"
            :get-news-count="moduleProps.getNewsCount"
            :is-news-loading="moduleProps.isNewsLoading"
            :is-news-read="moduleProps.isNewsRead"
            :highlight-symbol="moduleProps.highlightSymbol"
            @open-news="handleOpenNews"
          />
        </section>

        <!-- 無配息資產 -->
        <section
          v-if="sectionKey === 'otherAssets' && parsedConfig.sections.otherAssets"
          class="dashboard-section other-assets-section"
        >
          <OtherAssetsModule
            :config="{ uid: 'other-assets', enabled: true, options: {} }"
            :calculated-other-assets="moduleProps.calculatedOtherAssets"
            :other-asset-subtotal="moduleProps.otherAssetSubtotal"
            :price-status="moduleProps.priceStatus"
            :news-data="moduleProps.newsData"
            :get-news-count="moduleProps.getNewsCount"
            :is-news-loading="moduleProps.isNewsLoading"
            :is-news-read="moduleProps.isNewsRead"
            :highlight-symbol="moduleProps.highlightSymbol"
            @open-news="handleOpenNews"
          />
        </section>

        <!-- 貸款 -->
        <section
          v-if="sectionKey === 'loans' && parsedConfig.sections.loans"
          class="dashboard-section loans-section"
        >
          <LoansModule
            :config="{ uid: 'loans', enabled: true, options: {} }"
            :calculated-loans="moduleProps.calculatedLoans"
            :loan-total="moduleProps.loanTotal"
          />
        </section>

        <!-- 資產歷史 -->
        <section
          v-if="sectionKey === 'history' && parsedConfig.sections.history"
          class="dashboard-section history-section"
        >
          <AssetHistoryModule
            :config="{ uid: 'asset-history', enabled: true, options: {} }"
            :asset-history-records="moduleProps.assetHistoryRecords"
          />
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.user-dashboard-container {
  min-height: 200px;
}

.user-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap, 20px);
}

.dashboard-section {
  /* 區塊基本樣式 */
}

.dashboard-error {
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  color: #e74c3c;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.dashboard-error h3 {
  margin: 0 0 12px;
  font-size: 20px;
}

.dashboard-error p {
  margin: 8px 0;
  color: #ccc;
}

.error-hint {
  font-size: 14px;
  color: #888 !important;
}
</style>
