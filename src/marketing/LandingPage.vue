<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge">專為投資人打造</div>
        <h1 class="hero-title">
          所有投資，<br>
          <span class="highlight">一眼掌握</span>
        </h1>
        <p class="hero-subtitle">
          海外債券、ETF、股票、加密貨幣<br>
          不再分散各處，全部整合在一個畫面
        </p>
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-number">5+</span>
            <span class="stat-label">資產類型</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">即時</span>
            <span class="stat-label">價格更新</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">AI</span>
            <span class="stat-label">新聞分析</span>
          </div>
        </div>
        <div class="hero-cta">
          <a href="/portfolio/demo" target="_blank" class="btn-primary">
            查看示範
            <span class="btn-arrow">→</span>
          </a>
          <button class="btn-secondary" @click="scrollToFeatures">了解更多</button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="dashboard-mockup">
          <div class="mockup-header">
            <div class="mockup-dots">
              <span></span><span></span><span></span>
            </div>
            <span class="mockup-title">投資組合儀表板</span>
          </div>
          <div class="mockup-body">
            <div class="mockup-summary">
              <div class="summary-card green">
                <span class="label">總資產</span>
                <span class="value">8,432 萬</span>
              </div>
              <div class="summary-card blue">
                <span class="label">淨值</span>
                <span class="value">931 萬</span>
              </div>
              <div class="summary-card orange">
                <span class="label">年收益</span>
                <span class="value">307 萬</span>
              </div>
            </div>
            <div class="mockup-table">
              <div class="table-row header">
                <span>名稱</span>
                <span>現價</span>
                <span>台幣市值</span>
                <span>報酬</span>
                <span>殖利率</span>
                <span>新聞</span>
              </div>
              <div class="table-row">
                <span>渣打 6.296%</span>
                <span>107.76</span>
                <span>681萬</span>
                <span class="positive">+7.76%</span>
                <span>5.84%</span>
                <span class="news bullish">看漲</span>
              </div>
              <div class="table-row">
                <span>元大 00720B</span>
                <span>34.15</span>
                <span>300萬</span>
                <span class="negative">-0.98%</span>
                <span>5.16%</span>
                <span class="news neutral">中立</span>
              </div>
              <div class="table-row">
                <span>特斯拉 TSLA</span>
                <span>426.50</span>
                <span>216萬</span>
                <span class="positive">+11.5%</span>
                <span>-</span>
                <span class="news bearish">看跌</span>
              </div>
              <div class="table-row">
                <span>國泰 00878</span>
                <span>23.85</span>
                <span>23萬</span>
                <span class="positive">+10.3%</span>
                <span>6.71%</span>
                <span class="news bullish">看漲</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Problem Section -->
    <section class="problems">
      <div class="section-title">
        <h2>投資管理的<span class="text-danger">四大痛點</span></h2>
        <p>這些問題是否也困擾著您？</p>
      </div>
      <div class="problems-grid">
        <div class="problem-card">
          <div class="problem-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
          <h3>資產散落各處</h3>
          <p>券商 APP、交易所、銀行 APP... 每次想看總資產都要開好幾個軟體</p>
        </div>
        <div class="problem-card">
          <div class="problem-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
            </svg>
          </div>
          <h3>報酬算不清</h3>
          <p>買入成本、匯率、配息... 手動計算超麻煩，還常常算錯</p>
        </div>
        <div class="problem-card">
          <div class="problem-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
            </svg>
          </div>
          <h3>新聞太多</h3>
          <p>每天上百則財經新聞，哪些跟我的持股有關？根本看不完</p>
        </div>
        <div class="problem-card">
          <div class="problem-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h3>風險無預警</h3>
          <p>質押維持率、斷頭風險... 等到券商通知往往已經來不及</p>
        </div>
      </div>
    </section>

    <!-- Solution Section -->
    <section class="solution">
      <div class="solution-content">
        <div class="solution-text">
          <h2>一個儀表板，解決所有問題</h2>
          <p class="solution-desc">
            我們打造了一個專業投資人都在用的管理工具，<br>
            讓您用最少的時間，掌握最完整的資訊。
          </p>
          <ul class="solution-benefits">
            <li>
              <span class="benefit-check">✓</span>
              <div>
                <strong>整合所有資產</strong>
                <p>海外債券、ETF、美股、台股、加密貨幣，全部一頁顯示</p>
              </div>
            </li>
            <li>
              <span class="benefit-check">✓</span>
              <div>
                <strong>自動計算報酬</strong>
                <p>損益、殖利率、配息... 按一下全部算好，還會換算匯率</p>
              </div>
            </li>
            <li>
              <span class="benefit-check">✓</span>
              <div>
                <strong>AI 過濾新聞</strong>
                <p>只顯示跟您持股相關的新聞，還會標記「看漲」或「看跌」</p>
              </div>
            </li>
            <li>
              <span class="benefit-check">✓</span>
              <div>
                <strong>維持率即時監控</strong>
                <p>金交債、股票質借維持率一目瞭然，低於警戒立即提醒</p>
              </div>
            </li>
          </ul>
        </div>
        <div class="solution-visual">
          <div class="feature-showcase">
            <div class="showcase-item active" @click="activeShowcase = 0">
              <span class="showcase-num">01</span>
              <span class="showcase-title">多資產整合</span>
            </div>
            <div class="showcase-item" :class="{ active: activeShowcase === 1 }" @click="activeShowcase = 1">
              <span class="showcase-num">02</span>
              <span class="showcase-title">即時報價</span>
            </div>
            <div class="showcase-item" :class="{ active: activeShowcase === 2 }" @click="activeShowcase = 2">
              <span class="showcase-num">03</span>
              <span class="showcase-title">AI 新聞</span>
            </div>
            <div class="showcase-item" :class="{ active: activeShowcase === 3 }" @click="activeShowcase = 3">
              <span class="showcase-num">04</span>
              <span class="showcase-title">風險監控</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
      <div class="section-title">
        <h2>核心功能</h2>
        <p>專為專業投資人設計的完整功能</p>
      </div>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon-wrapper">
            <span class="feature-emoji">📊</span>
          </div>
          <h3>多資產追蹤</h3>
          <p>海外債券、台灣 ETF、美股、台股、加密貨幣，所有資產一個畫面搞定</p>
          <div class="feature-tags">
            <span class="tag">5+ 資產類型</span>
            <span class="tag">自動匯率</span>
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-icon-wrapper">
            <span class="feature-emoji">⚡</span>
          </div>
          <h3>即時價格</h3>
          <p>一鍵更新所有持股價格，支援法蘭克福、Yahoo、CoinGecko 等多來源</p>
          <div class="feature-tags">
            <span class="tag">多來源報價</span>
            <span class="tag">一鍵更新</span>
          </div>
        </div>
        <div class="feature-card featured">
          <div class="featured-badge">AI 加持</div>
          <div class="feature-icon-wrapper">
            <span class="feature-emoji">🤖</span>
          </div>
          <h3>新聞情緒分析</h3>
          <p>自動抓取相關新聞，AI 判斷看漲或看跌，讓您快速掌握市場風向</p>
          <div class="feature-tags">
            <span class="tag">看漲/看跌</span>
            <span class="tag">即時新聞</span>
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-icon-wrapper">
            <span class="feature-emoji">💰</span>
          </div>
          <h3>配息追蹤</h3>
          <p>月配、季配、半年配... 自動計算殖利率、年收入，下次配息日提醒</p>
          <div class="feature-tags">
            <span class="tag">配息日曆</span>
            <span class="tag">殖利率</span>
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-icon-wrapper">
            <span class="feature-emoji">🛡️</span>
          </div>
          <h3>維持率監控</h3>
          <p>金交債、股票質借維持率即時計算，低於追繳線立即警示</p>
          <div class="feature-tags">
            <span class="tag">追繳警示</span>
            <span class="tag">119%/140%</span>
          </div>
        </div>
        <div class="feature-card featured">
          <div class="featured-badge">獨家功能</div>
          <div class="feature-icon-wrapper">
            <span class="feature-emoji">💬</span>
          </div>
          <h3>語音式更新</h3>
          <p>「買了 10 張 00878」直接輸入，AI 自動理解並更新您的部位</p>
          <div class="feature-tags">
            <span class="tag">自然語言</span>
            <span class="tag">圖片 OCR</span>
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-icon-wrapper">
            <span class="feature-emoji">📈</span>
          </div>
          <h3>趨勢分析</h3>
          <p>資產變化歷史記錄、趨勢圖表，長期追蹤您的財富成長軌跡</p>
          <div class="feature-tags">
            <span class="tag">折線圖</span>
            <span class="tag">歷史記錄</span>
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-icon-wrapper">
            <span class="feature-emoji">🎨</span>
          </div>
          <h3>自由定製</h3>
          <p>模組順序隨意調整、欄位顯示自由選擇，打造專屬於您的儀表板</p>
          <div class="feature-tags">
            <span class="tag">模組拖曳</span>
            <span class="tag">欄位配置</span>
          </div>
        </div>
        <div class="feature-card">
          <div class="feature-icon-wrapper">
            <span class="feature-emoji">💾</span>
          </div>
          <h3>自動備份</h3>
          <p>每次更新自動備份，一鍵還原歷史版本，資料永不遺失</p>
          <div class="feature-tags">
            <span class="tag">版本控制</span>
            <span class="tag">一鍵還原</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Demo Section -->
    <section class="demo-section" id="demo">
      <div class="demo-content">
        <div class="demo-text">
          <h2>眼見為憑</h2>
          <p>點擊查看「王小明」的示範投資組合，<br>親身體驗所有功能</p>
          <a href="/portfolio/demo" target="_blank" class="btn-demo">
            開啟示範
            <span class="btn-arrow">→</span>
          </a>
          <p class="demo-note">無需註冊，立即體驗</p>
        </div>
        <div class="demo-features">
          <div class="demo-feature">
            <span class="demo-check">✓</span>
            <span>海外債券 9 檔</span>
          </div>
          <div class="demo-feature">
            <span class="demo-check">✓</span>
            <span>ETF 8 檔</span>
          </div>
          <div class="demo-feature">
            <span class="demo-check">✓</span>
            <span>美股台股 10+ 檔</span>
          </div>
          <div class="demo-feature">
            <span class="demo-check">✓</span>
            <span>加密貨幣追蹤</span>
          </div>
          <div class="demo-feature">
            <span class="demo-check">✓</span>
            <span>貸款維持率</span>
          </div>
          <div class="demo-feature">
            <span class="demo-check">✓</span>
            <span>AI 新聞分析</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="testimonials">
      <div class="section-title">
        <h2>用戶心聲</h2>
        <p>聽聽他們怎麼說</p>
      </div>
      <div class="testimonials-grid">
        <div class="testimonial-card">
          <div class="testimonial-content">
            <p>「以前每個月花 2 小時整理 Excel，現在 10 秒鐘全部搞定。維持率監控更是救了我一命！」</p>
          </div>
          <div class="testimonial-author">
            <div class="author-avatar">陳</div>
            <div class="author-info">
              <span class="author-name">陳先生</span>
              <span class="author-title">金交債投資人 / 8 年經驗</span>
            </div>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-content">
            <p>「AI 新聞分析太強了！以前都要自己去搜新聞，現在一打開就知道哪些持股有風險。」</p>
          </div>
          <div class="testimonial-author">
            <div class="author-avatar">林</div>
            <div class="author-info">
              <span class="author-name">林小姐</span>
              <span class="author-title">ETF 存股族 / 3 年經驗</span>
            </div>
          </div>
        </div>
        <div class="testimonial-card">
          <div class="testimonial-content">
            <p>「資料存在自己 GitHub，不用擔心隱私問題。而且可以自訂欄位，超級彈性！」</p>
          </div>
          <div class="testimonial-author">
            <div class="author-avatar">王</div>
            <div class="author-info">
              <span class="author-name">王先生</span>
              <span class="author-title">軟體工程師 / 資產配置愛好者</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section class="pricing-section" id="pricing">
      <div class="section-title">
        <h2>選擇方案</h2>
        <p>依照您的需求，選擇最適合的方案</p>
      </div>
      <div class="pricing-grid">
        <!-- Free Plan -->
        <div class="pricing-card">
          <div class="pricing-header">
            <h3>免費版</h3>
            <div class="pricing-price">
              <span class="price-amount">$0</span>
              <span class="price-period">/月</span>
            </div>
            <p class="pricing-desc">適合剛開始管理投資的您</p>
          </div>
          <ul class="pricing-features">
            <li class="included">
              <span class="feature-icon">✓</span>
              <span>多資產整合追蹤</span>
            </li>
            <li class="included">
              <span class="feature-icon">✓</span>
              <span>手動更新部位</span>
            </li>
            <li class="included">
              <span class="feature-icon">✓</span>
              <span>基本損益計算</span>
            </li>
            <li class="included">
              <span class="feature-icon">✓</span>
              <span>配息追蹤</span>
            </li>
            <li class="included">
              <span class="feature-icon">✓</span>
              <span>資產變化歷史記錄</span>
            </li>
            <li class="not-included">
              <span class="feature-icon">✗</span>
              <span>AI 新聞情緒分析</span>
            </li>
            <li class="not-included">
              <span class="feature-icon">✗</span>
              <span>看漲/看跌警示</span>
            </li>
            <li class="not-included">
              <span class="feature-icon">✗</span>
              <span>暴漲暴跌即時提示</span>
            </li>
            <li class="not-included">
              <span class="feature-icon">✗</span>
              <span>價格即時自動更新</span>
            </li>
          </ul>
          <a href="/portfolio/demo" target="_blank" class="btn-pricing free">
            免費開始
          </a>
        </div>

        <!-- Pro Plan -->
        <div class="pricing-card featured">
          <div class="pricing-badge">推薦</div>
          <div class="pricing-header">
            <h3>專業版</h3>
            <div class="pricing-price">
              <span class="price-amount">$299</span>
              <span class="price-period">/月</span>
            </div>
            <p class="pricing-desc">完整功能，掌握市場先機</p>
          </div>
          <ul class="pricing-features">
            <li class="included">
              <span class="feature-icon">✓</span>
              <span>多資產整合追蹤</span>
            </li>
            <li class="included">
              <span class="feature-icon">✓</span>
              <span>語音式快速更新</span>
            </li>
            <li class="included">
              <span class="feature-icon">✓</span>
              <span>進階損益分析</span>
            </li>
            <li class="included">
              <span class="feature-icon">✓</span>
              <span>配息追蹤 + 日曆提醒</span>
            </li>
            <li class="included">
              <span class="feature-icon">✓</span>
              <span>資產變化歷史記錄</span>
            </li>
            <li class="included highlight">
              <span class="feature-icon">✓</span>
              <span>AI 新聞情緒分析</span>
            </li>
            <li class="included highlight">
              <span class="feature-icon">✓</span>
              <span>看漲/看跌警示</span>
            </li>
            <li class="included highlight">
              <span class="feature-icon">✓</span>
              <span>暴漲暴跌即時提示</span>
            </li>
            <li class="included highlight">
              <span class="feature-icon">✓</span>
              <span>價格即時自動更新</span>
            </li>
          </ul>
          <a href="/portfolio/demo" target="_blank" class="btn-pricing pro">
            立即訂閱
          </a>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="faq-section">
      <div class="section-title">
        <h2>常見問題</h2>
      </div>
      <div class="faq-container">
        <div class="faq-item" v-for="(item, index) in faqItems" :key="index">
          <div class="faq-question" @click="toggleFaq(index)">
            <span>{{ item.question }}</span>
            <span class="faq-icon" :class="{ open: openFaq === index }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 9l-7 7-7-7"></path>
              </svg>
            </span>
          </div>
          <transition name="faq">
            <div class="faq-answer" v-show="openFaq === index">
              {{ item.answer }}
            </div>
          </transition>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="final-cta">
      <div class="cta-content">
        <h2>準備好掌握您的投資了嗎？</h2>
        <p>免費試用，無需註冊</p>
        <a href="/portfolio/demo" target="_blank" class="btn-cta">
          立即體驗
        </a>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <h3>智能投資組合管理</h3>
          <p>讓投資管理更簡單</p>
        </div>
        <div class="footer-links">
          <h4>功能</h4>
          <a href="#features">核心功能</a>
          <a href="#demo">免費試用</a>
        </div>
        <div class="footer-links">
          <h4>支援</h4>
          <a href="#">使用說明</a>
          <a href="#">常見問題</a>
        </div>
        <div class="footer-links">
          <h4>關於</h4>
          <a href="#">隱私政策</a>
          <a href="#">服務條款</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2025 智能投資組合管理系統</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const openFaq = ref(null)
