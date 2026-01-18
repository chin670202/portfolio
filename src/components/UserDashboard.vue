<script setup>
/**
 * 用戶儀表板元件
 * 根據 dashboard.json 配置渲染儀表板
 */
import { computed } from 'vue'

// 引入所有模組元件
import SummaryCardsModule from '../modules/SummaryCardsModule.vue'
import OverseasBondsModule from '../modules/OverseasBondsModule.vue'
import StocksEtfModule from '../modules/StocksEtfModule.vue'
import OtherAssetsModule from '../modules/OtherAssetsModule.vue'
import LoansModule from '../modules/LoansModule.vue'
import AssetHistoryModule from '../modules/AssetHistoryModule.vue'

const props = defineProps({
  // 儀表板配置（從 JSON 載入）
  dashboardConfig: {
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

// 預設配置
const defaultConfig = {
  sectionOrder: ['summary', 'bonds', 'etf', 'otherAssets', 'loans', 'history'],
  sections: {
    summary: true,
    bonds: true,
    etf: true,
    otherAssets: true,
    loans: true,
    history: true
  },
  theme: {
    primaryColor: '#667eea',
    primaryGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    sectionGap: '20px'
  },
  customCards: []
}

// 合併配置
const config = computed(() => ({
  sectionOrder: props.dashboardConfig?.sectionOrder || defaultConfig.sectionOrder,
  sections: { ...defaultConfig.sections, ...props.dashboardConfig?.sections },
  theme: { ...defaultConfig.theme, ...props.dashboardConfig?.theme },
  customCards: props.dashboardConfig?.customCards || [],
  columns: props.dashboardConfig?.columns || {}
}))

// 主題樣式變數
const themeVars = computed(() => ({
  '--primary-color': config.value.theme.primaryColor,
  '--primary-gradient': config.value.theme.primaryGradient,
  '--section-gap': config.value.theme.sectionGap
}))

// 處理 open-news 事件
function handleOpenNews(symbol, name) {
  emit('open-news', symbol, name)
}

// 解析自訂卡片的變數值
function resolveValue(item, data) {
  if (!item.value) return ''

  let value = item.value.replace(/\{\{(.+?)\}\}/g, (_, path) => {
    return getNestedValue(data, path)
  })

  if (item.format === 'currency') {
    const num = Number(value)
    if (!isNaN(num)) {
      value = num.toLocaleString()
    }
  } else if (item.format === 'percent') {
    const num = Number(value)
    if (!isNaN(num)) {
      value = num.toFixed(2) + '%'
    }
  }

  return value + (item.suffix || '')
}

// 取得巢狀物件的值
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return ''
    return current[key]
  }, obj)
}

// 根據 position 取得該位置的自訂卡片
function getCustomCardsAt(position) {
  return config.value.customCards.filter(card => card.position === position)
}

// 計算用於自訂卡片的資料
const customCardData = computed(() => ({
  bondsCount: props.moduleProps.calculatedBonds?.length || 0,
  etfCount: props.moduleProps.calculatedEtfs?.length || 0,
  otherAssetsCount: props.moduleProps.calculatedOtherAssets?.length || 0,
  totalCount: (props.moduleProps.calculatedBonds?.length || 0) +
              (props.moduleProps.calculatedEtfs?.length || 0) +
              (props.moduleProps.calculatedOtherAssets?.length || 0),
  exchangeRate: props.moduleProps.exchangeRate || 0,
  usd100ToTwd: ((props.moduleProps.exchangeRate || 0) * 100).toLocaleString(),
  usd1000ToTwd: ((props.moduleProps.exchangeRate || 0) * 1000).toLocaleString(),
  grandTotal: props.moduleProps.grandTotal || 0,
  loanTotal: props.moduleProps.loanTotal || 0,
  netWorth: (props.moduleProps.grandTotal || 0) - (props.moduleProps.loanTotal || 0),
  netIncome: props.moduleProps.netIncome || 0
}))
</script>

