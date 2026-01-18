# 智能投資組合管理系統

一站式追蹤海外債券、ETF、股票與加密貨幣的專業投資儀表板。

![Version](https://img.shields.io/badge/version-1.9.0-blue)
![Vue](https://img.shields.io/badge/Vue-3.5-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

## 功能特色

### 多元資產追蹤

| 資產類型 | 支援項目 | 價格來源 |
|---------|---------|---------|
| 海外債券 | 金交債、公司債、國債 | 法蘭克福交易所 |
| 台灣 ETF | 債券 ETF、股票 ETF | Yahoo Finance |
| 美股 | 個股、ETF | Alpha Vantage |
| 台股 | 上市櫃股票 | Yahoo Finance |
| 加密貨幣 | BTC、ETH 等 | CoinGecko |

### 核心功能

#### 1. 即時價格更新
- 一鍵更新所有持股價格
- 多來源即時報價
- 自動美元匯率換算
- 15 分鐘智能快取

#### 2. 損益自動計算
- 損益百分比
- 台幣損益金額
- 資產佔比分析
- 投資組合總覽

#### 3. 配息追蹤系統
- 支援月配/季配/半年配/年配
- 年殖利率自動計算
- 下次配息日提醒
- 每年利息預估

#### 4. 質押維持率監控
- 金交債維持率（追繳 119%、預警 127%）
- 股票質借維持率（追繳 140%）
- 顏色警示提醒
- 風險預警通知

#### 5. AI 新聞情緒分析
- Google News 即時新聞抓取
- 雙引擎情緒分析：
  - **關鍵字引擎**：輕量快速，40+ 看漲/看跌關鍵字
  - **AI 引擎**：Transformers.js 深度語義分析
- 新聞篩選（全部/看漲/看跌）
- 負面新聞警示

#### 6. 語意化快速更新
- 自然語言輸入交易指令
- 支援圖片 OCR 識別
- Claude AI 智能分析
- SSE 即時進度回饋

#### 7. 模組化儀表板
- 5 大功能模組：
  - 海外債券
  - 股票/ETF
  - 無配息資產
  - 貸款管理
  - 資產變化趨勢
- 自由調整模組順序
- 啟用/停用模組
- 配置即時儲存

#### 8. 欄位自定義
- 每個模組獨立欄位配置
- 顯示/隱藏欄位
- 拖曳調整欄位順序
- 一鍵恢復預設

#### 9. 自動備份機制
- 更新前自動備份
- 每用戶最多 10 份備份
- 每天最多 3 份（防止覆蓋）
- 一鍵還原功能

#### 10. 資產趨勢分析
- 歷史資產記錄表
- 折線圖趨勢展示
- 匯率影響分析
- 長期績效追蹤

## 儀表板總覽

頂部摘要顯示：

| 指標 | 說明 |
|-----|------|
| 美元匯率 | 即時 USD/TWD |
| 台幣資產 | 所有資產總值 |
| 台幣負債 | 所有貸款總額 |
| 台幣淨值 | 資產 - 負債 |
| 每年收息 | 配息收入總計 |
| 每年付息 | 貸款利息支出 |
| 全年淨收 | 收息 - 付息 |

## 技術架構

### 前端
- **框架**: Vue 3 + Composition API
- **構建**: Vite 5
- **圖表**: Chart.js + vue-chartjs
- **AI**: @xenova/transformers (瀏覽器端 AI)
- **路由**: Vue Router 4

### 後端
- **框架**: Node.js + Express
- **AI 分析**: Claude CLI
- **版本控制**: simple-git
- **即時通訊**: Server-Sent Events (SSE)

### 部署
- **前端**: GitHub Pages
- **後端**: 本地 Node.js 服務

## 快速開始

### 安裝依賴

```bash
# 前端
npm install

# 後端
cd server && npm install
```

### 環境設定

建立 `server/.env`：

```env
PORT=3001
API_KEY=your_api_key
PROJECT_ROOT=d:\我的投資現況
ALLOWED_ORIGINS=http://localhost:5173
```

### 啟動服務

```bash
# 前端開發
npm run dev

# 後端服務
cd server && npm start
```

### 部署

```bash
npm run deploy
```

## 資料結構

投資資料儲存於 `public/data/{username}.json`：

```json
{
  "顯示名稱": "用戶名稱",
  "匯率": { "美元匯率": 31.6 },
  "股票": [
    {
      "公司名稱": "渣打集團",
      "代號": "USG84228FV59",
      "買入價格": 100,
      "持有單位": 2000,
      "票面利率": 6.296,
      "配息日": "01/06, 07/06",
      "質押單位": 2000,
      "到期日": "2034/07/06"
    }
  ],
  "ETF": [...],
  "其它資產": [...],
  "貸款": [...],
  "資產變化記錄": [...],
  "模組配置": [...]
}
```

## API 端點

| 方法 | 端點 | 說明 |
|-----|------|------|
| POST | `/update/stream` | 語意化更新（SSE） |
| GET | `/backup/:user` | 取得備份列表 |
| POST | `/backup/:user/restore` | 還原備份 |
| GET | `/config/:user/modules` | 取得模組配置 |
| PUT | `/config/:user/modules` | 儲存模組配置 |

## 模組配置

每個模組可獨立配置：

```javascript
{
  "uid": "overseas-bonds",
  "enabled": true,
  "order": 1,
  "columns": [
    { "key": "companyName", "visible": true, "order": 1 },
    { "key": "symbol", "visible": true, "order": 2 }
    // ...
  ]
}
```

### 可用模組

| UID | 名稱 | 說明 |
|-----|------|------|
| `overseas-bonds` | 海外債券 | 金交債持倉與維持率 |
| `stocks-etf` | 股票/ETF | ETF 持倉與配息追蹤 |
| `other-assets` | 無配息資產 | 美股、台股、加密貨幣 |
| `loans` | 貸款管理 | 貸款餘額與利息 |
| `asset-history` | 資產趨勢 | 歷史記錄與圖表 |

## 欄位定義

各模組支援的欄位定義於 `src/modules/columnDefinitions.js`：

### 海外債券欄位 (17 個)
公司名稱、代號、買入價格、持有單位、最新價格、損益(%)、台幣資產、佔比、票面利率、年殖利率、每年利息、配息日、剩餘天配息、下次配息、到期日、剩餘年數、新聞

### ETF 欄位 (16 個)
名稱、代號、買入均價、持有單位、最新價格、損益(%)、台幣資產、佔比、每股配息、年殖利率、每年利息、下次配息日、剩餘天配息、下次配息、最新殖利率、新聞

## 版本歷史

| 版本 | 功能 |
|-----|------|
| v1.9.0 | 模組化系統、欄位自定義編輯器 |
| v1.8.0 | 備份機制、UI 優化 |
| v1.7.0 | AI 新聞情緒分析 |
| v1.6.0 | 語意化快速更新 |
| v1.5.0 | 質押維持率監控 |

## 開發指南

### 目錄結構

```
├── src/
│   ├── components/     # 基礎元件
│   ├── modules/        # 模組系統
│   │   ├── moduleRegistry.js
│   │   ├── columnDefinitions.js
│   │   ├── ModuleContainer.vue
│   │   ├── ModuleEditor.vue
│   │   └── ColumnEditor.vue
│   ├── services/       # 服務層
│   │   ├── api.js
│   │   ├── calculator.js
│   │   ├── newsService.js
│   │   └── sentiment/
│   ├── composables/    # 組合式函數
│   ├── views/          # 頁面
│   └── marketing/      # 行銷頁面
├── server/             # 後端服務
│   ├── routes/
│   ├── services/
│   └── prompts/
└── public/data/        # 用戶資料
```

### 新增模組

1. 在 `moduleRegistry.js` 定義模組
2. 建立 `{Name}Module.vue` 元件
3. 在 `columnDefinitions.js` 定義欄位
4. 在 `ModuleContainer.vue` 註冊

## 授權

MIT License

## 聯繫

如有問題或建議，歡迎提交 Issue。
