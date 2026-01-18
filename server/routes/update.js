/**
 * 更新 API 路由
 * POST /update - 接收文字或圖片，分析後更新 JSON
 */

const express = require('express');
const router = express.Router();
const claudeService = require('../services/claude');
const githubService = require('../services/github');
const backupService = require('../services/backup');
const dashboardBackupService = require('../services/dashboard-backup');
const vueCompiler = require('../services/vue-compiler');
const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../..');
const DASHBOARDS_DIR = path.join(__dirname, '../dashboards');

/**
 * 處理儀表板更新
 */
async function handleDashboardUpdate(user, instruction, sendProgress, sendComplete, sendError, startTime, projectRoot) {
  try {
    sendProgress('備份儀表板', '正在備份當前儀表板...');

    // 讀取當前儀表板內容
    const currentContent = await vueCompiler.getUserDashboardRaw(user);

    // 備份當前儀表板
    const backupResult = await dashboardBackupService.createBackup(user, currentContent);
    if (!backupResult.success && !backupResult.skipped) {
      console.warn(`[Warning] 儀表板備份失敗: ${backupResult.error}`);
    }

    sendProgress('修改儀表板', 'AI 正在修改儀表板...');

    // 讀取儀表板 prompt
    const dashboardPrompt = await fs.readFile(
      path.join(__dirname, '../prompts/dashboard.md'),
      'utf-8'
    );

    // 取得儀表板路徑
    const dashboardPath = path.join(DASHBOARDS_DIR, `${user}.vue`);

    // 組合 prompt
    const prompt = dashboardPrompt
      .replace('{{USER}}', user)
      .replace('{{INSTRUCTION}}', instruction)
      .replace('{{CURRENT_VUE}}', currentContent)
      .replace('{{DASHBOARD_PATH}}', dashboardPath);

    // 呼叫 Claude 修改儀表板
    const result = await claudeService.runClaudeRaw(prompt, DASHBOARDS_DIR);

    // 推送到 GitHub
    sendProgress('推送變更', '正在推送到 GitHub...');
    const gitResult = await githubService.commitAndPush(
      user,
      [{ type: 'update', category: '儀表板', item: instruction }],
      projectRoot
    );

    const duration = Date.now() - startTime;
    console.log(`\n儀表板更新完成！耗時 ${duration}ms`);

    sendComplete({
      success: true,
      type: 'dashboard-updated',
      message: `已更新 ${user} 的儀表板`,
      changes: [{ type: 'update', category: '儀表板', item: instruction }],
      summary: result,
      duration: `${duration}ms`
    });

  } catch (error) {
    console.error('儀表板更新失敗:', error);
    sendError(error.message || '儀表板更新失敗');
  }
}

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

    // 讀取現有 JSON
    const currentData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));

    sendProgress('分析中', '');

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

    // 檢查是否是儀表板調整（summary 包含「儀表板調整」）
    if (analysis.summary && analysis.summary.includes('儀表板調整')) {
      console.log('\n偵測到儀表板調整請求，切換到儀表板更新流程...');

      // 取得儀表板調整指令描述
      const dashboardInstruction = analysis.summary.replace(/^儀表板調整[：:]\s*/, '');

      // 執行儀表板更新
      await handleDashboardUpdate(user, dashboardInstruction, sendProgress, sendComplete, sendError, startTime, PROJECT_ROOT);
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

    // 備份當前資料（在實際更新前）
    console.log('\n備份當前資料...');
    const backupResult = await backupService.createBackup(user, jsonPath);
    if (!backupResult.success) {
      console.warn(`[Warning] 備份失敗，但繼續執行更新: ${backupResult.error}`);
    } else if (backupResult.skipped) {
      console.log(`[Backup] ${backupResult.reason}`);
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
