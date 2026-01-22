/**
 * GitHub 服務
 * 處理 Git 操作：commit 和 push，以及 gh-pages 部署
 */

const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs').promises;

/**
 * 取得 Git 狀態
 */
async function getStatus(projectRoot) {
  const git = simpleGit(projectRoot);

  try {
    const status = await git.status();
    const branch = await git.branch();

    return {
      branch: branch.current,
      isClean: status.isClean(),
      modified: status.modified,
      staged: status.staged,
      untracked: status.not_added
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

/**
 * 同步資料檔案到 gh-pages 分支
 * 只更新 data/ 目錄下的 JSON 檔案，不重新 build 整個專案
 */
async function syncToGhPages(user, projectRoot) {
  const git = simpleGit(projectRoot);

  try {
    // 取得當前分支
    const branch = await git.branch();
    const currentBranch = branch.current;

    // 取得要同步的檔案路徑
    const jsonFile = `public/data/${user}.json`;
    const backupDir = `public/data/backups/${user}`;

    // 讀取 main 分支上的檔案內容
    const jsonContent = await fs.readFile(path.join(projectRoot, jsonFile), 'utf-8');

    // 讀取備份目錄的所有檔案
    const backupDirPath = path.join(projectRoot, backupDir);
    let backupFiles = [];
    try {
      const files = await fs.readdir(backupDirPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(backupDirPath, file), 'utf-8');
          backupFiles.push({ name: file, content });
        }
      }
    } catch (err) {
      // 備份目錄可能不存在，忽略
      if (err.code !== 'ENOENT') throw err;
    }

    // 切換到 gh-pages 分支
    console.log('切換到 gh-pages 分支...');
    await git.checkout('gh-pages');

    try {
      // 更新 JSON 檔案（gh-pages 上的路徑是 data/，不是 public/data/）
      const ghPagesJsonPath = path.join(projectRoot, `data/${user}.json`);
      await fs.writeFile(ghPagesJsonPath, jsonContent, 'utf-8');
      console.log(`已更新 gh-pages: data/${user}.json`);

      // 更新備份檔案
      if (backupFiles.length > 0) {
        const ghPagesBackupDir = path.join(projectRoot, `data/backups/${user}`);
        await fs.mkdir(ghPagesBackupDir, { recursive: true });

        for (const backup of backupFiles) {
          const backupPath = path.join(ghPagesBackupDir, backup.name);
          await fs.writeFile(backupPath, backup.content, 'utf-8');
        }
        console.log(`已同步 ${backupFiles.length} 個備份檔案到 gh-pages`);
      }

      // Stage 並 commit
      await git.add(`data/${user}.json`);
      await git.add(`data/backups/${user}/*`);

      const status = await git.status();
      if (!status.isClean()) {
        await git.commit(`sync: 更新 ${user} 資料`);
        await git.push('origin', 'gh-pages');
        console.log('gh-pages 同步完成');
      } else {
        console.log('gh-pages 無需更新');
      }

    } finally {
      // 切回原本的分支
      await git.checkout(currentBranch);
      console.log(`已切回 ${currentBranch} 分支`);
    }

    return { success: true };

  } catch (error) {
    console.error('gh-pages 同步失敗:', error);
    // 嘗試切回原分支
    try {
      const branch = await git.branch();
      if (branch.current === 'gh-pages') {
        await git.checkout('main');
      }
    } catch (e) {
      console.error('切回 main 分支失敗:', e);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Commit 並 Push 變更
 */
async function commitAndPush(user, changes, projectRoot) {
  const git = simpleGit(projectRoot);

  try {
    // 檢查是否有變更
    const status = await git.status();

    if (status.isClean()) {
      console.log('沒有變更需要提交');
      return {
        success: true,
        message: '沒有變更需要提交',
        commitUrl: null
      };
    }

    // 產生 commit message
    const changesSummary = changes.map(c => {
      const typeEmoji = {
        'add': '+',
        'remove': '-',
        'increase': '↑',
        'decrease': '↓',
        'update': '~'
      };
      return `${typeEmoji[c.type] || '*'} ${c.category}: ${c.item}`;
    }).join('\n');

    const commitMessage = `更新 ${user} 投資部位

${changesSummary}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`;

    // Stage 變更的 JSON 檔案和備份檔案
    const jsonFile = `public/data/${user}.json`;
    const backupDir = `public/data/backups/${user}`;

    await git.add(jsonFile);
    console.log(`Staging: ${jsonFile}`);

    // 嘗試 stage 備份目錄（如果存在）
    try {
      await git.add(backupDir);
      console.log(`Staging: ${backupDir}`);
    } catch (err) {
      // 備份目錄可能不存在，忽略
    }

    // Commit
    const commitResult = await git.commit(commitMessage);
    console.log('Commit 完成:', commitResult.commit);

    // Push 到 main
    await git.push();
    console.log('Push 完成');

    // 同步到 gh-pages 分支
    console.log('同步到 gh-pages...');
    const syncResult = await syncToGhPages(user, projectRoot);
    if (!syncResult.success) {
      console.warn('gh-pages 同步失敗，但 main 分支已更新:', syncResult.error);
    }

    // 取得遠端 URL 來建構 commit URL
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');

    let commitUrl = null;
    if (origin && origin.refs.push) {
      // 從 git URL 轉換成 GitHub URL
      const repoUrl = origin.refs.push
        .replace(/\.git$/, '')
        .replace(/^git@github\.com:/, 'https://github.com/');
      commitUrl = `${repoUrl}/commit/${commitResult.commit}`;
    }

    return {
      success: true,
      message: '已推送到 GitHub',
      commit: commitResult.commit,
      commitUrl: commitUrl
    };

  } catch (error) {
    console.error('Git 操作失敗:', error);
    throw new Error(`Git 操作失敗: ${error.message}`);
  }
}

module.exports = {
  getStatus,
  commitAndPush,
  syncToGhPages
};
