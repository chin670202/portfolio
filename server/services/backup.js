/**
 * 備份服務
 * 負責用戶 JSON 檔案的備份管理
 */

const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../..');
const BACKUP_DIR = path.join(PROJECT_ROOT, 'public', 'data', 'backups');

// 備份限制設定
const MAX_BACKUPS_PER_USER = 10;  // 每用戶最多保留 10 份備份
const MAX_BACKUPS_PER_DAY = 3;    // 每天最多 3 份備份

/**
 * 確保備份目錄存在
 */
async function ensureBackupDir(user) {
  const userBackupDir = path.join(BACKUP_DIR, user);
  await fs.mkdir(userBackupDir, { recursive: true });
  return userBackupDir;
}

/**
 * 取得今天的日期字串 (YYYY-MM-DD)
 */
function getTodayDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * 從備份檔名解析日期和時間
 * 檔名格式: {user}_2026-01-18_143052.json
 */
function parseBackupFilename(filename) {
  const match = filename.match(/^(.+)_(\d{4}-\d{2}-\d{2})_(\d{6})\.json$/);
  if (!match) return null;
  return {
    user: match[1],
    date: match[2],
    time: match[3],
    filename
  };
}

/**
 * 產生備份檔名
 */
function generateBackupFilename(user) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
  return `${user}_${date}_${time}.json`;
}

/**
 * 取得用戶的所有備份檔案（按時間排序，最新的在前）
 */
async function getUserBackups(user) {
  const userBackupDir = path.join(BACKUP_DIR, user);

  try {
    const files = await fs.readdir(userBackupDir);
    const backups = files
      .map(parseBackupFilename)
      .filter(b => b && b.user === user)
      .sort((a, b) => {
        // 按日期和時間降序排列（最新的在前）
        const dateTimeA = a.date + a.time;
        const dateTimeB = b.date + b.time;
        return dateTimeB.localeCompare(dateTimeA);
      });
    return backups;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * 清理過多的備份
 * - 每天最多保留 MAX_BACKUPS_PER_DAY 份
 * - 總共最多保留 MAX_BACKUPS_PER_USER 份
 */
async function cleanupBackups(user) {
  const userBackupDir = path.join(BACKUP_DIR, user);
  const backups = await getUserBackups(user);

  // 按日期分組
  const backupsByDate = {};
  for (const backup of backups) {
    if (!backupsByDate[backup.date]) {
      backupsByDate[backup.date] = [];
    }
    backupsByDate[backup.date].push(backup);
  }

  // 每天只保留最新的 MAX_BACKUPS_PER_DAY 份
  const toDelete = [];
  for (const date in backupsByDate) {
    const dayBackups = backupsByDate[date];
    if (dayBackups.length > MAX_BACKUPS_PER_DAY) {
      // 刪除較舊的（已經按時間降序排列，所以取後面的刪除）
      toDelete.push(...dayBackups.slice(MAX_BACKUPS_PER_DAY));
    }
  }

  // 刪除超過每日限制的備份
  for (const backup of toDelete) {
    const filePath = path.join(userBackupDir, backup.filename);
    await fs.unlink(filePath);
    console.log(`[Backup] 刪除超過每日限制的備份: ${backup.filename}`);
  }

  // 重新取得剩餘備份，檢查總數限制
  const remainingBackups = await getUserBackups(user);
  if (remainingBackups.length > MAX_BACKUPS_PER_USER) {
    // 刪除最舊的備份
    const oldBackups = remainingBackups.slice(MAX_BACKUPS_PER_USER);
    for (const backup of oldBackups) {
      const filePath = path.join(userBackupDir, backup.filename);
      await fs.unlink(filePath);
      console.log(`[Backup] 刪除超過總數限制的備份: ${backup.filename}`);
    }
  }
}

/**
 * 檢查今天是否已達備份上限
 */
async function canBackupToday(user) {
  const backups = await getUserBackups(user);
  const today = getTodayDateString();
  const todayBackups = backups.filter(b => b.date === today);
  return todayBackups.length < MAX_BACKUPS_PER_DAY;
}

/**
 * 建立備份
 * @param {string} user - 用戶名稱
 * @param {string} jsonPath - 原始 JSON 檔案路徑
 * @returns {Promise<{success: boolean, filename?: string, skipped?: boolean, reason?: string}>}
 */
async function createBackup(user, jsonPath) {
  try {
    // 確保備份目錄存在
    const userBackupDir = await ensureBackupDir(user);

    // 檢查今天是否已達備份上限
    if (!await canBackupToday(user)) {
      console.log(`[Backup] 用戶 ${user} 今天已達備份上限 (${MAX_BACKUPS_PER_DAY} 份)，跳過備份`);
      return { success: true, skipped: true, reason: '今天已達備份上限' };
    }

    // 讀取原始檔案
    const content = await fs.readFile(jsonPath, 'utf-8');

    // 產生備份檔名並寫入
    const backupFilename = generateBackupFilename(user);
    const backupPath = path.join(userBackupDir, backupFilename);
    await fs.writeFile(backupPath, content, 'utf-8');

    console.log(`[Backup] 建立備份: ${backupFilename}`);

    // 清理過多的備份
    await cleanupBackups(user);

    return { success: true, filename: backupFilename };
  } catch (err) {
    console.error(`[Backup] 備份失敗:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * 取得用戶的備份列表（供前端顯示）
 */
async function listBackups(user) {
  const backups = await getUserBackups(user);
  return backups.map(b => ({
    filename: b.filename,
    date: b.date,
    time: b.time.replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3'),
    displayName: `${b.date} ${b.time.replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3')}`
  }));
}

/**
 * 還原備份
 * @param {string} user - 用戶名稱
 * @param {string} backupFilename - 備份檔名
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function restoreBackup(user, backupFilename) {
  try {
    const userBackupDir = path.join(BACKUP_DIR, user);
    const backupPath = path.join(userBackupDir, backupFilename);
    const jsonPath = path.join(PROJECT_ROOT, 'public', 'data', `${user}.json`);

    // 檢查備份檔案是否存在
    await fs.access(backupPath);

    // 先備份當前檔案（還原前的狀態）
    await createBackup(user, jsonPath);

    // 讀取備份檔案並寫入原始位置
    const content = await fs.readFile(backupPath, 'utf-8');
    await fs.writeFile(jsonPath, content, 'utf-8');

    console.log(`[Backup] 還原備份: ${backupFilename}`);

    return { success: true };
  } catch (err) {
    console.error(`[Backup] 還原失敗:`, err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  getUserBackups,
  BACKUP_DIR
};
