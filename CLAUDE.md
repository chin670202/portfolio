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

## 專案結構

- `server/` - Node.js + Express 後端服務
  - `routes/update.js` - 更新 API 路由（包含 SSE 串流）
  - `services/claude.js` - Claude CLI 整合
  - `services/github.js` - Git 操作
  - `prompts/analyze.md` - Claude 分析用的 system prompt
- `src/` - Vue 3 前端
  - `components/QuickUpdate.vue` - 快速更新部位元件
- `public/data/` - 用戶投資資料 JSON 檔案

## 部署流程

1. 建置前端：`npm run build`
2. 提交變更：`git add . && git commit -m "message"`
3. 推送到 GitHub：`git push`