const activeShowcase = ref(0)

const faqItems = [
  {
    question: '我的資料安全嗎？',
    answer: '您的資料存放在您自己的 GitHub 帳號中，我們不會存取任何財務資料。系統採用純前端架構，所有計算都在您的瀏覽器中進行，完全保護您的隱私。'
  },
  {
    question: '支援哪些投資商品？',
    answer: '目前支援海外債券（金交債）、台灣 ETF、美股、台股、加密貨幣（BTC、ETH 等）。價格來源包括法蘭克福交易所、Yahoo Finance、CoinGecko 等。'
  },
  {
    question: 'AI 新聞分析如何運作？',
    answer: '系統會自動抓取 Google News 上與您持股相關的新聞，然後使用關鍵字分析或 Transformers.js AI 模型判斷新聞情緒，標記為「看漲」或「看跌」。'
  },
  {
    question: '什麼是「語音式更新」？',
    answer: '您可以用自然語言描述交易，例如「買了 10 張 00878 均價 21.5」，AI 會自動理解並更新您的投資部位，不需要手動填寫複雜的表單。'
  }
]

function toggleFaq(index) {
  openFaq.value = openFaq.value === index ? null : index
}

function scrollToFeatures() {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
/* 基礎變數 - 定義在 .landing-page 上讓 scoped 能正確運作 */
.landing-page {
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --secondary: #0f172a;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --gray-50: #f8fafc;
  --gray-100: #f1f5f9;
  --gray-200: #e2e8f0;
  --gray-400: #94a3b8;
  --gray-600: #475569;
  --gray-700: #374151;
  --gray-800: #1e293b;
  --gray-900: #0f172a;

  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft JhengHei', sans-serif;
  color: var(--gray-800);
  line-height: 1.6;
  background: #fff;
}

section {
  padding: 100px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  margin-bottom: 60px;
}

.section-title h2 {
  font-size: 40px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 12px;
}

.section-title p {
  font-size: 18px;
  color: #475569;
}

.text-danger { color: #ef4444; }

/* Hero */
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  min-height: 90vh;
  padding-top: 60px;
}

.hero-badge {
  display: inline-block;
  background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
  color: var(--primary);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 20px;
}

.hero-title {
  font-size: 56px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--gray-900);
  margin-bottom: 24px;
}

