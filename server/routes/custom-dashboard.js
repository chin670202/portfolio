/**
 * 自訂儀表板 API 路由
 * 透過 Claude CLI 產生包含用戶資料的獨立 HTML 儀表板
 */

const express = require('express');
const router = express.Router();
const claudeService = require('../services/claude');
const githubService = require('../services/github');
const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../..');
const CUSTOM_DASHBOARDS_DIR = path.join(PROJECT_ROOT, 'public', 'custom-dashboards');

/**
 * GET /custom-dashboard/:user/check
 * 檢查用戶的自訂儀表板 HTML 是否存在
 */
router.get('/:user/check', async (req, res) => {
  try {
    const { user } = req.params;
    const htmlPath = path.join(CUSTOM_DASHBOARDS_DIR, `${user}.html`);

    try {
      await fs.access(htmlPath);
      res.json({ exists: true, path: htmlPath });
    } catch {
      res.json({ exists: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /custom-dashboard/:user/html
 * 返回用戶的自訂儀表板 HTML 內容
 */
router.get('/:user/html', async (req, res) => {
  try {
    const { user } = req.params;
    const htmlPath = path.join(CUSTOM_DASHBOARDS_DIR, `${user}.html`);

    try {
      const html = await fs.readFile(htmlPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>尚未建立</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #1e1e2e;
              color: #ccc;
            }
            .message {
              text-align: center;
              padding: 40px;
            }
            .icon { font-size: 48px; margin-bottom: 20px; }
            h2 { margin: 0 0 10px; color: #fff; }
            p { margin: 0; opacity: 0.7; }
          </style>
        </head>
        <body>
          <div class="message">
            <div class="icon">📊</div>
            <h2>尚未建立自訂儀表板</h2>
            <p>請使用智慧助手的「自訂儀表板」功能來建立</p>
          </div>
        </body>
        </html>
      `);
    }
  } catch (error) {
    res.status(500).send('伺服器錯誤');
  }
});

/**
 * POST /custom-dashboard/:user/generate (SSE)
 * 透過 Claude CLI 產生自訂儀表板 HTML
 */
router.post('/:user/generate', async (req, res) => {
  const startTime = Date.now();
  const { user } = req.params;

  // 設定 SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');

  const sendProgress = (step, message) => {
    res.write(`data: ${JSON.stringify({ type: 'progress', step, message })}\n\n`);
  };

  const sendComplete = (result) => {
    res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
    res.end();
  };

  const sendError = (message) => {
    res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
    res.end();
  };

  try {
    const { instruction } = req.body;

    if (!instruction) {
      return sendError('請提供儀表板描述');
    }

    sendProgress('讀取資料', '正在讀取您的投資資料...');

    // 讀取用戶的投資資料
    const jsonPath = path.join(PROJECT_ROOT, 'public', 'data', `${user}.json`);
    let userData;
    try {
      userData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
    } catch {
      return sendError(`找不到用戶 ${user} 的資料檔案`);
    }

    sendProgress('產生儀表板', 'AI 正在根據您的需求產生儀表板...');

    // 讀取 prompt 模板
    const promptTemplate = await fs.readFile(
      path.join(__dirname, '../prompts/custom-dashboard.md'),
      'utf-8'
    );

    // 確保輸出目錄存在
    await fs.mkdir(CUSTOM_DASHBOARDS_DIR, { recursive: true });

    const htmlPath = path.join(CUSTOM_DASHBOARDS_DIR, `${user}.html`);

    // 組合 prompt
    const prompt = promptTemplate
      .replace('{{USER}}', user)
      .replace('{{INSTRUCTION}}', instruction)
      .replace('{{USER_DATA}}', JSON.stringify(userData, null, 2))
      .replace(/\{\{HTML_PATH\}\}/g, htmlPath);

    // 呼叫 Claude CLI 產生 HTML
    const result = await claudeService.runClaudeRaw(prompt, CUSTOM_DASHBOARDS_DIR);

    // 檢查 HTML 是否已產生
    try {
      await fs.access(htmlPath);
    } catch {
      return sendError('AI 未能成功產生儀表板檔案，請重試');
    }

    // 推送到 GitHub
    sendProgress('推送變更', '正在推送到 GitHub...');
    const gitResult = await githubService.commitAndPush(
      user,
      [{ type: 'add', category: '自訂儀表板', item: `建立 ${user}.html` }],
      PROJECT_ROOT
    );

    const duration = Date.now() - startTime;
    console.log(`\n自訂儀表板產生完成！耗時 ${duration}ms`);

    sendComplete({
      success: true,
      type: 'custom-dashboard-created',
      message: `已成功建立您的自訂儀表板`,
      htmlPath: `/custom-dashboards/${user}.html`,
      duration: `${duration}ms`
    });

  } catch (error) {
    console.error('自訂儀表板產生失敗:', error);
    sendError(error.message || '產生儀表板時發生錯誤');
  }
});

module.exports = router;
