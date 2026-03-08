/**
 * Backup Service
 * Manages user portfolio backups in D1.
 * Migrated from server/services/backup.js (filesystem → D1)
 */

const MAX_BACKUPS_PER_USER = 100

/**
 * Create a backup of user's portfolio data
 * @param {D1Database} db
 */
export async function createBackup(db, user) {
  const portfolio = await db.prepare('SELECT data FROM portfolios WHERE user = ?').bind(user).first()
  if (!portfolio) return { success: false, error: '找不到用戶資料' }

  const today = new Date().toISOString().split('T')[0]
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '')
  const filename = `${user}_${today}_${time}.json`

  await db.prepare(
    'INSERT INTO backups (user, filename, data, backup_date, backup_time) VALUES (?, ?, ?, ?, ?)'
  ).bind(user, filename, portfolio.data, today, time).run()

  // Cleanup: same-day backups — keep at most 3 per day, delete oldest
  const MAX_DAILY_BACKUPS = 3
  const { results: dailyBackups } = await db.prepare(
    'SELECT id FROM backups WHERE user = ? AND backup_date = ? ORDER BY created_at DESC'
  ).bind(user, today).all()

  if (dailyBackups.length > MAX_DAILY_BACKUPS) {
    const idsToDelete = dailyBackups.slice(MAX_DAILY_BACKUPS).map(b => b.id)
    await db.prepare(
      `DELETE FROM backups WHERE id IN (${idsToDelete.map(() => '?').join(',')})`
    ).bind(...idsToDelete).run()
  }

  // Cleanup: keep max per user (across all days)
  await db.prepare(`
    DELETE FROM backups WHERE user = ? AND id NOT IN (
      SELECT id FROM backups WHERE user = ? ORDER BY created_at DESC LIMIT ?
    )
  `).bind(user, user, MAX_BACKUPS_PER_USER).run()

  return { success: true, filename }
}

/**
 * List backups for a user
 * @param {D1Database} db
 */
export async function listBackups(db, user) {
  const { results } = await db.prepare(
    'SELECT filename, backup_date, backup_time FROM backups WHERE user = ? ORDER BY created_at DESC'
  ).bind(user).all()

  return results.map(b => ({
    filename: b.filename,
    date: b.backup_date,
    time: b.backup_time.replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3'),
    displayName: `${b.backup_date} ${b.backup_time.replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3')}`
  }))
}

/**
 * Get a single backup's data for preview
 * @param {D1Database} db
 */
export async function getBackupData(db, user, filename) {
  const backup = await db.prepare(
    'SELECT data, backup_date, backup_time FROM backups WHERE user = ? AND filename = ?'
  ).bind(user, filename).first()

  if (!backup) return { success: false, error: '找不到指定的備份' }

  return {
    success: true,
    data: JSON.parse(backup.data),
    date: backup.backup_date,
    time: backup.backup_time.replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3')
  }
}

/**
 * Restore a backup
 * @param {D1Database} db
 */
export async function restoreBackup(db, user, backupFilename) {
  const backup = await db.prepare(
    'SELECT data FROM backups WHERE user = ? AND filename = ?'
  ).bind(user, backupFilename).first()

  if (!backup) return { success: false, error: '找不到指定的備份' }

  // Backup current state before restoring
  await createBackup(db, user)

  // Restore: overwrite portfolio data
  await db.prepare(
    'UPDATE portfolios SET data = ?, updated_at = ? WHERE user = ?'
  ).bind(backup.data, Date.now(), user).run()

  return { success: true }
}
