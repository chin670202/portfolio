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
 * 同步用戶資料到 gh-pages 分支的用戶專屬目錄
 *
 * 使用 git worktree 避免切換分支，這樣：
 * 1. 不會影響本地開發環境
 * 2. 不需要 stash 未提交的變更
 * 3. 可以安全地並行操作
 *
 * gh-pages/users/{username}/data.json
 * gh-pages/users/{username}/backups/
 */
async function syncToGhPages(user, projectRoot) {
  const git = simpleGit(projectRoot);
  const worktreePath = path.join(projectRoot, '.gh-pages-worktree');

  try {
    // 取得要同步的檔案路徑（main 分支上的路徑）
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
      if (err.code !== 'ENOENT') throw err;
    }

    // 設定 git worktree
    console.log('設定 gh-pages worktree...');

    // 先清理可能存在的舊 worktree
    try {
      await git.raw(['worktree', 'remove', worktreePath, '--force']);
    } catch (err) {
      // 忽略，可能不存在
    }

    // 先 fetch 最新的 gh-pages
    await git.fetch('origin', 'gh-pages');

    // 建立新的 worktree 指向 gh-pages 分支
    try {
      await git.raw(['worktree', 'add', worktreePath, 'gh-pages']);
    } catch (err) {
      // 如果 worktree 已存在，嘗試重新設定
      if (err.message.includes('already exists')) {
        await git.raw(['worktree', 'remove', worktreePath, '--force']);
        await git.raw(['worktree', 'add', worktreePath, 'gh-pages']);
      } else {
        throw err;
      }
    }

    const worktreeGit = simpleGit(worktreePath);

    // 確保 worktree 是最新的
    await worktreeGit.pull('origin', 'gh-pages');

    try {
      // 用戶專屬目錄路徑（在 worktree 中）
      const userDir = path.join(worktreePath, 'users', user);

      // 確保用戶目錄存在
      await fs.mkdir(userDir, { recursive: true });

      // 更新用戶資料 JSON
      const userDataPath = path.join(userDir, 'data.json');
      await fs.writeFile(userDataPath, jsonContent, 'utf-8');
      console.log(`已更新 gh-pages: users/${user}/data.json`);

      // 同時更新舊路徑（向後相容）
      const legacyDataDir = path.join(worktreePath, 'data');
      await fs.mkdir(legacyDataDir, { recursive: true });
      await fs.writeFile(path.join(legacyDataDir, `${user}.json`), jsonContent, 'utf-8');
      console.log(`已更新 gh-pages: data/${user}.json (向後相容)`);

      // 更新備份檔案
      if (backupFiles.length > 0) {
        const userBackupDir = path.join(userDir, 'backups');
        await fs.mkdir(userBackupDir, { recursive: true });

        for (const backup of backupFiles) {
          await fs.writeFile(path.join(userBackupDir, backup.name), backup.content, 'utf-8');
        }
        console.log(`已同步 ${backupFiles.length} 個備份檔案到 users/${user}/backups/`);

        // 同時更新舊路徑的備份
        const legacyBackupDir = path.join(legacyDataDir, 'backups', user);
        await fs.mkdir(legacyBackupDir, { recursive: true });
        for (const backup of backupFiles) {
          await fs.writeFile(path.join(legacyBackupDir, backup.name), backup.content, 'utf-8');
        }
      }

      // 在 worktree 中 stage 並 commit
      await worktreeGit.add(`users/${user}/*`);
      await worktreeGit.add(`data/${user}.json`);
      try {
        await worktreeGit.add(`data/backups/${user}/*`);
      } catch (err) {
        // 忽略
      }

      const status = await worktreeGit.status();
      if (!status.isClean()) {
        await worktreeGit.commit(`sync: 更新 ${user} 用戶資料`);
        await worktreeGit.push('origin', 'gh-pages');
        console.log('gh-pages 同步完成');
      } else {
        console.log('gh-pages 無需更新（資料相同）');
      }

    } finally {
      // 清理 worktree
      try {
        await git.raw(['worktree', 'remove', worktreePath, '--force']);
        console.log('已清理 worktree');
      } catch (err) {
        console.warn('清理 worktree 失敗:', err.message);
      }
    }

    return { success: true };

  } catch (error) {
    console.error('gh-pages 同步失敗:', error);
    // 嘗試清理 worktree
    try {
      await git.raw(['worktree', 'remove', worktreePath, '--force']);
    } catch (e) {
      // 忽略
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