<template>
  <div class="user-dashboard" :style="themeVars">
    <template v-for="sectionKey in config.sectionOrder" :key="sectionKey">
      <!-- 摘要卡片 -->
      <template v-if="sectionKey === 'summary' && config.sections.summary">
        <section class="dashboard-section summary-section">
          <SummaryCardsModule
            :config="{ uid: 'summary-cards', enabled: true, options: {} }"
            :exchange-rate="moduleProps.exchangeRate"
            :grand-total="moduleProps.grandTotal"
            :loan-total="moduleProps.loanTotal"
            :net-income="moduleProps.netIncome"
            :updating="moduleProps.updating"
          />
        </section>
        <!-- 自訂卡片：after-summary -->
        <section
          v-for="card in getCustomCardsAt('after-summary')"
          :key="card.id"
          class="dashboard-section custom-section"
        >
          <div class="custom-card" :class="card.layout">
            <h3 v-if="card.title">{{ card.title }}</h3>
            <div class="card-items">
              <div v-for="item in card.items" :key="item.label" class="card-item">
                <span class="item-label">{{ item.label }}</span>
                <span class="item-value">{{ resolveValue(item, customCardData) }}</span>
              </div>
            </div>
          </div>
        </section>
      </template>

      <!-- 海外債券 -->
      <template v-if="sectionKey === 'bonds' && config.sections.bonds">
        <section class="dashboard-section bonds-section">
          <OverseasBondsModule
            :config="{ uid: 'overseas-bonds', enabled: true, options: {}, columns: config.columns.bonds }"
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
        <!-- 自訂卡片：after-bonds -->
        <section
          v-for="card in getCustomCardsAt('after-bonds')"
          :key="card.id"
          class="dashboard-section custom-section"
        >
          <div class="custom-card" :class="card.layout">
            <h3 v-if="card.title">{{ card.title }}</h3>
            <div class="card-items">
              <div v-for="item in card.items" :key="item.label" class="card-item">
                <span class="item-label">{{ item.label }}</span>
                <span class="item-value">{{ resolveValue(item, customCardData) }}</span>
              </div>
            </div>
          </div>
        </section>
      </template>

      <!-- 股票/ETF -->
      <template v-if="sectionKey === 'etf' && config.sections.etf">
        <section class="dashboard-section etf-section">
          <StocksEtfModule
            :config="{ uid: 'stocks-etf', enabled: true, options: {}, columns: config.columns.etf }"
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
        <!-- 自訂卡片：after-etf -->
        <section
          v-for="card in getCustomCardsAt('after-etf')"
          :key="card.id"
          class="dashboard-section custom-section"
        >
          <div class="custom-card" :class="card.layout">
            <h3 v-if="card.title">{{ card.title }}</h3>
            <div class="card-items">
              <div v-for="item in card.items" :key="item.label" class="card-item">
                <span class="item-label">{{ item.label }}</span>
                <span class="item-value">{{ resolveValue(item, customCardData) }}</span>
              </div>
            </div>
          </div>
        </section>
      </template>

      <!-- 無配息資產 -->
      <template v-if="sectionKey === 'otherAssets' && config.sections.otherAssets">
        <section class="dashboard-section other-assets-section">
          <OtherAssetsModule
            :config="{ uid: 'other-assets', enabled: true, options: {}, columns: config.columns.otherAssets }"
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
        <!-- 自訂卡片：after-otherAssets -->
        <section
          v-for="card in getCustomCardsAt('after-otherAssets')"
          :key="card.id"
          class="dashboard-section custom-section"
        >
          <div class="custom-card" :class="card.layout">
            <h3 v-if="card.title">{{ card.title }}</h3>
            <div class="card-items">
              <div v-for="item in card.items" :key="item.label" class="card-item">
                <span class="item-label">{{ item.label }}</span>
                <span class="item-value">{{ resolveValue(item, customCardData) }}</span>
              </div>
            </div>
          </div>
        </section>
      </template>

      <!-- 貸款 -->
      <template v-if="sectionKey === 'loans' && config.sections.loans">
        <section class="dashboard-section loans-section">
          <LoansModule
            :config="{ uid: 'loans', enabled: true, options: {}, columns: config.columns.loans }"
            :calculated-loans="moduleProps.calculatedLoans"
            :loan-total="moduleProps.loanTotal"
          />
        </section>
        <!-- 自訂卡片：after-loans -->
        <section
          v-for="card in getCustomCardsAt('after-loans')"
          :key="card.id"
          class="dashboard-section custom-section"
        >
          <div class="custom-card" :class="card.layout">
            <h3 v-if="card.title">{{ card.title }}</h3>
            <div class="card-items">
              <div v-for="item in card.items" :key="item.label" class="card-item">
                <span class="item-label">{{ item.label }}</span>
                <span class="item-value">{{ resolveValue(item, customCardData) }}</span>
              </div>
            </div>
          </div>
        </section>
      </template>

      <!-- 資產歷史 -->
      <template v-if="sectionKey === 'history' && config.sections.history">
        <section class="dashboard-section history-section">
          <AssetHistoryModule
            :config="{ uid: 'asset-history', enabled: true, options: {} }"
            :asset-history-records="moduleProps.assetHistoryRecords"
          />
        </section>
        <!-- 自訂卡片：after-history -->
        <section
          v-for="card in getCustomCardsAt('after-history')"
          :key="card.id"
          class="dashboard-section custom-section"
        >
          <div class="custom-card" :class="card.layout">
            <h3 v-if="card.title">{{ card.title }}</h3>
            <div class="card-items">
              <div v-for="item in card.items" :key="item.label" class="card-item">
                <span class="item-label">{{ item.label }}</span>
                <span class="item-value">{{ resolveValue(item, customCardData) }}</span>
              </div>
            </div>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.user-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap, 20px);
}

.dashboard-section {
  /* 區塊基本樣式 */
}

/* 自訂卡片樣式 */
.custom-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 20px;
  color: #fff;
}

.custom-card h3 {
  margin: 0 0 16px;
  color: var(--primary-color, #667eea);
  font-size: 18px;
}

.card-items {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

/* 網格布局 */
.custom-card.grid-2 .card-items {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
}

.custom-card.grid-3 .card-items {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.custom-card.grid-4 .card-items {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.card-item {
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-label {
  color: #888;
  font-size: 12px;
}

.item-value {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

/* 響應式 */
@media (max-width: 768px) {
  .custom-card.grid-3 .card-items,
  .custom-card.grid-4 .card-items {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .custom-card.grid-2 .card-items,
  .custom-card.grid-3 .card-items,
  .custom-card.grid-4 .card-items {
    grid-template-columns: 1fr;
  }
}
</style>
