/**
 * 模組設計 API 路由
 * 透過 Claude CLI 協助用戶設計自訂儀表模組
 * 採用與 update.js 相同的方式：讓 Claude 直接編輯檔案
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../..');

/**
 * 執行 Claude CLI 讓它直接編輯輸出檔案
 * 與 claude.js 的 runClaude 採用相同模式
 */
async function runClaudeDesign(prompt, workDir, outputFile) {
  return new Promise((resolve, reject) => {
    console.log('執行 Claude CLI 設計模組...');

    const proc = spawn('claude', [
      '--output-format', 'text',
      '--allowedTools', 'Edit,Read,Write',
      '--print'
    ], {
      cwd: workDir,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', async (code) => {
      if (code === 0) {
        // 嘗試讀取輸出檔案
        try {
          const result = await fs.readFile(outputFile, 'utf-8');
          resolve({ output: stdout, spec: JSON.parse(result) });
        } catch (e) {
          // 檔案不存在或非 JSON，返回純文字回應
          resolve({ output: stdout, spec: null });
        }
      } else {
        console.error('Claude CLI 錯誤:', stderr);
        reject(new Error(`Claude CLI 執行失敗: ${stderr || stdout || '未知錯誤'}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`無法執行 Claude CLI: ${err.message}`));
    });

    // 透過 stdin 傳入 prompt
    proc.stdin.write(prompt);
    proc.stdin.end();

    // 設定超時（2 分鐘）
    setTimeout(() => {
      proc.kill();
      reject(new Error('Claude CLI 執行超時'));
    }, 120000);
  });
}

/**
 * POST /modules/design/stream
 * SSE 串流 - 與 Claude 對話設計模組
 */
router.post('/design/stream', async (req, res) => {
  // 設定 SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    const { user, messages, currentSpec, type, content, imageData } = req.body;

    // content 可以是空字串（純圖片請求），但 user 必須存在
    if (!user) {
      sendEvent('error', { message: '缺少必要參數: user' });
      res.end();
      return;
    }

    // 必須有 content 或 imageData
    if (!content && !imageData) {
      sendEvent('error', { message: '缺少必要參數: content 或 imageData' });
      res.end();
      return;
    }

    sendEvent('status', { message: '正在思考...' });

    // 讀取專用 prompt
    const promptPath = path.join(__dirname, '../prompts/module-design.md');
    let systemPrompt;
    try {
      systemPrompt = await fs.readFile(promptPath, 'utf-8');
    } catch (e) {
      systemPrompt = getDefaultPrompt();
    }

    // 讀取用戶資料結構作為參考
    let userDataSchema = '';
    try {
      const userJsonPath = path.join(PROJECT_ROOT, 'public', 'data', `${user}.json`);
      const userData = JSON.parse(await fs.readFile(userJsonPath, 'utf-8'));
      userDataSchema = generateDataSchema(userData);
    } catch (e) {
      console.warn('無法讀取用戶資料:', e.message);
    }

    // 建構對話歷史
    let conversationHistory = '';
    for (const msg of (messages || [])) {
      const role = msg.role === 'user' ? '用戶' : '助手';
      conversationHistory += `\n### ${role}:\n${msg.content}\n`;
    }

    // 處理當前訊息
    let currentMessage = content || '';
    let imageInstruction = '';

    if (type === 'image' && imageData) {
      // 將圖片存到暫存檔
      const tempDir = path.join(__dirname, '../temp');
      await fs.mkdir(tempDir, { recursive: true });
      const imagePath = path.join(tempDir, `design_${Date.now()}.png`);
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      await fs.writeFile(imagePath, base64Data, 'base64');
      imageInstruction = `\n\n[圖片已儲存到: ${imagePath}]\n請用 Read 工具讀取這張圖片來分析。`;
    }

    // 準備輸出檔案路徑
    const tempDir = path.join(__dirname, '../temp');
    await fs.mkdir(tempDir, { recursive: true });
    const outputFile = path.join(tempDir, `module_${Date.now()}.json`);

    // 建構完整 prompt - 讓 Claude 直接把 ModuleSpec 寫到檔案
    const fullPrompt = `${systemPrompt}

## 可用的資料結構
${userDataSchema}

## 目前的模組定義
${currentSpec ? JSON.stringify(currentSpec, null, 2) : '尚未開始設計'}

## 對話歷史
${conversationHistory || '（這是新對話）'}

## 用戶當前請求
${currentMessage}${imageInstruction}

## 重要指示
1. 先用文字回應用戶，解釋你的設計
2. 如果需要產生或更新模組，使用 Write 工具將 ModuleSpec JSON 寫入到以下檔案：
   ${outputFile}
3. 只寫入純 JSON，不要有其他文字`;

    try {
      const result = await runClaudeDesign(fullPrompt, tempDir, outputFile);

      // 分段發送 Claude 的回應
      const chunks = result.output.match(/.{1,50}/gs) || [];
      for (const chunk of chunks) {
        sendEvent('content', { text: chunk });
        await new Promise(r => setTimeout(r, 10));
      }

      // 如果有 ModuleSpec，發送它
      if (result.spec) {
        sendEvent('module_spec', { spec: result.spec });
      } else {
        // 嘗試從回應中解析
        const spec = tryParseModuleSpec(result.output);
        if (spec) {
          sendEvent('module_spec', { spec });
        }
      }

      // 檢查是否為拒絕回應
      if (isRejectionResponse(result.output)) {
        sendEvent('rejected', { message: result.output });
      }

      sendEvent('done', { success: true });

      // 清理暫存檔
      try { await fs.unlink(outputFile); } catch (e) {}

    } catch (error) {
      sendEvent('error', { message: error.message });
    }

    res.end();

  } catch (error) {
    console.error('設計 API 錯誤:', error);
    sendEvent('error', { message: error.message });
    res.end();
  }
});

/**
 * POST /modules/custom
 * 儲存自訂模組
 */
router.post('/custom', async (req, res) => {
  try {
    const { user, module } = req.body;

    if (!user || !module) {
      return res.status(400).json({ error: '缺少必要參數' });
    }

    // 驗證模組結構
    if (!module.uid || !module.name || !module.isCustom) {
      return res.status(400).json({ error: '無效的模組結構' });
    }

    // 讀取用戶 JSON
    const jsonPath = path.join(PROJECT_ROOT, 'public', 'data', `${user}.json`);
    const userData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));

    // 初始化自訂模組陣列
    if (!userData.customModules) {
      userData.customModules = [];
    }

    // 檢查是否已存在（更新）
    const existingIdx = userData.customModules.findIndex(m => m.uid === module.uid);
    if (existingIdx >= 0) {
      userData.customModules[existingIdx] = module;
    } else {
      userData.customModules.push(module);
    }

    // 儲存
    await fs.writeFile(jsonPath, JSON.stringify(userData, null, 2), 'utf-8');

    res.json({ success: true, module });

  } catch (error) {
    console.error('儲存自訂模組失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /modules/custom/:user
 * 取得用戶的自訂模組
 */
router.get('/custom/:user', async (req, res) => {
  try {
    const { user } = req.params;

    const jsonPath = path.join(PROJECT_ROOT, 'public', 'data', `${user}.json`);
    const userData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));

    res.json({ modules: userData.customModules || [] });

  } catch (error) {
    console.error('取得自訂模組失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /modules/custom/:user/:uid
 * 刪除自訂模組
 */
router.delete('/custom/:user/:uid', async (req, res) => {
  try {
    const { user, uid } = req.params;

    const jsonPath = path.join(PROJECT_ROOT, 'public', 'data', `${user}.json`);
    const userData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));

    if (!userData.customModules) {
      return res.status(404).json({ error: '模組不存在' });
    }

    const idx = userData.customModules.findIndex(m => m.uid === uid);
    if (idx < 0) {
      return res.status(404).json({ error: '模組不存在' });
    }

    userData.customModules.splice(idx, 1);
    await fs.writeFile(jsonPath, JSON.stringify(userData, null, 2), 'utf-8');

    res.json({ success: true });

  } catch (error) {
    console.error('刪除自訂模組失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 嘗試從回應中解析 ModuleSpec
 */
function tryParseModuleSpec(text) {
  // 尋找 JSON 區塊
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const spec = JSON.parse(jsonMatch[1]);
      // 驗證基本結構
      if (spec.components || spec.layout || spec.dataBindings) {
        return spec;
      }
    } catch (e) {
      // 解析失敗，忽略
    }
  }
  return null;
}

/**
 * 檢查是否為拒絕回應
 */
function isRejectionResponse(text) {
  const rejectionKeywords = [
    '無法協助',
    '抱歉，我只能',
    '這不是我的專長',
    '超出我的能力範圍',
    '請提供與儀表模組相關的需求',
    '與投資儀表板無關'
  ];
  return rejectionKeywords.some(kw => text.includes(kw));
}

/**
 * 從用戶資料產生 schema 說明
 */
function generateDataSchema(data) {
  const schemas = [];

  if (data.股票 && data.股票.length > 0) {
    const sample = data.股票[0];
    schemas.push(`### 股票（海外債券）
欄位：${Object.keys(sample).join(', ')}`);
  }

  if (data.ETF && data.ETF.length > 0) {
    const sample = data.ETF[0];
    schemas.push(`### ETF
欄位：${Object.keys(sample).join(', ')}`);
  }

  if (data.其它資產 && data.其它資產.length > 0) {
    const sample = data.其它資產[0];
    schemas.push(`### 其它資產
欄位：${Object.keys(sample).join(', ')}`);
  }

  if (data.貸款 && data.貸款.length > 0) {
    const sample = data.貸款[0];
    schemas.push(`### 貸款
欄位：${Object.keys(sample).join(', ')}`);
  }

  if (data.匯率) {
    schemas.push(`### 匯率
欄位：${Object.keys(data.匯率).join(', ')}`);
  }

  return schemas.join('\n\n') || '無可用資料';
}

/**
 * 預設 prompt
 */
function getDefaultPrompt() {
  return `# 投資儀表模組設計助手

你是一個專門協助設計投資儀表模組的 AI 助手。

## 你的任務
幫助用戶設計自訂的儀表板模組，用於顯示他們的投資數據。

## 嚴格限制
- 你只能協助設計投資相關的儀表模組
- 你不能執行程式碼、存取檔案系統、或執行任何其他任務
- 如果用戶請求與模組設計無關的事情，請禮貌拒絕

## 拒絕的請求類型
- 寫程式碼（Python、JavaScript 等）
- 查詢天氣、新聞等資訊
- 執行買賣股票操作
- 存取或修改系統檔案
- 任何與投資儀表模組設計無關的請求

## 可用的元件類型
- summary-card: 摘要卡片（顯示單一數值）
- table: 表格（顯示多筆資料）
- chart-bar: 長條圖
- chart-pie: 圓餅圖
- chart-line: 折線圖
- stat: 統計數字
- list: 列表

## ModuleSpec 結構
\`\`\`json
{
  "name": "模組名稱",
  "description": "模組描述",
  "icon": "📊",
  "layout": "cards|table|chart|mixed",
  "dataBindings": [
    { "key": "變數名", "source": "資料來源", "filter": null }
  ],
  "computedFields": [
    { "key": "計算欄位名", "label": "顯示標籤", "formula": "計算公式", "format": "currency|percent|number" }
  ],
  "components": [
    {
      "type": "元件類型",
      "props": { }
    }
  ],
  "style": {
    "primaryColor": "#顏色代碼",
    "layout": "grid-2|grid-3|stack"
  }
}
\`\`\``;
}

module.exports = router;
