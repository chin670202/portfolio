/**
 * 更新 API 路由
 * POST /update - 接收文字或圖片，分析後更新 JSON
 */

const express = require('express');
const router = express.Router();
const claudeService = require('../services/claude');
const githubService = require('../services/github');
const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../..');

/**
 * POST /update
 * Body: {
 *   user: "chin" | "minge",
 *   type: "text" | "image",
 *   content: string (文字或 base64 圖片)
 * }
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const { user, type, content } = req.body;

    // 驗證參數
    if (!user || !type || !content) {
      return res.status(400).json({
        success: false,
        error: '缺少必要參數: user, type, content'
      });
    }

    // 動態檢查用戶 JSON 檔案是否存在
    const jsonPath = path.join(PROJECT_ROOT, 'public', 'data', `${user}.json`);
    try {
      await fs.access(jsonPath);
    } catch {
      return res.status(400).json({
        success: false,
        error: `無效的用戶名稱：${user}（找不到對應的資料檔案）`
      });
    }

    if (!['text', 'image'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: '無效的類型，只支援 text 或 image'
      });
    }

    console.log(`\n[${new Date().toISOString()}] 收到更新請求`);
    console.log(`用戶: ${user}, 類型: ${type}`);
    console.log(`內容長度: ${content.length} 字元`);

    // 讀取現有 JSON
    const currentData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));

    // 呼叫 Claude CLI 分析
    console.log('\n呼叫 Claude CLI 分析中...');
    const analysis = await claudeService.analyzeAndUpdate(user, type, content, currentData, jsonPath);

    if (!analysis.success) {
      return res.status(400).json({
        success: false,
        error: analysis.error || '分析失敗'
      });
    }

    // 推送到 GitHub
    console.log('\n推送到 GitHub...');
    const gitResult = await githubService.commitAndPush(
      user,
      analysis.changes,
      PROJECT_ROOT
    );

    const duration = Date.now() - startTime;
    console.log(`\n完成！耗時 ${duration}ms`);

    res.json({
      success: true,
      message: `已更新 ${user}.json`,
      changes: analysis.changes,
      summary: analysis.summary,
      commitUrl: gitResult.commitUrl,
      duration: `${duration}ms`
    });

  } catch (error) {
    console.error('更新失敗:', error);
    res.status(500).json({
      success: false,
      error: error.message || '更新失敗'
    });
  }
});

/**
 * POST /update-stream
 * SSE 版本 - 即時回報處理進度
 */
router.post('/stream', async (req, res) => {
  const startTime = Date.now();

  // 設定 SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');

  // 發送 SSE 訊息的 helper
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
    const { user, type, content } = req.body;

    // 驗證參數
    if (!user || !type || !content) {
      return sendError('缺少必要參數: user, type, content');
    }

    sendProgress('驗證用戶', '正在驗證用戶資料...');

    // 動態檢查用戶 JSON 檔案是否存在
    const jsonPath = path.join(PROJECT_ROOT, 'public', 'data', `${user}.json`);
    try {
      await fs.access(jsonPath);
    } catch {
      return sendError(`無效的用戶名稱：${user}（找不到對應的資料檔案）`);
    }

    if (!['text', 'image'].includes(type)) {
      return sendError('無效的類型，只支援 text 或 image');
    }

    console.log(`\n[${new Date().toISOString()}] 收到 SSE 更新請求`);
    console.log(`用戶: ${user}, 類型: ${type}`);

    sendProgress('讀取資料', '正在讀取現有投資資料...');

    // 讀取現有 JSON
    const currentData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));

    sendProgress('AI 分析中', '正在使用 Claude 分析您的指令...');

    // 呼叫 Claude CLI 分析
    console.log('\n呼叫 Claude CLI 分析中...');
    const analysis = await claudeService.analyzeAndUpdate(user, type, content, currentData, jsonPath);

    if (!analysis.success) {
      return sendError(analysis.error || '分析失敗');
    }

    // 檢查是否需要確認（模糊輸入）
    if (analysis.summary && analysis.summary.includes('需要確認')) {
      const question = analysis.summary.replace(/^需要確認[：:]\s*/, '');
      res.write(`data: ${JSON.stringify({
        type: 'clarification',
        question: question,
        originalInput: content
      })}\n\n`);
      res.end();
      return;
    }

    // 檢查是否被拒絕執行（summary 包含「無法執行」）
    if (analysis.summary && analysis.summary.includes('無法執行')) {
      const duration = Date.now() - startTime;
      return sendError(analysis.summary.split('\n')[0]); // 只取第一行作為錯誤訊息
    }

    // 檢查是否有實際變更
    if (!analysis.changes || analysis.changes.length === 0) {
      const duration = Date.now() - startTime;
      return sendError('無法識別有效的交易指令，請確認輸入內容包含買入/賣出操作');
    }

    sendProgress('更新檔案', '正在更新投資組合檔案...');

    sendProgress('推送 GitHub', '正在同步到 GitHub...');

    // 推送到 GitHub
    console.log('\n推送到 GitHub...');
    const gitResult = await githubService.commitAndPush(
      user,
      analysis.changes,
      PROJECT_ROOT
    );

    const duration = Date.now() - startTime;
    console.log(`\n完成！耗時 ${duration}ms`);

    sendComplete({
      success: true,
      message: `已更新 ${user}.json`,
      changes: analysis.changes,
      summary: analysis.summary,
      duration: `${duration}ms`
    });

  } catch (error) {
    console.error('SSE 更新失敗:', error);
    sendError(error.message || '更新失敗');
  }
});

/**
 * GET /update/status
 * 檢查服務狀態
 */
router.get('/status', async (req, res) => {
  try {
    // 檢查 Claude CLI 是否可用
    const claudeAvailable = await claudeService.checkAvailable();

    // 檢查 Git 狀態
    const gitStatus = await githubService.getStatus(
      process.env.PROJECT_ROOT || path.resolve(__dirname, '../..')
    );

    res.json({
      success: true,
      claude: {
        available: claudeAvailable
      },
      git: gitStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
