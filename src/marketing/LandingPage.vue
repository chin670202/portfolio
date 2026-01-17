<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">智能投資組合管理系統</h1>
        <p class="hero-subtitle">一站式追蹤您的海外債券、ETF、股票與加密貨幣</p>
        <p class="hero-description">
          即時價格更新 · AI 新聞情緒分析 · 自動計算報酬率
        </p>
        <div class="hero-cta">
          <button class="btn-primary" @click="scrollToDemo">免費試用</button>
          <button class="btn-secondary" @click="scrollToPricing">查看方案</button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="dashboard-preview">
          <div class="preview-header">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <div class="preview-content">
            <div class="preview-stat asset">台幣資產 2,850萬</div>
            <div class="preview-stat equity">台幣淨值 1,420萬</div>
            <div class="preview-stat income">全年淨收 68萬</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pain Points Section -->
    <section class="pain-points">
      <h2>您是否也有這些困擾？</h2>
      <div class="pain-grid">
        <div class="pain-card">
          <span class="pain-icon">📊</span>
          <h3>資產分散難追蹤</h3>
          <p>海外債券、台股、美股、加密貨幣分散在不同平台，難以掌握整體狀況</p>
        </div>
        <div class="pain-card">
          <span class="pain-icon">💹</span>
          <h3>報酬率計算繁瑣</h3>
          <p>手動計算匯率、成本、報酬率，耗時又容易出錯</p>
        </div>
        <div class="pain-card">
          <span class="pain-icon">📰</span>
          <h3>新聞資訊爆炸</h3>
          <p>每天大量財經新聞，難以分辨哪些對持股有影響</p>
        </div>
        <div class="pain-card">
          <span class="pain-icon">⚠️</span>
          <h3>風險難以監控</h3>
          <p>質押維持率、貸款利息支出，缺乏即時警示</p>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
      <h2>強大功能，為您而生</h2>
      <div class="features-grid">
        <div class="feature-card highlight">
          <div class="feature-icon">🤖</div>
          <h3>AI 新聞情緒分析</h3>
          <p>自動分析新聞標題，智能判斷「看漲」或「看跌」，快速掌握市場風向</p>
          <ul class="feature-details">
            <li>支援中英文新聞</li>
            <li>一鍵篩選看漲/看跌新聞</li>
            <li>即時警示負面消息</li>
          </ul>
        </div>
        <div class="feature-card">
          <div class="feature-icon">💰</div>
          <h3>多資產整合追蹤</h3>
          <p>海外債券、ETF、美股、台股、加密貨幣，全部整合在一個儀表板</p>
          <ul class="feature-details">
            <li>自動匯率換算</li>
            <li>即時價格更新</li>
            <li>統一台幣計價</li>
          </ul>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📈</div>
          <h3>自動報酬率計算</h3>
          <p>自動計算報酬率、年化收益、配息殖利率</p>
          <ul class="feature-details">
            <li>含息報酬率計算</li>
            <li>成本均價追蹤</li>
            <li>持股比例分析</li>
          </ul>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🏦</div>
          <h3>貸款與維持率監控</h3>
          <p>追蹤質押貸款、計算維持率，避免斷頭風險</p>
          <ul class="feature-details">
            <li>金交債維持率</li>
            <li>股票質借維持率</li>
            <li>利息支出統計</li>
          </ul>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>資產變化趨勢</h3>
          <p>視覺化呈現資產、負債、淨值的歷史變化</p>
          <ul class="feature-details">
            <li>趨勢圖表分析</li>
            <li>歷史記錄追蹤</li>
            <li>財務健康檢視</li>
          </ul>
        </div>
        <div class="feature-card highlight">
          <div class="feature-icon">💬</div>
          <h3>語意化快速更新</h3>
          <p>用自然語言描述交易，AI 自動理解並更新您的投資部位</p>
          <ul class="feature-details">
            <li>「買了 10 張台積電」即可更新</li>
            <li>不需手動填寫複雜表單</li>
            <li>支援中文口語化輸入</li>
          </ul>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h3>資料安全私密</h3>
          <p>資料存放在您自己的 GitHub，完全掌控隱私</p>
          <ul class="feature-details">
            <li>無需註冊帳號</li>
            <li>資料自主管理</li>
            <li>開源透明</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Demo Section -->
    <section class="demo" id="demo">
      <h2>立即體驗</h2>
      <p class="demo-description">點擊下方按鈕，查看王小明的示範投資組合</p>
      <router-link to="/demo" class="btn-demo">
        查看示範 Demo
      </router-link>
    </section>

    <!-- Pricing Section -->
    <section class="pricing" id="pricing">
      <h2>選擇適合您的方案</h2>
      <div class="pricing-grid">
        <div class="pricing-card">
          <div class="pricing-header">
            <h3>免費版</h3>
            <div class="price">
              <span class="amount">$0</span>
              <span class="period">/月</span>
            </div>
          </div>
          <ul class="pricing-features">
            <li><span class="check">✓</span> 基本資產追蹤</li>
            <li><span class="check">✓</span> 手動價格更新</li>
            <li><span class="check">✓</span> 關鍵字新聞分析</li>
            <li><span class="check">✓</span> 基本報表功能</li>
            <li class="disabled"><span class="x">✗</span> AI 情緒分析</li>
            <li class="disabled"><span class="x">✗</span> 即時價格推播</li>
          </ul>
          <button class="btn-pricing free">開始使用</button>
        </div>
        <div class="pricing-card popular">
          <div class="popular-badge">最受歡迎</div>
          <div class="pricing-header">
            <h3>專業版</h3>
            <div class="price">
              <span class="amount">$299</span>
              <span class="period">/月</span>
            </div>
          </div>
          <ul class="pricing-features">
            <li><span class="check">✓</span> 所有免費版功能</li>
            <li><span class="check">✓</span> AI 新聞情緒分析</li>
            <li><span class="check">✓</span> 即時價格自動更新</li>
            <li><span class="check">✓</span> 進階報表與圖表</li>
            <li><span class="check">✓</span> Email 風險警示</li>
            <li><span class="check">✓</span> 優先客服支援</li>
          </ul>
          <button class="btn-pricing pro">立即訂閱</button>
        </div>
        <div class="pricing-card">
          <div class="pricing-header">
            <h3>企業版</h3>
            <div class="price">
              <span class="amount">聯繫我們</span>
            </div>
          </div>
          <ul class="pricing-features">
            <li><span class="check">✓</span> 所有專業版功能</li>
            <li><span class="check">✓</span> 多帳戶管理</li>
            <li><span class="check">✓</span> API 整合</li>
            <li><span class="check">✓</span> 客製化開發</li>
            <li><span class="check">✓</span> 專屬客戶經理</li>
            <li><span class="check">✓</span> SLA 服務保證</li>
          </ul>
          <button class="btn-pricing enterprise">聯繫業務</button>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="testimonials">
      <h2>用戶好評</h2>
      <div class="testimonials-grid">
        <div class="testimonial-card">
          <p class="testimonial-text">「終於不用再開一堆 Excel 了！所有投資一目瞭然，AI 新聞分析更是神器。」</p>
          <div class="testimonial-author">
            <span class="author-name">陳先生</span>
            <span class="author-title">資深投資人</span>
          </div>
        </div>
        <div class="testimonial-card">
          <p class="testimonial-text">「維持率監控救了我一命，差點被追繳保證金都不知道。」</p>
          <div class="testimonial-author">
            <span class="author-name">林小姐</span>
            <span class="author-title">海外債券投資者</span>
          </div>
        </div>
        <div class="testimonial-card">
          <p class="testimonial-text">「介面簡潔，功能強大，最重要的是資料在自己手上，很放心。」</p>
          <div class="testimonial-author">
            <span class="author-name">王先生</span>
            <span class="author-title">軟體工程師</span>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq">
      <h2>常見問題</h2>
      <div class="faq-list">
        <div class="faq-item" v-for="(item, index) in faqItems" :key="index">
          <div class="faq-question" @click="toggleFaq(index)">
            <span>{{ item.question }}</span>
            <span class="faq-toggle">{{ openFaq === index ? '−' : '+' }}</span>
          </div>
          <div class="faq-answer" v-show="openFaq === index">
            {{ item.answer }}
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
      <h2>開始管理您的投資組合</h2>
      <p>免費試用，無需信用卡</p>
      <router-link to="/demo" class="btn-cta">
        立即開始
      </router-link>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <h3>智能投資組合管理系統</h3>
          <p>讓投資管理更簡單</p>
        </div>
        <div class="footer-links">
          <h4>產品</h4>
          <a href="#features">功能介紹</a>
          <a href="#pricing">定價方案</a>
          <a href="#demo">免費試用</a>
        </div>
        <div class="footer-links">
          <h4>支援</h4>
          <a href="#">使用說明</a>
          <a href="#">常見問題</a>
          <a href="#">聯繫我們</a>
        </div>
        <div class="footer-links">
          <h4>關於</h4>
          <a href="#">關於我們</a>
          <a href="#">隱私政策</a>
          <a href="#">服務條款</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2025 智能投資組合管理系統. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const openFaq = ref(null)

