#!/usr/bin/env node
/**
 * 用戶專屬部署腳本
 *
 * 用法：node scripts/deploy-user.js <username>
 *
 * 這個腳本會：
 * 1. 複製用戶的 JSON 資料到 gh-pages 的 users/<username>/data.json
 * 2. 只更新該用戶的資料，不影響其他用戶
 */

const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

async function deployUser(username) {
  if (!username) {
    console.error('請指定用戶名稱：node scripts/deploy-user.js <username>');
    process.exit(1);
  }

  const git = simpleGit(PROJECT_ROOT);

  try {
    // 確認用戶資料存在
    const userJsonPath = path.join(PROJECT_ROOT, 'public', 'data', `${username}.json`);
    try {
      await fs.access(userJsonPath);
    } catch {
      console.error(`找不到用戶資料：${userJsonPath}`);
      process.exit(1);
    }

    // 讀取用戶資料
    const userDataContent = await fs.readFile(userJsonPath, 'utf-8');
    console.log(`讀取用戶資料：${username}.json`);

    // 讀取備份檔案
    const backupDirPath = path.join(PROJECT_ROOT, 'public', 'data', 'backups', username);
    let backupFiles = [];
    try {
      const files = await fs.readdir(backupDirPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(backupDirPath, file), 'utf-8');
          backupFiles.push({ name: file, content });
        }
      }
      console.log(`找到 ${backupFiles.length} 個備份檔案`);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    // 取得當前分支
    const branch = await git.branch();
    const currentBranch = branch.current;
    console.log(`當前分支：${currentBranch}`);

    // 切換到 gh-pages
    console.log('切換到 gh-pages 分支...');
    await git.checkout('gh-pages');

    try {
      // 確保用戶目錄存在
      const userDir = path.join(PROJECT_ROOT, 'users', username);
      await fs.mkdir(userDir, { recursive: true });

      // 寫入用戶資料
      const userDataPath = path.join(userDir, 'data.json');
      await fs.writeFile(userDataPath, userDataContent, 'utf-8');
      console.log(`已寫入：users/${username}/data.json`);

      // 複製 index.html（如果不存在）
      const userIndexPath = path.join(userDir, 'index.html');
      try {
        await fs.access(userIndexPath);
      } catch {
        // 建立用戶專屬的 index.html
        const indexContent = await generateUserIndexHtml(username);
        await fs.writeFile(userIndexPath, indexContent, 'utf-8');
        console.log(`已建立：users/${username}/index.html`);
      }

      // 寫入備份檔案
      if (backupFiles.length > 0) {
        const backupDir = path.join(userDir, 'backups');
        await fs.mkdir(backupDir, { recursive: true });
        for (const backup of backupFiles) {
          await fs.writeFile(path.join(backupDir, backup.name), backup.content, 'utf-8');
        }
        console.log(`已同步 ${backupFiles.length} 個備份檔案`);
      }

      // Stage 變更
      await git.add(`users/${username}/*`);

      // 檢查是否有變更
      const status = await git.status();
      if (!status.isClean()) {
        await git.commit(`sync: 更新 ${username} 用戶資料`);
        await git.push('origin', 'gh-pages');
        console.log('✅ gh-pages 同步完成');
      } else {
        console.log('無需更新（資料相同）');
      }

    } finally {
      // 切回原分支
      await git.checkout(currentBranch);
      console.log(`已切回 ${currentBranch} 分支`);
    }

  } catch (error) {
    console.error('部署失敗:', error.message);
    // 嘗試切回 main
    try {
      await git.checkout('main');
    } catch (e) {
      console.error('切回 main 失敗:', e.message);
    }
    process.exit(1);
  }
}

/**
 * 產生用戶專屬的 index.html
 * 這個 HTML 會載入共用的 JS/CSS，但指定用戶資料路徑
 */
async function generateUserIndexHtml(username) {
  // 讀取主 index.html 作為模板
  const mainIndexPath = path.join(PROJECT_ROOT, 'index.html');
  let html;
  try {
    html = await fs.readFile(mainIndexPath, 'utf-8');
  } catch {
    // 如果主 index.html 不存在（在 gh-pages 分支），使用預設模板
    html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>我的投資現況</title>
  <script>
    // 設定用戶名稱
    window.__USER__ = '${username}';
    window.__DATA_PATH__ = './data.json';
  </script>
</head>
<body>
  <div id="app"></div>
  <script>
    // 重導向到主應用程式，帶上用戶參數
    window.location.href = '/portfolio/${username}';
  </script>
</body>
</html>`;
  }

  // 注入用戶設定
  const userScript = `<script>window.__USER__='${username}';window.__DATA_PATH__='./data.json';</script>`;
  html = html.replace('</head>', `${userScript}</head>`);

  return html;
}

// 執行
const username = process.argv[2];
deployUser(username);
