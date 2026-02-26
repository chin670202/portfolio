/**
 * 投資部位更新服務 - 本機伺服器
 * 接收網頁端的文字/圖片，透過 Claude CLI 分析後更新 JSON 並推送 GitHub
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const updateRouter = require('./routes/update');
const backupRouter = require('./routes/backup');
const tradesRouter = require('./routes/trades');
const pnlRouter = require('./routes/pnl');
const statsRouter = require('./routes/stats');
const brokersRouter = require('./routes/brokers');

const app = express();
const PORT = process.env.PORT || 3002;

// CORS 設定
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // 允許無 origin 的請求（如 curl、Postman）
    if (!origin) return callback(null, true);

    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('不允許的來源'));
    }
  },
  credentials: true
}));

// 解析 JSON body（增加限制以支援圖片 base64）
app.use(express.json({ limit: '10mb' }));

// API 金鑰驗證中介軟體
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.API_KEY;

  // 如果沒設定 API_KEY，跳過驗證（開發模式）
  if (!expectedKey) {
    return next();
  }

  if (apiKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'API 金鑰無效'
    });
  }

  next();
};

// 路由
app.use('/update', apiKeyAuth, updateRouter);
app.use('/backup', apiKeyAuth, backupRouter);
app.use('/trades', apiKeyAuth, tradesRouter);
app.use('/pnl', apiKeyAuth, pnlRouter);
app.use('/stats', apiKeyAuth, statsRouter);
app.use('/brokers', apiKeyAuth, brokersRouter);

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 首頁
app.get('/', (req, res) => {
  res.json({
    service: '投資部位更新服務',
    version: '1.0.0',
    endpoints: {
      'POST /update': '更新投資部位',
      'GET /health': '健康檢查'
    }
  });
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('錯誤:', err);
  res.status(500).json({
    success: false,
    error: err.message || '伺服器錯誤'
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     投資部位更新服務已啟動                    ║
║     http://localhost:${PORT}                   ║
╚════════════════════════════════════════════╝

使用 ngrok 暴露到網際網路:
  ngrok http ${PORT}

API 端點:
  POST /update - 更新投資部位
  GET  /backup/:user - 取得備份列表
  POST /backup/:user/restore - 還原備份
  GET  /trades/:user - 交易列表
  POST /trades/:user - 新增交易
  DELETE /trades/:user/:id - 刪除交易
  POST /trades/:user/parse - AI 解析交易
  GET  /pnl/:user - 損益報表
  GET  /stats/:user - 交易統計
  GET  /brokers - 券商列表
  POST /brokers/calculate-fee - 計算手續費
  GET  /health - 健康檢查
  `);
});
