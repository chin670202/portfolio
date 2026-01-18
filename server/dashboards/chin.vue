<!--
  用戶專屬儀表板模板

  這是一個可由 AI 修改的 Vue SFC 檔案。
  用戶可以透過口語指令要求調整：
  - 「把債券移到最上面」
  - 「隱藏貸款區塊」
  - 「改成深色主題」
  - 「只顯示總資產和淨值」

  【重要規則】
  1. 只修改 <template> 和 <style> 區塊
  2. 不要修改 <script> 中的 props 定義
  3. 使用 v-if 控制區塊顯示/隱藏
  4. 使用 CSS 變數調整主題色彩
-->
<template>
  <div class="user-dashboard" :style="themeVars">
    <!-- 摘要卡片區塊 -->
    <section class="dashboard-section summary-section" v-if="sections.summary">
      <SummaryCardsModule
        :config="{ uid: 'summary-cards', enabled: true, options: {} }"
        :exchange-rate="moduleProps.exchangeRate"
        :grand-total="moduleProps.grandTotal"
        :loan-total="moduleProps.loanTotal"
        :net-income="moduleProps.netIncome"
        :updating="moduleProps.updating"
      />
    </section>

    <!-- 海外債券區塊 -->
    <section class="dashboard-section bonds-section" v-if="sections.bonds">
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

    <!-- 股票/ETF 區塊 -->
    <section class="dashboard-section etf-section" v-if="sections.etf">
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

    <!-- 無配息資產區塊 -->
    <section class="dashboard-section other-assets-section" v-if="sections.otherAssets">
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

    <!-- 貸款區塊 -->
    <section class="dashboard-section loans-section" v-if="sections.loans">
      <LoansModule
        :config="{ uid: 'loans', enabled: true, options: {} }"
        :calculated-loans="moduleProps.calculatedLoans"
        :loan-total="moduleProps.loanTotal"
      />
    </section>

    <!-- 資產歷史區塊 -->
    <section class="dashboard-section history-section" v-if="sections.history">
      <AssetHistoryModule
        :config="{ uid: 'asset-history', enabled: true, options: {} }"
        :asset-history-records="moduleProps.assetHistoryRecords"
      />
    </section>
  </div>
</template>

<script setup>
/**
 * 用戶專屬儀表板
 * 【警告】不要修改這個 script 區塊的 props 定義
 */

// 元件引入（這些由編譯時注入，不需要手動 import）
import SummaryCardsModule from '../../src/modules/SummaryCardsModule.vue'
import OverseasBondsModule from '../../src/modules/OverseasBondsModule.vue'
import StocksEtfModule from '../../src/modules/StocksEtfModule.vue'
import OtherAssetsModule from '../../src/modules/OtherAssetsModule.vue'
import LoansModule from '../../src/modules/LoansModule.vue'
import AssetHistoryModule from '../../src/modules/AssetHistoryModule.vue'

const props = defineProps({
  moduleProps: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-news'])

function handleOpenNews(symbol, name) {
  emit('open-news', symbol, name)
}

// ========== 可由 AI 修改的區塊配置 ==========
// 控制各區塊的顯示/隱藏
const sections = {
  summary: true,      // 摘要卡片
  bonds: true,        // 海外債券
  etf: true,          // 股票/ETF
  otherAssets: true,  // 無配息資產
  loans: true,        // 貸款
  history: true       // 資產歷史
}

// 主題色彩變數（可由 AI 修改）
const themeVars = {
  '--primary-color': '#667eea',
  '--primary-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  '--section-gap': '20px'
}
</script>

<style scoped>
.user-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap, 20px);
}

.dashboard-section {
  /* 區塊基本樣式 */
}

/* ========== 以下樣式可由 AI 修改 ========== */

/* 摘要區塊樣式 */
.summary-section {
  /* 可自訂 */
}

/* 債券區塊樣式 */
.bonds-section {
  /* 可自訂 */
}

/* ETF 區塊樣式 */
.etf-section {
  /* 可自訂 */
}

/* 其他資產區塊樣式 */
.other-assets-section {
  /* 可自訂 */
}

/* 貸款區塊樣式 */
.loans-section {
  /* 可自訂 */
}

/* 歷史記錄區塊樣式 */
.history-section {
  /* 可自訂 */
}
</style>
