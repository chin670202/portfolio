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

## 服務管理規則

### 後端服務重啟
**每次修改 `server/` 目錄下的任何檔案後，必須自動重啟後端服務。**

**重要：不要使用 `Stop-Process -Name node` 這會殺掉所有 Node 進程（包括前端 Vite 開發伺服器）！**
**重要：後端必須使用 Node v20（nvm-windows 路徑：`/c/Users/chin/AppData/Roaming/nvm/v20.19.1/node.exe`），v14 不支援 `static {}` 語法。**

正確的重啟方式是只殺掉 port 3002 的進程：

```bash
# 在 bash 中找出 port 3002 的 PID 並殺掉
PID=$(powershell -Command "(Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue).OwningProcess" | head -1)
if [ -n "$PID" ] && [ "$PID" != "0" ]; then taskkill //F //PID $PID; fi

# 用 Node v20 啟動後端服務（背景執行）
cd /d/my-projects/portfolio && nohup /c/Users/chin/AppData/Roaming/nvm/v20.19.1/node.exe server/index.js > /tmp/portfolio-server.log 2>&1 &
```

需要重啟的情況包括：
- 修改 `server/routes/*.js`
- 修改 `server/services/*.js`
- 修改 `server/prompts/*.md`
- 修改 `server/index.js`
- 修改 `server/.env`

### 前端開發伺服器
前端使用 Vite，修改 `src/` 下的檔案會自動 HMR 熱更新，不需要手動重啟。

## 用戶體驗規則

### 錯誤訊息
**所有錯誤訊息必須針對一般投資用戶，而非開發者。**

❌ 不要使用技術性訊息：
- `Failed to fetch`
- `NetworkError`
- `ECONNREFUSED`
- `500 Internal Server Error`

✅ 使用友善的中文提示：
- `服務連線失敗，請稍後再試`
- `網路連線異常，請檢查網路後再試`
- `系統處理時發生問題，請稍後再試`
- `操作失敗，請稍後再試`

前端在各元件中針對錯誤訊息做友善轉換（例如 `TradeInput.vue` 將 CLI 錯誤轉為簡短提示）。

## 商業規則

### 交易與庫存同步
- 交易記錄賣出時，必須同步減少庫存（`public/data/{user}.json`），全部賣出則移除該標的
- 新增買入時，同步新增或更新庫存（加權平均買入均價、持有數量）
- 庫存同步由 `server/services/portfolio-sync.js` 負責，在 trades POST/DELETE 時自動觸發
- 損益計算採 FIFO（先進先出）配對，支援先輸入賣出、後補輸入買進的情境（使用 `recalculateSymbol` 重算）

### 券商手續費
- 台股標準手續費：成交金額 × 0.1425% × 券商折扣率
- 證交稅：賣出時收取，股票 0.3%，ETF 0.1%
- ETF 判斷：代號以 `00` 開頭的 4 碼代號（如 0050、00878）

## 技術注意事項

- 後端 port：3002，前端 Vite dev server port：5173 或 5174
- DB：SQLite at `server/data/trades.db`（better-sqlite3）
- shadcn-vue Select 在 Dialog 內有 portal 衝突問題，改用原生 `<select>`
- CSS cascade layers：`@layer theme, base, legacy, components, utilities;`（在 tailwind.css）
- style.css 包在 `@layer legacy` 中，避免覆蓋 Tailwind utilities

## 專案結構

- `server/` - Node.js + Express 後端服務（port 3002）
  - `db/index.js` - SQLite 資料庫初始化（trades, open_lots, pnl_records, brokers, user_settings）
  - `db/seed-brokers.js` - 14 家台灣券商費率資料
  - `routes/trades.js` - 交易 CRUD + AI 解析 API
  - `routes/pnl.js` - 損益報表 API
  - `routes/brokers.js` - 券商 API
  - `routes/backup.js` - 備份 API 路由
  - `services/pnl-engine.js` - FIFO 損益計算引擎
  - `services/fee-calculator.js` - 手續費計算
  - `services/portfolio-sync.js` - 交易→庫存同步（delta-based）
  - `services/trade-parser.js` - AI 語意交易解析（依賴 claude.js）
  - `services/claude.js` - Claude CLI 整合（spawns `claude` command）
  - `services/github.js` - Git 操作
  - `services/backup.js` - 備份服務（建立、列表、還原）
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
- `public/data/` - 用戶投資資料 JSON 檔案
  - `backups/{user}/` - 用戶備份資料夾

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

每次更新部位前會自動備份用戶的 JSON 檔案。

