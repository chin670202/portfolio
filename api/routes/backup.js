/**
 * Backup API Routes (Hono + D1)
 * Migrated from server/routes/backup.js
 */

import { Hono } from 'hono'
import { listBackups, getBackupData, restoreBackup } from '../services/backup.js'

export const backupRoutes = new Hono()

/**
 * GET /backup/:user - List backups
 */
backupRoutes.get('/:user', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')

    if (!user) {
      return c.json({ success: false, error: '缺少用戶參數' }, 400)
    }

    const backups = await listBackups(db, user)

    return c.json({
      success: true,
      user,
      backups,
      count: backups.length
    })
  } catch (error) {
    console.error('[Backup API] Error:', error)
    return c.json({ success: false, error: '取得備份列表失敗' }, 500)
  }
})

/**
 * GET /backup/:user/:filename - Get a single backup's data for preview
 */
backupRoutes.get('/:user/:filename', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')
    const filename = c.req.param('filename')

    const result = await getBackupData(db, user, filename)

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 404)
    }

    return c.json({
      success: true,
      filename,
      date: result.date,
      time: result.time,
      data: result.data
    })
  } catch (error) {
    console.error('[Backup API] Get backup data error:', error)
    return c.json({ success: false, error: '取得備份資料失敗' }, 500)
  }
})

/**
 * POST /backup/:user/restore - Restore a backup
 */
backupRoutes.post('/:user/restore', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')
    const { filename } = await c.req.json()

    if (!user || !filename) {
      return c.json({ success: false, error: '缺少必要參數: user, filename' }, 400)
    }

    const result = await restoreBackup(db, user, filename)

    if (!result.success) {
      return c.json({ success: false, error: result.error || '還原失敗' }, 400)
    }

    return c.json({ success: true, message: `已還原備份: ${filename}` })
  } catch (error) {
    console.error('[Backup API] Restore error:', error)
    return c.json({ success: false, error: '還原備份失敗' }, 500)
  }
})