.hero-title .highlight {
  background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 20px;
  color: var(--gray-600);
  margin-bottom: 32px;
  line-height: 1.7;
}

.hero-stats {
  display: flex;
  gap: 40px;
  margin-bottom: 40px;
  padding: 24px 0;
  border-top: 1px solid var(--gray-200);
  border-bottom: 1px solid var(--gray-200);
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 28px;
  font-weight: 800;
  color: var(--primary);
}

.stat-label {
  font-size: 14px;
  color: var(--gray-600);
}

.hero-cta {
  display: flex;
  gap: 16px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #2563eb;
  color: white;
  padding: 16px 32px;
  font-size: 17px;
  font-weight: 600;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.3);
}

.btn-arrow {
  transition: transform 0.2s;
}

.btn-primary:hover .btn-arrow {
  transform: translateX(4px);
}

.btn-secondary {
  background: transparent;
  color: var(--gray-800);
  padding: 16px 32px;
  font-size: 17px;
  font-weight: 600;
  border-radius: 12px;
  border: 2px solid var(--gray-200);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* Dashboard Mockup */
.dashboard-mockup {
  background: #f8fafc;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
}

.mockup-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

.mockup-dots {
  display: flex;
  gap: 6px;
}

.mockup-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.mockup-dots span:nth-child(1) { background: #fca5a5; }
.mockup-dots span:nth-child(2) { background: #fcd34d; }
.mockup-dots span:nth-child(3) { background: #86efac; }

.mockup-title {
  color: white;
  font-size: 13px;
  font-weight: 500;
}

.mockup-body {
  padding: 20px;
  background: white;
}

.mockup-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.summary-card {
  padding: 16px 12px;
  border-radius: 12px;
  text-align: center;
}

.summary-card .label {
  display: block;
  font-size: 11px;
  color: rgba(255,255,255,0.85);
  margin-bottom: 4px;
  font-weight: 500;
}

.summary-card .value {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: white;
}

.summary-card.green { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }
.summary-card.blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
.summary-card.orange { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }

.mockup-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.table-row {
  display: grid;
  grid-template-columns: 1.8fr 1fr 1fr 1fr 1fr 0.8fr;
  padding: 10px 12px;
  font-size: 11px;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
  align-items: center;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row.header {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  font-weight: 600;
  color: white;
}

.table-row .positive { color: #16a34a; font-weight: 600; }
.table-row .negative { color: #dc2626; font-weight: 600; }

.table-row .news {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.news.bullish { background: #dcfce7; color: #16a34a; }
.news.bearish { background: #fee2e2; color: #dc2626; }
.news.neutral { background: #f1f5f9; color: #64748b; }

/* Problems Section */
.problems {
  background: #f8fafc;
  border-radius: 32px;
  margin: 0 auto;
  max-width: calc(1200px - 48px);
}

.problems-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.problem-card {
  background: white;
  padding: 32px 24px;
  border-radius: 16px;
  text-align: center;
  border: 1px solid var(--gray-200);
  transition: all 0.3s;
}

.problem-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.problem-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.problem-icon svg {
  width: 28px;
  height: 28px;
  color: var(--danger);
}

.problem-card h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 8px;
}

.problem-card p {
  font-size: 14px;
  color: var(--gray-600);
  line-height: 1.6;
}

/* Solution Section */
.solution {
  padding: 120px 24px;
}

.solution-content {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 80px;
  align-items: center;
}

.solution-text h2 {
  font-size: 40px;
  font-weight: 800;
  color: var(--gray-900);
  margin-bottom: 16px;
}

.solution-desc {
  font-size: 18px;
  color: var(--gray-600);
  margin-bottom: 40px;
  line-height: 1.8;
}

.solution-benefits {
  list-style: none;
  padding: 0;
}

.solution-benefits li {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.benefit-check {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: var(--success);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
}

.solution-benefits strong {
  display: block;
  font-size: 17px;
  color: var(--gray-900);
  margin-bottom: 4px;
}

.solution-benefits p {
  font-size: 15px;
  color: var(--gray-600);
  margin: 0;
}

.feature-showcase {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.showcase-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: var(--gray-50);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.showcase-item:hover {
  background: white;
  border-color: var(--gray-200);
}

.showcase-item.active {
  background: white;
  border-color: var(--primary);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.12);
}

.showcase-num {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
}

.showcase-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-800);
}

/* Features Grid */
.features {
  background: #f8fafc;
  border-radius: 32px;
  margin: 0 auto;
  max-width: calc(1200px - 48px);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  background: white;
  padding: 32px;
  border-radius: 20px;
  border: 1px solid var(--gray-200);
  transition: all 0.3s;
  position: relative;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.08);
}

.feature-card.featured {
  border-color: #2563eb;
  background: linear-gradient(135deg, #eff6ff 0%, #fff 50%);
}

.featured-badge {
  position: absolute;
  top: -10px;
  right: 20px;
  background: #2563eb;
  color: white;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.feature-icon-wrapper {
  margin-bottom: 20px;
}

.feature-emoji {
  font-size: 40px;
}

.feature-card h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 12px;
}

.feature-card p {
  font-size: 15px;
  color: var(--gray-600);
  line-height: 1.6;
  margin-bottom: 16px;
}

.feature-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  background: var(--gray-100);
  color: var(--gray-600);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

/* Demo Section */
.demo-section {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-radius: 32px;
  margin: 60px auto;
  max-width: calc(1200px - 48px);
  padding: 80px;
  border: 1px solid #bbf7d0;
}

.demo-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.demo-text h2 {
  font-size: 40px;
  font-weight: 800;
  color: #166534;
  margin-bottom: 16px;
}

.demo-text p {
  font-size: 18px;
  color: #166534;
  margin-bottom: 32px;
  line-height: 1.7;
}

.btn-demo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #16a34a;
  color: white;
  padding: 16px 40px;
  font-size: 18px;
  font-weight: 700;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-demo:hover {
  background: #15803d;
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(22, 163, 74, 0.3);
}

.demo-note {
  margin-top: 16px;
  font-size: 14px;
  color: #4ade80;
}

.demo-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.demo-feature {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 16px 20px;
  border-radius: 12px;
  color: #166534;
  font-size: 15px;
  border: 1px solid #bbf7d0;
}

.demo-check {
  color: #16a34a;
  font-weight: 700;
}

/* Pricing Section */
.pricing-section {
  padding: 100px 24px;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  max-width: 900px;
  margin: 0 auto;
}

.pricing-card {
  background: white;
  border-radius: 24px;
  padding: 40px;
  border: 2px solid #e2e8f0;
  position: relative;
  transition: all 0.3s;
}

.pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
}

.pricing-card.featured {
  border-color: #2563eb;
  background: linear-gradient(135deg, #eff6ff 0%, #fff 50%);
}

.pricing-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #2563eb;
  color: white;
  padding: 6px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.pricing-header {
  text-align: center;
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 24px;
}

.pricing-header h3 {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
}

.pricing-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin-bottom: 8px;
}

.price-amount {
  font-size: 48px;
  font-weight: 800;
  color: #0f172a;
}

.pricing-card.featured .price-amount {
  color: #2563eb;
}

.price-period {
  font-size: 18px;
  color: #64748b;
}

.pricing-desc {
  font-size: 15px;
  color: #64748b;
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 32px 0;
}

.pricing-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  font-size: 15px;
  border-bottom: 1px solid #f1f5f9;
}

.pricing-features li:last-child {
  border-bottom: none;
}

.pricing-features li.included {
  color: #334155;
}

.pricing-features li.included .feature-icon {
  color: #22c55e;
  font-weight: 700;
}

.pricing-features li.included.highlight {
  color: #1e40af;
  font-weight: 600;
}

.pricing-features li.included.highlight .feature-icon {
  color: #2563eb;
}

.pricing-features li.not-included {
  color: #94a3b8;
}

.pricing-features li.not-included .feature-icon {
  color: #cbd5e1;
}

.btn-pricing {
  display: block;
  width: 100%;
  padding: 16px;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-pricing.free {
  background: #f1f5f9;
  color: #475569;
}

.btn-pricing.free:hover {
  background: #e2e8f0;
}

.btn-pricing.pro {
  background: #2563eb;
  color: white;
}

.btn-pricing.pro:hover {
  background: #1d4ed8;
  transform: scale(1.02);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
}

/* Testimonials */
.testimonials {
  background: #f8fafc;
  border-radius: 32px;
  margin: 0 auto 60px;
  max-width: calc(1200px - 48px);
  padding: 80px;
}

.testimonials .section-title h2 {
  color: #0f172a;
}

.testimonials .section-title p {
  color: #475569;
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.testimonial-card {
  background: white;
  padding: 32px;
  border-radius: 20px;
  border: 1px solid var(--gray-200);
}

.testimonial-content p {
  font-size: 16px;
  color: var(--gray-700);
  line-height: 1.8;
  margin-bottom: 24px;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 16px;
}

.author-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-weight: 700;
  color: var(--gray-900);
}

.author-title {
  font-size: 13px;
  color: var(--gray-500);
}

/* FAQ */
.faq-section {
  padding-bottom: 60px;
}

.faq-container {
  max-width: 800px;
  margin: 0 auto;
}

.faq-item {
  border-bottom: 1px solid var(--gray-200);
}

.faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0;
  cursor: pointer;
  font-size: 17px;
  font-weight: 600;
  color: var(--gray-900);
  transition: color 0.2s;
}

.faq-question:hover {
  color: var(--primary);
}

.faq-icon {
  width: 24px;
  height: 24px;
  transition: transform 0.3s;
}

.faq-icon.open {
  transform: rotate(180deg);
}

.faq-icon svg {
  width: 100%;
  height: 100%;
  color: var(--gray-400);
}

.faq-answer {
  padding-bottom: 24px;
  color: var(--gray-600);
  line-height: 1.7;
}

.faq-enter-active,
.faq-leave-active {
  transition: all 0.3s;
}

.faq-enter-from,
.faq-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Final CTA */
.final-cta {
  background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
  border-radius: 32px;
  margin: 60px auto;
  max-width: calc(1200px - 48px);
  padding: 80px;
  text-align: center;
  border: 1px solid #bfdbfe;
}

.cta-content h2 {
  font-size: 40px;
  font-weight: 800;
  color: #1e40af;
  margin-bottom: 12px;
}

.cta-content p {
  font-size: 18px;
  color: #3b82f6;
  margin-bottom: 32px;
}

.btn-cta {
  display: inline-block;
  background: #2563eb;
  color: white;
  padding: 18px 48px;
  font-size: 18px;
  font-weight: 700;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-cta:hover {
  background: #1d4ed8;
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(37, 99, 235, 0.4);
}

/* Footer */
.landing-footer {
  background: #0f172a;
  padding: 60px 24px 30px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 48px;
  padding-bottom: 40px;
  border-bottom: 1px solid var(--gray-800);
}

.footer-brand h3 {
  font-size: 20px;
  color: white;
  margin-bottom: 8px;
}

.footer-brand p {
  color: #94a3b8;
}

.footer-links h4 {
  font-size: 14px;
  color: white;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.footer-links a {
  display: block;
  color: #94a3b8;
  text-decoration: none;
  padding: 6px 0;
  font-size: 15px;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: white;
}

.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 24px;
  text-align: center;
}

.footer-bottom p {
  color: #94a3b8;
  font-size: 14px;
}

/* Responsive */
@media (max-width: 1024px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }

  .hero-stats {
    justify-content: center;
  }

  .hero-cta {
    justify-content: center;
  }

  .problems-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .solution-content {
    grid-template-columns: 1fr;
  }

  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .demo-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .demo-features {
    justify-content: center;
    max-width: 500px;
    margin: 0 auto;
  }

  .testimonials-grid {
    grid-template-columns: 1fr;
  }

  .testimonials {
    padding: 60px 40px;
  }

  .footer-content {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  section {
    padding: 60px 16px;
  }

  .hero {
    padding-top: 40px;
    min-height: auto;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .hero-badge {
    font-size: 12px;
    padding: 6px 12px;
  }

  .section-title h2 {
    font-size: 26px;
  }

  .section-title p {
    font-size: 15px;
  }

  .problems-grid,
  .features-grid {
    grid-template-columns: 1fr;
  }

  .hero-stats {
    flex-direction: row;
    justify-content: center;
    gap: 24px;
    padding: 20px 0;
  }

  .stat-item {
    align-items: center;
  }

  .stat-number {
    font-size: 22px;
  }

  .stat-label {
    font-size: 11px;
  }

  .hero-cta {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
    padding: 14px 24px;
    font-size: 16px;
  }

  /* Dashboard Mockup - 手機版 */
  .dashboard-mockup {
    margin: 0 -16px;
    border-radius: 12px;
  }

  .mockup-summary {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .summary-card {
    padding: 12px;
  }

  .summary-card .value {
    font-size: 18px;
  }

  .table-row {
    font-size: 11px;
    padding: 8px 12px;
  }

  /* Solution - 手機版 */
  .solution {
    padding: 60px 16px;
  }

  .solution-text h2 {
    font-size: 26px;
  }

  .solution-desc {
    font-size: 15px;
  }

  .solution-benefits li {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }

  .benefit-check {
    margin: 0 auto;
  }

  .feature-showcase {
    display: none;
  }

  /* Feature cards - 手機版 */
  .feature-card {
    padding: 24px;
  }

  .feature-emoji {
    font-size: 32px;
  }

  .feature-card h3 {
    font-size: 18px;
  }

  .feature-card p {
    font-size: 14px;
  }

  /* Demo section - 手機版 */
  .demo-section {
    padding: 48px 20px;
    margin: 40px 16px;
    border-radius: 24px;
  }

  .demo-text h2 {
    font-size: 28px;
  }

  .demo-text p {
    font-size: 15px;
  }

  .btn-demo {
    padding: 14px 32px;
    font-size: 16px;
    width: 100%;
    justify-content: center;
  }

  .demo-features {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .demo-feature {
    padding: 12px 16px;
    font-size: 14px;
  }

  /* Pricing - 手機版 */
  .pricing-section {
    padding: 60px 16px;
  }

  .pricing-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .pricing-card {
    padding: 32px 24px;
  }

  .price-amount {
    font-size: 40px;
  }

  .pricing-features li {
    font-size: 14px;
    padding: 10px 0;
  }

  /* Testimonials - 手機版 */
  .testimonials {
    padding: 48px 20px;
    margin: 0 16px 40px;
    border-radius: 24px;
  }

  .testimonial-card {
    padding: 24px;
  }

  .testimonial-content p {
    font-size: 14px;
  }

  .author-avatar {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .author-name {
    font-size: 14px;
  }

  .author-title {
    font-size: 12px;
  }

  /* FAQ - 手機版 */
  .faq-question {
    font-size: 15px;
    padding: 20px 0;
  }

  .faq-answer {
    font-size: 14px;
  }

  /* Final CTA - 手機版 */
  .final-cta {
    padding: 48px 20px;
    margin: 40px 16px;
    border-radius: 24px;
  }

  .cta-content h2 {
    font-size: 22px;
    line-height: 1.4;
  }

  .cta-content p {
    font-size: 14px;
  }

  .btn-cta {
    padding: 14px 32px;
    font-size: 16px;
    width: 100%;
    box-sizing: border-box;
  }

  /* Footer - 手機版 */
  .landing-footer {
    padding: 40px 16px 24px;
  }

  .footer-content {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 32px;
  }

  .footer-brand h3 {
    font-size: 18px;
  }

  .footer-links h4 {
    margin-bottom: 12px;
  }

  .footer-links a {
    font-size: 14px;
  }
}
</style>
