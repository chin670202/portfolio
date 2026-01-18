# 專案開發指南

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
  - `components/QuickUpdate.vue` - 快速更新部位元件
- `public/data/` - 用戶投資資料 JSON 檔案
  - `backups/{user}/` - 用戶備份資料夾

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

## 部署流程

1. 建置前端：`npm run build`
2. 提交變更：`git add . && git commit -m "message"`
3. 推送到 GitHub：`git push`