const faqItems = [
  {
    question: '我的投資資料安全嗎？',
    answer: '您的資料存放在您自己的 GitHub 帳號中，我們不會存取或儲存您的任何財務資料。系統採用純前端架構，所有計算都在您的瀏覽器中進行。'
  },
  {
    question: '支援哪些投資商品？',
    answer: '目前支援海外債券、台股 ETF、美股、台股、加密貨幣等多種資產類型，並持續擴充中。'
  },
  {
    question: 'AI 新聞分析如何運作？',
    answer: '我們使用先進的自然語言處理技術，分析新聞標題的情緒傾向，自動標記為「看漲」或「看跌」，幫助您快速掌握市場動態。'
  },
  {
    question: '可以免費試用嗎？',
    answer: '是的！您可以免費使用基本功能，無需註冊或提供信用卡。進階功能如 AI 分析則需要訂閱專業版。'
  },
  {
    question: '如何開始使用？',
    answer: '只需點擊「免費試用」按鈕，即可查看示範帳戶。若要管理自己的投資組合，請參考使用說明設定您的 GitHub 資料來源。'
  }
]

function toggleFaq(index) {
  openFaq.value = openFaq.value === index ? null : index
}

function scrollToDemo() {
  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })
}

function scrollToPricing() {
  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
/* 基礎樣式 */
.landing-page {
  font-family: 'Microsoft JhengHei', 'PingFang TC', -apple-system, sans-serif;
  color: #333;
  line-height: 1.6;
}

section {
  padding: 80px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  text-align: center;
  font-size: 36px;
  margin-bottom: 50px;
  color: #1a1a2e;
}

/* Hero Section */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 90vh;
  padding-top: 40px;
  gap: 60px;
}

