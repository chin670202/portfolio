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

正確的重啟方式是只殺掉 port 3001 的進程：

```powershell
# 在 Windows PowerShell 中，先找出並殺掉 port 3001 的進程
$proc = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($proc) { Stop-Process -Id $proc -Force }

# 然後啟動後端服務
cd "d:\我的投資現況\server" && npm start
```

或是直接用一行指令（在背景執行）：
```powershell
$p = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess; if ($p) { Stop-Process -Id $p -Force }; cd "d:\我的投資現況\server"; npm start
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

前端使用 `friendlyErrorMessage()` 函數（位於 `QuickUpdate.vue`）統一轉換錯誤訊息。

## 專案結構

- `server/` - Node.js + Express 後端服務
  - `routes/update.js` - 更新 API 路由（包含 SSE 串流）
  - `routes/backup.js` - 備份 API 路由
  - `services/claude.js` - Claude CLI 整合
  - `services/github.js` - Git 操作
  - `services/backup.js` - 備份服務（建立、列表、還原）
  - `prompts/analyze.md` - Claude 分析用的 system prompt
- `src/` - Vue 3 前端
  - `views/Portfolio.vue` - 主儀表板頁面
  - `components/` - 基礎 UI 元件
  - `modules/` - 模組化區塊系統
    - `moduleRegistry.js` - 模組註冊表與定義
    - `ModuleContainer.vue` - 模組容器（動態載入）
    - `OverseasBondsModule.vue` - 海外債券模組
    - `StocksEtfModule.vue` - 股票/ETF 模組
    - `OtherAssetsModule.vue` - 無配息資產模組
    - `LoansModule.vue` - 貸款別模組
    - `AssetHistoryModule.vue` - 資產變化記錄與趨勢圖模組
- `public/data/` - 用戶投資資料 JSON 檔案
  - `backups/{user}/` - 用戶備份資料夾

## 模組系統

儀表板採用模組化架構，每個區塊都是獨立模組。

### 內建模組

| UID | 名稱 | 說明 |
|-----|------|------|
| `overseas-bonds` | 海外債券 | 顯示海外債券持倉、殖利率、配息資訊 |
| `stocks-etf` | 股票/ETF | 顯示股票與 ETF 持倉、損益、配息 |
| `other-assets` | 無配息資產 | 顯示美股、台股、加密貨幣 |
| `loans` | 貸款別 | 顯示貸款資訊、餘額、利率 |
| `asset-history` | 資產變化記錄與趨勢圖 | 歷史記錄表格與趨勢圖表 |

### 模組配置結構

```javascript
{
  uid: 'overseas-bonds',  // 模組唯一識別碼
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

### 用戶資料同步（智慧助手更新）

當用戶透過智慧助手更新部位時，系統會：
1. 更新 `public/data/{user}.json`（main 分支）
2. 使用 git worktree 同步到 gh-pages 分支的 `users/{user}/data.json`
3. 只影響該用戶的資料，不會動到其他用戶
