/**
 * Claude CLI 服務
 * 透過 Claude Code CLI 分析輸入並更新 JSON
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * 檢查 Claude CLI 是否可用
 */
async function checkAvailable() {
  return new Promise((resolve) => {
    exec('claude --version', { timeout: 5000 }, (error, stdout) => {
      resolve(!error && stdout.includes('Claude'));
    });
  });
}

/**
 * 執行 Claude CLI 並取得結果
 */
async function runClaude(prompt, workDir) {
  const { spawn } = require('child_process');

  return new Promise((resolve, reject) => {
    console.log('執行 Claude CLI...');

    // 使用 spawn 並透過 stdin 傳入 prompt
    const proc = spawn('claude', [
      '--output-format', 'text',
      '--allowedTools', 'Edit,Read',
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

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
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

    // 設定超時（3 分鐘）
    setTimeout(() => {
      proc.kill();
      reject(new Error('Claude CLI 執行超時'));
    }, 180000);
  });
}

/**
 * 分析輸入並更新 JSON
 */
async function analyzeAndUpdate(user, type, content, currentData, jsonPath) {
  const promptTemplate = await fs.readFile(
    path.join(__dirname, '../prompts/analyze.md'),
    'utf-8'
  );

  // 準備輸入描述
  let inputDescription;
  if (type === 'text') {
    inputDescription = content;
  } else {
    // 圖片的情況，需要存成暫存檔讓 Claude 讀取
    const tempImagePath = path.join(__dirname, '../temp', `input_${Date.now()}.png`);
    await fs.mkdir(path.dirname(tempImagePath), { recursive: true });

    // 處理 base64 圖片
    const base64Data = content.replace(/^data:image\/\w+;base64,/, '');
    await fs.writeFile(tempImagePath, base64Data, 'base64');

    inputDescription = `[圖片已儲存到: ${tempImagePath}]
請使用 Read 工具讀取這張圖片，分析其中的交易資訊。`;
  }

  // 建構完整 prompt
  const prompt = promptTemplate
    .replace('{{USER}}', user)
    .replace('{{INPUT_TYPE}}', type)
    .replace('{{INPUT_CONTENT}}', inputDescription)
    .replace('{{CURRENT_DATA}}', JSON.stringify(currentData, null, 2))
    .replace('{{JSON_PATH}}', jsonPath);

  try {
    // 執行 Claude CLI
    const result = await runClaude(prompt, path.dirname(jsonPath));

    console.log('Claude CLI 回應:', result.substring(0, 500) + '...');

    // 讀取更新後的 JSON 檔案
    const updatedData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));

    // 比較變更
    const changes = compareChanges(currentData, updatedData);

    return {
      success: true,
      changes: changes,
      summary: result
    };

  } catch (error) {
    console.error('Claude 分析失敗:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 比較兩個 JSON 的變更
 */
function compareChanges(oldData, newData) {
  const changes = [];

  // 比較股票
  if (oldData.股票 && newData.股票) {
    const oldCodes = new Set(oldData.股票.map(s => s.代號));
    const newCodes = new Set(newData.股票.map(s => s.代號));

    for (const stock of newData.股票) {
      if (!oldCodes.has(stock.代號)) {
        changes.push({
          type: 'add',
          category: '股票',
          item: `${stock.公司名稱} (${stock.代號})`
        });
      }
    }

    for (const stock of oldData.股票) {
      if (!newCodes.has(stock.代號)) {
        changes.push({
          type: 'remove',
          category: '股票',
          item: `${stock.公司名稱} (${stock.代號})`
        });
      }
    }
  }

  // 比較 ETF
  if (oldData.ETF && newData.ETF) {
    const oldCodes = new Set(oldData.ETF.map(e => e.代號));
    const newCodes = new Set(newData.ETF.map(e => e.代號));

    for (const etf of newData.ETF) {
      if (!oldCodes.has(etf.代號)) {
        changes.push({
          type: 'add',
          category: 'ETF',
          item: `${etf.名稱} (${etf.代號})`
        });
      }
    }

    for (const etf of oldData.ETF) {
      if (!newCodes.has(etf.代號)) {
        changes.push({
          type: 'remove',
          category: 'ETF',
          item: `${etf.名稱} (${etf.代號})`
        });
      }
    }
  }

  // 比較其它資產
  if (oldData.其它資產 && newData.其它資產) {
    const oldCodes = new Set(oldData.其它資產.map(a => a.代號));
    const newCodes = new Set(newData.其它資產.map(a => a.代號));

    for (const asset of newData.其它資產) {
      if (!oldCodes.has(asset.代號)) {
        changes.push({
          type: 'add',
          category: '其它資產',
          item: `${asset.名稱} (${asset.代號})`
        });
      }
    }

    for (const asset of oldData.其它資產) {
      if (!newCodes.has(asset.代號)) {
        changes.push({
          type: 'remove',
          category: '其它資產',
          item: `${asset.名稱} (${asset.代號})`
        });
      }
    }
  }

  // 比較貸款
  if (oldData.貸款 && newData.貸款) {
    const oldLoans = new Set(oldData.貸款.map(l => l.貸款別));
    const newLoans = new Set(newData.貸款.map(l => l.貸款別));

    for (const loan of newData.貸款) {
      if (!oldLoans.has(loan.貸款別)) {
        changes.push({
          type: 'add',
          category: '貸款',
          item: loan.貸款別
        });
      }
    }

    for (const loan of oldData.貸款) {
      if (!newLoans.has(loan.貸款別)) {
        changes.push({
          type: 'remove',
          category: '貸款',
          item: loan.貸款別
        });
      }
    }
  }

  // 檢查持有單位變更
  if (oldData.其它資產 && newData.其它資產) {
    for (const newAsset of newData.其它資產) {
      const oldAsset = oldData.其它資產.find(a => a.代號 === newAsset.代號);
      if (oldAsset && oldAsset.持有單位 !== newAsset.持有單位) {
        const diff = newAsset.持有單位 - oldAsset.持有單位;
        changes.push({
          type: diff > 0 ? 'increase' : 'decrease',
          category: '其它資產',
          item: `${newAsset.名稱} 持有單位: ${oldAsset.持有單位} → ${newAsset.持有單位}`
        });
      }
    }
  }

  return changes;
}

module.exports = {
  checkAvailable,
  analyzeAndUpdate
};
