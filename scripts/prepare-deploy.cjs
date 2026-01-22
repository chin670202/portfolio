#!/usr/bin/env node
/**
 * 準備部署：把 users 目錄從 gh-pages 複製到 dist
 *
 * 這個腳本會：
 * 1. 從 gh-pages 分支讀取 users 目錄
 * 2. 複製到 dist/users/
 * 3. 這樣 gh-pages -d dist 就會包含 users 目錄
 */

const simpleGit = require('../server/node_modules/simple-git');
const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

async function prepareDeployAsync() {
  const git = simpleGit(PROJECT_ROOT);

  console.log('準備部署：同步用戶資料到 dist...');

  try {
    // 從 public/data 複製所有用戶 JSON 到 dist/users/
    const dataDir = path.join(PROJECT_ROOT, 'public', 'data');
    const distUsersDir = path.join(PROJECT_ROOT, 'dist', 'users');

    // 掃描用戶
    const files = await fs.readdir(dataDir);
    const users = files
      .filter(f => f.endsWith('.json') && !f.includes('.dashboard.'))
      .map(f => f.replace('.json', ''));

    console.log(`找到 ${users.length} 個用戶:`, users);

    for (const user of users) {
      const userDir = path.join(distUsersDir, user);
      await fs.mkdir(userDir, { recursive: true });

      // 複製用戶 JSON
      const srcJson = path.join(dataDir, `${user}.json`);
      const destJson = path.join(userDir, 'data.json');
      await fs.copyFile(srcJson, destJson);
      console.log(`  ✓ users/${user}/data.json`);

      // 建立 index.html
      const indexHtml = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0;url=/portfolio/${user}">
  <title>我的投資現況 - ${user}</title>
  <script>
    window.__USER__ = '${user}';
    window.__DATA_PATH__ = '/portfolio/users/${user}/data.json';
    window.location.replace('/portfolio/${user}');
  </script>
</head>
<body>
  <p>正在載入...</p>
</body>
</html>`;
      await fs.writeFile(path.join(userDir, 'index.html'), indexHtml, 'utf-8');
      console.log(`  ✓ users/${user}/index.html`);

      // 複製備份
      const backupSrcDir = path.join(dataDir, 'backups', user);
      try {
        const backupFiles = await fs.readdir(backupSrcDir);
        if (backupFiles.length > 0) {
          const backupDestDir = path.join(userDir, 'backups');
          await fs.mkdir(backupDestDir, { recursive: true });
          for (const file of backupFiles) {
            if (file.endsWith('.json')) {
              await fs.copyFile(
                path.join(backupSrcDir, file),
                path.join(backupDestDir, file)
              );
            }
          }
          console.log(`  ✓ ${backupFiles.length} 個備份檔案`);
        }
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }

    // 同時複製到 dist/data/ (向後相容舊路徑)
    const distDataDir = path.join(PROJECT_ROOT, 'dist', 'data');
    await fs.mkdir(distDataDir, { recursive: true });

    for (const user of users) {
      const srcJson = path.join(dataDir, `${user}.json`);
      const destJson = path.join(distDataDir, `${user}.json`);
      await fs.copyFile(srcJson, destJson);

      // 複製備份到舊路徑
      const backupSrcDir = path.join(dataDir, 'backups', user);
      try {
        const backupFiles = await fs.readdir(backupSrcDir);
        if (backupFiles.length > 0) {
          const backupDestDir = path.join(distDataDir, 'backups', user);
          await fs.mkdir(backupDestDir, { recursive: true });
          for (const file of backupFiles) {
            if (file.endsWith('.json')) {
              await fs.copyFile(
                path.join(backupSrcDir, file),
                path.join(backupDestDir, file)
              );
            }
          }
        }
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }
    console.log('已同步到 dist/data/ (向後相容)');

    console.log('\n✅ 部署準備完成');

  } catch (error) {
    console.error('準備部署失敗:', error);
    process.exit(1);
  }
}

prepareDeployAsync();
