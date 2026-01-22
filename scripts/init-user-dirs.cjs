#!/usr/bin/env node
/**
 * 初始化用戶專屬目錄
 *
 * 這個腳本會：
 * 1. 掃描 public/data/*.json 找出所有用戶
 * 2. 在 gh-pages 分支建立 users/{username}/ 目錄結構
 * 3. 為每個用戶建立 data.json 和 index.html
 */

const simpleGit = require('../server/node_modules/simple-git');
const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

async function initUserDirs() {
  const git = simpleGit(PROJECT_ROOT);

  try {
    // 掃描所有用戶 JSON 檔案
    const dataDir = path.join(PROJECT_ROOT, 'public', 'data');
    const files = await fs.readdir(dataDir);
    const users = files
      .filter(f => f.endsWith('.json') && !f.includes('.dashboard.'))
      .map(f => f.replace('.json', ''));

    console.log(`找到 ${users.length} 個用戶:`, users);

    // 讀取所有用戶資料
    const usersData = {};
    for (const user of users) {
      const jsonPath = path.join(dataDir, `${user}.json`);
      usersData[user] = await fs.readFile(jsonPath, 'utf-8');

      // 讀取備份
      const backupDir = path.join(dataDir, 'backups', user);
      usersData[user + '_backups'] = [];
      try {
        const backupFiles = await fs.readdir(backupDir);
        for (const file of backupFiles) {
          if (file.endsWith('.json')) {
            const content = await fs.readFile(path.join(backupDir, file), 'utf-8');
            usersData[user + '_backups'].push({ name: file, content });
          }
        }
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }

    // 取得當前分支
    const branch = await git.branch();
    const currentBranch = branch.current;

    // 切換到 gh-pages
    console.log('切換到 gh-pages 分支...');
    await git.checkout('gh-pages');

    try {
      // 為每個用戶建立目錄
      for (const user of users) {
        console.log(`\n處理用戶: ${user}`);

        const userDir = path.join(PROJECT_ROOT, 'users', user);
        await fs.mkdir(userDir, { recursive: true });

        // 寫入 data.json
        await fs.writeFile(
          path.join(userDir, 'data.json'),
          usersData[user],
          'utf-8'
        );
        console.log(`  ✓ users/${user}/data.json`);

        // 建立 index.html（重導向到主應用）
        const indexHtml = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0;url=/portfolio/${user}">
  <title>我的投資現況 - ${user}</title>
  <script>
    // 設定用戶資料路徑（給主應用使用）
    window.__USER__ = '${user}';
    window.__DATA_PATH__ = '/portfolio/users/${user}/data.json';
    // 立即重導向
    window.location.replace('/portfolio/${user}');
  </script>
</head>
<body>
  <p>正在載入...</p>
</body>
</html>`;
        await fs.writeFile(path.join(userDir, 'index.html'), indexHtml, 'utf-8');
        console.log(`  ✓ users/${user}/index.html`);

        // 寫入備份
        const backups = usersData[user + '_backups'];
        if (backups.length > 0) {
          const backupDir = path.join(userDir, 'backups');
          await fs.mkdir(backupDir, { recursive: true });
          for (const backup of backups) {
            await fs.writeFile(path.join(backupDir, backup.name), backup.content, 'utf-8');
          }
          console.log(`  ✓ ${backups.length} 個備份檔案`);
        }
      }

      // Stage 所有變更
      await git.add('users/*');

      const status = await git.status();
      if (!status.isClean()) {
        await git.commit('feat: 初始化用戶專屬目錄結構');
        await git.push('origin', 'gh-pages');
        console.log('\n✅ gh-pages 已更新');
      } else {
        console.log('\n無需更新');
      }

    } finally {
      await git.checkout(currentBranch);
      console.log(`已切回 ${currentBranch} 分支`);
    }

  } catch (error) {
    console.error('初始化失敗:', error);
    try {
      await git.checkout('main');
    } catch (e) {
      console.error('切回 main 失敗:', e);
    }
    process.exit(1);
  }
}

initUserDirs();
