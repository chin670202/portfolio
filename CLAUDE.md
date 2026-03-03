# 專案開發指南

## 核心開發原則

### 模組化與隔離
**各功能必須高度模組化，嚴格避免改 A 壞 B。**

開發時必須遵守：
1. **獨立性**：每個模組/元件應該獨立運作，不依賴其他模組的內部實作
2. **明確介面**：模組之間只透過 props、events、composables 等明確介面溝通
3. **影響範圍檢查**：修改任何檔案前，先確認會影響哪些其他元件
4. **ref vs value**：傳遞響應式資料時，注意 `ref` 物件需要 `.value` 才能取得實際值
5. **測試驗證**：修改後必須確認相關功能仍正常運作

常見錯誤模式（必須避免）：
- ❌ 傳遞 `ref` 物件但子元件期望的是普通物件（忘記加 `.value`）
- ❌ 修改共用元件時只測試部分使用場景
- ❌ 重構表格欄位時破壞原有的資料綁定
- ❌ 修改 props 名稱但未同步更新所有使用處

## 架構概覽

本專案已全面遷移至 **Cloudflare**：
- **前端**：Vue 3 + Vite → Cloudflare Pages（靜態託管）
- **後端 API**：Hono on Cloudflare Pages Functions（無伺服器）
- **資料庫**：Cloudflare D1（雲端 SQLite）
- **AI 解析**：Anthropic Messages HTTP API（Haiku 4.5）

線上網址：`https://portfolio-c0n.pages.dev`

## 服務管理規則

### 啟動服務
**當用戶要求「啟動服務」時，前後端都要啟動。**
- 後端（本地開發）：`npm run dev:api`（wrangler pages dev，port 8788）
- 前端：`npx vite`（port 5173）

### 後端服務重啟
修改 `api/` 目錄下的檔案後，需要重新啟動 wrangler dev：

```bash
# 殺掉 port 8788 的進程
PID=$(powershell -Command "(Get-NetTCPConnection -LocalPort 8788 -State Listen -ErrorAction SilentlyContinue).OwningProcess" | head -1)
if [ -n "$PID" ] && [ "$PID" != "0" ]; then taskkill //F //PID $PID; fi

# 重新建置並啟動
npm run build && npm run dev:api
```

需要重啟的情況包括：
- 修改 `api/routes/*.js`
- 修改 `api/services/*.js`
- 修改 `api/index.js`
- 修改 `functions/**/*.js`

### 前端開發伺服器
前端使用 Vite，修改 `src/` 下的檔案會自動 HMR 熱更新，不需要手動重啟。

## 用戶體驗規則

### 錯誤訊息
**所有錯誤訊息必須針對一般投資用戶，而非開發者。**

❌ 不要使用技術性訊息：
- `Failed to fetch`
- `NetworkError`
- `500 Internal Server Error`

✅ 使用友善的中文提示：
- `服務連線失敗，請稍後再試`
- `網路連線異常，請檢查網路後再試`
- `系統處理時發生問題，請稍後再試`
- `操作失敗，請稍後再試`

## 商業規則

### 交易與庫存同步
- 交易記錄賣出時，必須同步減少庫存（D1 `portfolios` 表），全部賣出則移除該標的
- 新增買入時，同步新增或更新庫存（加權平均買入均價、持有數量）
- 庫存同步由 `api/services/portfolio-sync.js` 負責，在 trades POST/DELETE 時自動觸發
- 損益計算採 FIFO（先進先出）配對，支援先輸入賣出、後補輸入買進的情境（使用 `recalculateSymbol` 重算）

### 券商手續費
- 台股標準手續費：成交金額 × 0.1425% × 券商折扣率
- 證交稅：賣出時收取，股票 0.3%，ETF 0.1%
- ETF 判斷：代號以 `00` 開頭的 4 碼代號（如 0050、00878）

## 技術注意事項

