/**
 * 儀表板備份服務
 * 負責用戶 Vue 儀表板檔案的備份管理
 */

const fs = require('fs').promises
const path = require('path')

const DASHBOARDS_DIR = path.join(__dirname, '../dashboards')
const BACKUP_DIR = path.join(DASHBOARDS_DIR, 'backups')

// 備份限制
const MAX_BACKUPS_PER_USER = 10
const MAX_BACKUPS_PER_DAY = 3

/**
 * 確保用戶備份目錄存在
 */
async function ensureBackupDir(user) {
  const userBackupDir = path.join(BACKUP_DIR, user)
  await fs.mkdir(userBackupDir, { recursive: true })
  return userBackupDir
}

/**
 * 產生備份檔名
 */
function generateBackupFilename(user) {
  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '')
  return `${user}_${date}_${time}.vue`
}

/**
 * 取得用戶的所有備份
 */
async function getUserBackups(user) {
  const userBackupDir = path.join(BACKUP_DIR, user)

  try {
    const files = await fs.readdir(userBackupDir)
    const backups = files
      .filter(f => f.endsWith('.vue') && f.startsWith(`${user}_`))
      .map(filename => {
        // 解析檔名: user_2026-01-18_143052.vue
        const match = filename.match(/^(.+)_(\d{4}-\d{2}-\d{2})_(\d{6})\.vue$/)
        if (!match) return null

        const [, , date, time] = match
        const formattedTime = `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`

        return {
          filename,
          date,
          time: formattedTime,
          fullPath: path.join(userBackupDir, filename),
          timestamp: new Date(`${date}T${formattedTime}`)
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp) // 最新的在前

    return backups
  } catch (err) {
    if (err.code === 'ENOENT') {
      return []
    }
    throw err
  }
}

/**
 * 檢查今天是否可以建立更多備份
 */
async function canBackupToday(user) {
  const backups = await getUserBackups(user)
  const today = new Date().toISOString().split('T')[0]
  const todayBackups = backups.filter(b => b.date === today)
  return todayBackups.length < MAX_BACKUPS_PER_DAY
}

/**
 * 清理過多的備份
 */
async function cleanupBackups(user) {
  const backups = await getUserBackups(user)

  // 如果總數超過限制，刪除最舊的
  if (backups.length > MAX_BACKUPS_PER_USER) {
    const toDelete = backups.slice(MAX_BACKUPS_PER_USER)
    for (const backup of toDelete) {
      try {
        await fs.unlink(backup.fullPath)
        console.log(`[DashboardBackup] 刪除舊備份: ${backup.filename}`)
      } catch (err) {
        console.warn(`[DashboardBackup] 無法刪除備份 ${backup.filename}:`, err.message)
      }
    }
  }
}

/**
 * 建立備份
 * @param {string} user - 用戶名稱
 * @param {string} content - Vue 檔案內容
 * @returns {Object} { success, filename, skipped, reason }
 */
async function createBackup(user, content) {
  try {
    const userBackupDir = await ensureBackupDir(user)

    // 檢查今天的備份數量
    if (!(await canBackupToday(user))) {
      console.log(`[DashboardBackup] 用戶 ${user} 今天已達備份上限，跳過`)
      return { success: true, skipped: true, reason: '今天已達備份上限' }
    }

    // 建立備份
    const backupFilename = generateBackupFilename(user)
    const backupPath = path.join(userBackupDir, backupFilename)

    await fs.writeFile(backupPath, content, 'utf-8')
    console.log(`[DashboardBackup] 建立備份: ${backupFilename}`)

    // 清理過多的備份
    await cleanupBackups(user)

    return { success: true, filename: backupFilename }

  } catch (err) {
    console.error(`[DashboardBackup] 備份失敗:`, err)
    return { success: false, error: err.message }
  }
}

/**
 * 還原備份
 * @param {string} user - 用戶名稱
 * @param {string} backupFilename - 備份檔名
 * @returns {Object} { success, content, error }
 */
async function restoreBackup(user, backupFilename) {
  try {
    const userBackupDir = path.join(BACKUP_DIR, user)
    const backupPath = path.join(userBackupDir, backupFilename)
    const dashboardPath = path.join(DASHBOARDS_DIR, `${user}.vue`)

    // 讀取備份
    const content = await fs.readFile(backupPath, 'utf-8')

    // 還原到儀表板
    await fs.writeFile(dashboardPath, content, 'utf-8')
    console.log(`[DashboardBackup] 還原備份: ${backupFilename}`)

    return { success: true, content }

  } catch (err) {
    console.error(`[DashboardBackup] 還原失敗:`, err)
    return { success: false, error: err.message }
  }
}

/**
 * 列出用戶的備份
 */
async function listBackups(user) {
  const backups = await getUserBackups(user)
  return backups.map(b => ({
    filename: b.filename,
    date: b.date,
    time: b.time
  }))
}

module.exports = {
  createBackup,
  restoreBackup,
  listBackups
}