備份限制：
- 每用戶最多保留 **10 份**備份
- 每天最多 **3 份**備份（避免同一天的備份覆蓋所有歷史）

備份檔名格式：`{user}_{日期}_{時間}.json`
例如：`test_2026-01-18_143052.json`

API 端點：
- `GET /backup/:user` - 取得備份列表
- `POST /backup/:user/restore` - 還原指定備份

## Git 提交規則

### 必須一起提交的檔案
每次 commit 時，必須包含 `.claude/settings.local.json`：
```bash
git add .claude/settings.local.json
```

這個檔案記錄了 Claude Code 的本地設定，需要同步到版本控制中。

## 部署流程

1. 建置前端：`npm run build`
2. 提交變更：`git add . && git commit -m "message"`
3. 推送到 GitHub：`git push`

## AI 語意交易輸入（換電腦設定指南）

### 功能流程

```
使用者輸入口語描述（如「今天買了兩張台積電 680元」）
  → 前端 TradeInput.vue
  → tradeApi.parseTrade() → POST /trades/:user/parse
  → 後端 trades.js route → trade-parser.js
  → claude.js → spawn `claude` CLI（--print 模式）
  → Claude AI 回傳結構化 JSON
  → 前端 TradePreview.vue 顯示確認卡片
  → 使用者確認 → POST /trades/:user 寫入 DB + 同步庫存
```

### 關鍵檔案

| 檔案 | 角色 |
|------|------|
| `src/components/trades/TradeInput.vue` | 前端輸入框，送出到後端解析 |
| `src/services/tradeApi.js` | 前端 API 客戶端，連接 `http://localhost:3002` |
| `server/routes/trades.js` | 後端路由，`POST /:user/parse` 呼叫 trade-parser |
| `server/services/trade-parser.js` | 組裝 prompt、呼叫 Claude CLI、解析回傳 JSON |
| `server/services/claude.js` | 底層 Claude CLI wrapper，spawn 子進程執行 `claude --print` |

### 環境需求

1. **Node.js >= 18**（推薦 v20+）
   - `better-sqlite3` 和 `simple-git` 需要 Node 18+
   - Claude CLI 本身也需要 Node 18+
   - 使用 nvm-windows 時，**啟動後端的 Node 版本很重要**：`claude.js` 使用 `process.execPath` 取得當前 Node 路徑，子進程會繼承這個版本

2. **Claude Code CLI**
   - 安裝：`npm install -g @anthropic-ai/claude-code`
   - 首次使用需登入：在終端機執行 `claude` 完成 OAuth 認證
   - 認證資料存在 `~/.claude/` 目錄

3. **後端服務必須運行**
   - 啟動：`node server/index.js`（port 3002）
   - 前端 `src/config/index.js` 預設連接 `http://localhost:3002`

### 換電腦 Checklist

```bash
# 1. Clone repo
git clone <repo-url> && cd portfolio

# 2. 確認 Node 版本 >= 18
node -v  # 應該顯示 v18+ 或 v20+

# 3. 安裝前端依賴
npm install

# 4. 安裝後端依賴（better-sqlite3 需要編譯）
cd server && npm install && cd ..

# 5. 安裝 Claude Code CLI
npm install -g @anthropic-ai/claude-code

# 6. 登入 Claude（首次）
claude  # 完成 OAuth 認證後 Ctrl+C 退出

# 7. 啟動後端
node server/index.js
# 應該看到「投資部位更新服務已啟動 http://localhost:3002」

# 8. 啟動前端
npx vite
# 應該看到 Vite dev server 啟動

# 9. 驗證 AI 解析
curl -X POST http://localhost:3002/trades/chin/parse \
  -H "Content-Type: application/json" \
  -d '{"input":"今天買了一張台積電 680元"}'
# 應該回傳 JSON: {"tradeDate":"...","symbol":"2330","side":"buy",...}
```

### 常見問題

| 症狀 | 原因 | 解法 |
|------|------|------|
| `Claude CLI 執行失敗` + 一堆 minified JS | Node 版本太舊（v14） | 用 Node v20 啟動後端 |
| `claude: command not found` | Claude CLI 未安裝 | `npm install -g @anthropic-ai/claude-code` |
| `AI 解析服務暫時無法使用` | Claude CLI 未登入或 API 錯誤 | 終端機執行 `claude` 完成登入 |
| `ECONNREFUSED localhost:3002` | 後端服務未啟動 | `node server/index.js` |
| `better-sqlite3` 編譯錯誤 | Node 版本不匹配或缺少 build tools | `cd server && npm rebuild better-sqlite3` |