- 後端 API：Hono on Cloudflare Pages Functions（本地 port 8788，線上同源 `/api`）
- 前端 Vite dev server port：5173 或 5174
- DB：Cloudflare D1（`portfolio-db`，ID: `1dda6830-8226-4dbd-8159-2f5eceb85bf8`）
- 本地 D1 與線上 D1 資料完全分離，互不影響
- shadcn-vue Select 在 Dialog 內有 portal 衝突問題，改用原生 `<select>`
- CSS cascade layers：`@layer theme, base, legacy, components, utilities;`（在 tailwind.css）
- style.css 包在 `@layer legacy` 中，避免覆蓋 Tailwind utilities

## 專案結構

- `api/` - Hono 後端 API（跑在 Cloudflare Pages Functions）
  - `index.js` - Hono app 定義（CORS、auth middleware、路由掛載）
  - `routes/trades.js` - 交易 CRUD + AI 解析 API
  - `routes/pnl.js` - 損益報表 API
  - `routes/stats.js` - 交易統計 API
  - `routes/brokers.js` - 券商 API
  - `routes/backup.js` - 備份 API 路由
  - `routes/portfolio.js` - 投資組合 CRUD（D1 portfolios 表）
  - `services/pnl-engine.js` - FIFO 損益計算引擎
  - `services/fee-calculator.js` - 手續費計算
  - `services/portfolio-sync.js` - 交易→庫存同步（D1）
  - `services/trade-parser.js` - AI 語意交易解析（依賴 anthropic.js）
  - `services/anthropic.js` - Anthropic Messages API fetch wrapper
  - `services/backup.js` - 備份服務（D1 backups 表）
- `functions/` - Cloudflare Pages Functions 入口
  - `api/[[route]].js` - catch-all → Hono app
  - `_middleware.js` - SPA routing fallback
- `migrations/` - D1 資料庫遷移
  - `0001_init.sql` - 表 schema（trades, pnl_records, open_lots, brokers, user_settings, portfolios, backups）
  - `0002_seed_brokers.sql` - 14 家台灣券商費率資料
  - `0003_seed_data.sql` - 從舊 SQLite + JSON 遷移的資料
- `src/` - Vue 3 前端
  - `views/Portfolio.vue` - 主儀表板頁面（投資現況）
  - `views/TradesPage.vue` - 交易紀錄頁面
  - `views/PnlPage.vue` - 損益報表頁面
  - `views/TradeDashboardPage.vue` - 交易儀表板
  - `components/trades/` - 交易相關元件
    - `TradeInput.vue` - AI 語意輸入框
    - `TradePreview.vue` - 交易確認 Dialog
    - `TradeTable.vue` - 交易歷史表格
  - `components/ui/` - shadcn-vue UI 元件
  - `composables/usePriceCache.js` - 每日價格快取（localStorage）
  - `modules/` - 模組化區塊系統
    - `moduleRegistry.js` - 模組註冊表與定義（含舊 UID 遷移）
    - `ModuleContainer.vue` - 模組容器（動態載入）
    - `SummaryCardsModule.vue` - 摘要卡片模組
    - `OverseasBondsModule.vue` - 直債模組
    - `StocksModule.vue` - 股票模組（台股 + 美股）
    - `CryptoModule.vue` - 加密貨幣模組
    - `LoansModule.vue` - 貸款別模組
    - `AssetHistoryModule.vue` - 資產變化記錄與趨勢圖模組
  - `services/tradeApi.js` - 交易/券商 API 客戶端
  - `services/newsService.js` - 新聞抓取與快取（localStorage 當日有效）
  - `config/index.js` - API baseUrl 設定（`/api`）

## 模組系統

儀表板採用模組化架構，每個區塊都是獨立模組。

### 內建模組

