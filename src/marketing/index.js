/**
 * 行銷模組入口
 *
 * 此模組獨立於主要功能，包含：
 * - Landing Page（產品介紹頁）
 * - 定價方案
 * - 用戶見證
 * - FAQ
 *
 * 未來可擴充：
 * - 部落格文章
 * - 使用教學
 * - 聯繫表單
 */

export { default as LandingPage } from './LandingPage.vue'

// 行銷相關常數
export const PRICING_PLANS = {
  FREE: {
    name: '免費版',
    price: 0,
    period: '月',
    features: [
      '基本資產追蹤',
      '手動價格更新',
      '關鍵字新聞分析',
      '基本報表功能'
    ]
  },
  PRO: {
    name: '專業版',
    price: 299,
    period: '月',
    features: [
      '所有免費版功能',
      'AI 新聞情緒分析',
      '即時價格自動更新',
      '進階報表與圖表',
      'Email 風險警示',
      '優先客服支援'
    ]
  },
  ENTERPRISE: {
    name: '企業版',
    price: null, // 聯繫報價
    period: null,
    features: [
      '所有專業版功能',
      '多帳戶管理',
      'API 整合',
      '客製化開發',
      '專屬客戶經理',
      'SLA 服務保證'
    ]
  }
}

// 產品特色
export const FEATURES = [
  {
    icon: '🤖',
    title: 'AI 新聞情緒分析',
    description: '自動分析新聞標題，智能判斷看漲或看跌',
    highlight: true
  },
  {
    icon: '💰',
    title: '多資產整合追蹤',
    description: '海外債券、ETF、美股、台股、加密貨幣一站管理'
  },
  {
    icon: '📈',
    title: '自動報酬率計算',
    description: '自動計算報酬率、年化收益、配息殖利率'
  },
  {
    icon: '🏦',
    title: '貸款與維持率監控',
    description: '追蹤質押貸款、計算維持率，避免斷頭風險'
  },
  {
    icon: '📊',
    title: '資產變化趨勢',
    description: '視覺化呈現資產、負債、淨值的歷史變化'
  },
  {
    icon: '🔒',
    title: '資料安全私密',
    description: '資料存放在您自己的 GitHub，完全掌控隱私'
  }
]