.hero-content {
  flex: 1;
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  color: #1a1a2e;
  margin-bottom: 20px;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 24px;
  color: #4472c4;
  margin-bottom: 15px;
  font-weight: 600;
}

.hero-description {
  font-size: 18px;
  color: #666;
  margin-bottom: 30px;
}

.hero-cta {
  display: flex;
  gap: 15px;
}

.btn-primary {
  background: linear-gradient(135deg, #4472c4 0%, #2e5a9e 100%);
  color: white;
  border: none;
  padding: 15px 40px;
  font-size: 18px;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(68, 114, 196, 0.4);
}

.btn-secondary {
  background: white;
  color: #4472c4;
  border: 2px solid #4472c4;
  padding: 15px 40px;
  font-size: 18px;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #4472c4;
  color: white;
}

.hero-visual {
  flex: 1;
}

.dashboard-preview {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.preview-header {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.red { background: #ff5f56; }
.dot.yellow { background: #ffbd2e; }
.dot.green { background: #27ca40; }

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.preview-stat {
  padding: 15px 20px;
  border-radius: 8px;
  font-size: 20px;
  font-weight: bold;
  color: white;
}

.preview-stat.asset { background: #4472c4; }
.preview-stat.equity { background: #228b22; }
.preview-stat.income { background: #ffa500; }

/* Pain Points Section */
.pain-points {
  background: #f8f9fa;
}

.pain-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.pain-card {
  background: white;
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.pain-card:hover {
  transform: translateY(-5px);
}

.pain-icon {
  font-size: 48px;
  margin-bottom: 15px;
  display: block;
}

.pain-card h3 {
  font-size: 20px;
  margin-bottom: 10px;
  color: #1a1a2e;
}

.pain-card p {
  color: #666;
  font-size: 15px;
}

/* Features Section */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
}

.feature-card {
  background: white;
  padding: 35px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #eee;
  transition: all 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.feature-card.highlight {
  border: 2px solid #4472c4;
  background: linear-gradient(135deg, #f8faff 0%, #fff 100%);
}

.feature-icon {
  font-size: 40px;
  margin-bottom: 15px;
}

.feature-card h3 {
  font-size: 22px;
  margin-bottom: 12px;
  color: #1a1a2e;
}

.feature-card p {
  color: #666;
  margin-bottom: 15px;
}

.feature-details {
  list-style: none;
  padding: 0;
}

.feature-details li {
  padding: 5px 0;
  color: #555;
  font-size: 14px;
}

.feature-details li::before {
  content: '✓';
  color: #4472c4;
  margin-right: 8px;
  font-weight: bold;
}

/* Demo Section */
.demo {
  text-align: center;
  background: linear-gradient(135deg, #4472c4 0%, #2e5a9e 100%);
  color: white;
  border-radius: 20px;
  margin: 40px auto;
}

.demo h2 {
  color: white;
}

.demo-description {
  font-size: 18px;
  margin-bottom: 30px;
  opacity: 0.9;
}

.btn-demo {
  display: inline-block;
  background: white;
  color: #4472c4;
  padding: 18px 50px;
  font-size: 20px;
  font-weight: bold;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-demo:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

/* Pricing Section */
.pricing {
  background: #f8f9fa;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  align-items: start;
}

.pricing-card {
  background: white;
  border-radius: 16px;
  padding: 40px 30px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  position: relative;
  transition: transform 0.2s;
}

.pricing-card:hover {
  transform: translateY(-5px);
}

.pricing-card.popular {
  border: 3px solid #4472c4;
  transform: scale(1.05);
}

.pricing-card.popular:hover {
  transform: scale(1.08);
}

.popular-badge {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: #4472c4;
  color: white;
  padding: 5px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
}

.pricing-header h3 {
  font-size: 24px;
  margin-bottom: 10px;
  color: #1a1a2e;
}

.price {
  margin-bottom: 25px;
}

.price .amount {
  font-size: 48px;
  font-weight: 800;
  color: #1a1a2e;
}

.price .period {
  font-size: 18px;
  color: #666;
}

.pricing-features {
  list-style: none;
  padding: 0;
  text-align: left;
  margin-bottom: 30px;
}

.pricing-features li {
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 10px;
}

.pricing-features li:last-child {
  border-bottom: none;
}

.pricing-features .check {
  color: #27ca40;
  font-weight: bold;
}

.pricing-features .x {
  color: #ccc;
}

.pricing-features li.disabled {
  color: #aaa;
}

.btn-pricing {
  width: 100%;
  padding: 15px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-pricing.free {
  background: white;
  color: #4472c4;
  border: 2px solid #4472c4;
}

.btn-pricing.free:hover {
  background: #4472c4;
  color: white;
}

.btn-pricing.pro {
  background: linear-gradient(135deg, #4472c4 0%, #2e5a9e 100%);
  color: white;
  border: none;
}

.btn-pricing.pro:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(68, 114, 196, 0.4);
}

.btn-pricing.enterprise {
  background: #1a1a2e;
  color: white;
  border: none;
}

.btn-pricing.enterprise:hover {
  background: #2a2a3e;
}

/* Testimonials Section */
.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.testimonial-card {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.testimonial-text {
  font-size: 17px;
  color: #444;
  font-style: italic;
  margin-bottom: 20px;
  line-height: 1.7;
}

.testimonial-author {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-weight: bold;
  color: #1a1a2e;
}

.author-title {
  font-size: 14px;
  color: #666;
}

/* FAQ Section */
.faq {
  background: #f8f9fa;
}

.faq-list {
  max-width: 800px;
  margin: 0 auto;
}

.faq-item {
  background: white;
  margin-bottom: 15px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.faq-question {
  padding: 20px 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-weight: 600;
  color: #1a1a2e;
  transition: background 0.2s;
}

.faq-question:hover {
  background: #f8f9fa;
}

.faq-toggle {
  font-size: 24px;
  color: #4472c4;
}

.faq-answer {
  padding: 0 25px 20px;
  color: #666;
  line-height: 1.7;
}

/* CTA Section */
.cta {
  text-align: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #2a2a4e 100%);
  color: white;
  border-radius: 20px;
  margin: 40px auto;
}

.cta h2 {
  color: white;
  margin-bottom: 15px;
}

.cta p {
  font-size: 18px;
  opacity: 0.8;
  margin-bottom: 30px;
}

.btn-cta {
  display: inline-block;
  background: linear-gradient(135deg, #4472c4 0%, #2e5a9e 100%);
  color: white;
  padding: 18px 60px;
  font-size: 20px;
  font-weight: bold;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-cta:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 30px rgba(68, 114, 196, 0.5);
}

/* Footer */
.landing-footer {
  background: #1a1a2e;
  color: white;
  padding: 60px 20px 30px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
}

.footer-brand h3 {
  font-size: 20px;
  margin-bottom: 10px;
}

.footer-brand p {
  color: #aaa;
}

.footer-links h4 {
  font-size: 16px;
  margin-bottom: 15px;
}

.footer-links a {
  display: block;
  color: #aaa;
  text-decoration: none;
  padding: 5px 0;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: white;
}

.footer-bottom {
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid #333;
}

.footer-bottom p {
  color: #666;
  font-size: 14px;
}

/* Responsive */
@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    text-align: center;
    padding-top: 60px;
  }

  .hero-title {
    font-size: 36px;
  }

  .hero-cta {
    flex-direction: column;
  }

  .hero-visual {
    width: 100%;
  }

  .footer-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .pricing-card.popular {
    transform: none;
  }

  .pricing-card.popular:hover {
    transform: translateY(-5px);
  }
}
</style>