| UID | 名稱 | 說明 |
|-----|------|------|
| `summary-cards` | 摘要卡片 | 關鍵財務指標：總資產、淨值、年收益 |
| `bonds` | 直債 | 海外直接債券持倉、殖利率、配息資訊 |
| `stocks` | 股票 | 台股 + 美股持倉、損益、配息 |
| `crypto` | 加密貨幣 | 加密貨幣持倉、損益 |
| `loans` | 貸款別 | 貸款資訊、餘額、利率 |
| `asset-history` | 資產變化記錄與趨勢圖 | 歷史記錄表格與趨勢圖表 |

> **UID 遷移**：舊用戶 JSON 中的 `overseas-bonds`→`bonds`、`stocks-etf`→`stocks`、`other-assets`→已拆分。
> `moduleRegistry.js` 的 `mergeModuleConfig()` 會自動處理遷移。

### 模組配置結構

```javascript
{
  uid: 'bonds',           // 模組唯一識別碼
  enabled: true,          // 是否啟用
  order: 1,               // 顯示順序
  options: { ... }        // 模組專屬選項
}
```

### 擴充新模組

1. 在 `moduleRegistry.js` 的 `builtInModules` 中定義模組
2. 建立對應的 Vue 元件 `{Name}Module.vue`
3. 在 `ModuleContainer.vue` 的 `moduleComponents` 中註冊

## 備份機制

每次更新部位前會自動備份用戶的投資組合資料到 D1 `backups` 表。

備份限制：
- 每用戶最多保留 **10 份**備份
- 每天最多 **3 份**備份（避免同一天的備份覆蓋所有歷史）

API 端點：
- `GET /api/backup/:user` - 取得備份列表
- `POST /api/backup/:user/restore` - 還原指定備份

## Git 提交規則

### 必須一起提交的檔案
每次 commit 時，必須包含 `.claude/settings.local.json`：
```bash
git add .claude/settings.local.json
```

## 部署流程

```bash
# 建置 + 部署到 Cloudflare Pages
npm run deploy

# 或分步執行
npm run build
npx wrangler pages deploy dist
```

D1 資料庫遷移：
```bash
# 本地
npm run db:migrate:local

# 線上
npm run db:migrate:remote
```

## AI 語意交易輸入

### 功能流程

```
使用者輸入口語描述（如「今天買了兩張台積電 680元」）
  → 前端 TradeInput.vue
  → tradeApi.parseTrade() → POST /api/trades/:user/parse
  → Hono route → trade-parser.js
  → anthropic.js → Anthropic Messages API（Haiku 4.5）
  → Claude AI 回傳結構化 JSON
  → 前端 TradePreview.vue 顯示確認卡片
  → 使用者確認 → POST /api/trades/:user 寫入 D1 + 同步庫存
```

### 關鍵檔案

| 檔案 | 角色 |
|------|------|
| `src/components/trades/TradeInput.vue` | 前端輸入框，送出到後端解析 |
| `src/services/tradeApi.js` | 前端 API 客戶端，連接 `/api` |
| `api/routes/trades.js` | 後端路由，`POST /:user/parse` 呼叫 trade-parser |
| `api/services/trade-parser.js` | 組裝 prompt、呼叫 Anthropic API、解析回傳 JSON |
| `api/services/anthropic.js` | Anthropic Messages API fetch wrapper |

### 環境變數（Cloudflare Secrets）

| 變數 | 說明 |
|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API 金鑰 |
| `ANTHROPIC_MODEL` | 模型 ID（`claude-haiku-4-5-20251001`） |
| `API_KEY` | API 認證金鑰（選填） |

本地開發放在 `.dev.vars`（已加入 .gitignore）。

### 換電腦 Checklist

```bash
# 1. Clone repo
git clone <repo-url> && cd portfolio

# 2. 安裝依賴
npm install

# 3. 設定環境變數
# 建立 .dev.vars 檔案，填入 ANTHROPIC_API_KEY 和 ANTHROPIC_MODEL

# 4. 套用本地 D1 migrations
npm run db:migrate:local

# 5. 啟動本地 API
npm run dev:api

# 6. 啟動前端
npx vite

# 7. 開啟 http://localhost:5173/chin
```
