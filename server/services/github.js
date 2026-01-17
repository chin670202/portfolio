/**
 * GitHub 服務
 * 處理 Git 操作：commit 和 push
 */

const simpleGit = require('simple-git');

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

    // Stage 變更的 JSON 檔案
    const jsonFile = `public/data/${user}.json`;
    await git.add(jsonFile);

    console.log(`Staging: ${jsonFile}`);

    // Commit
    const commitResult = await git.commit(commitMessage);
    console.log('Commit 完成:', commitResult.commit);

    // Push
    await git.push();
    console.log('Push 完成');

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
  commitAndPush
};
