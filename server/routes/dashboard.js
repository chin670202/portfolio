/**
 * 儀表板 API 路由
 * GET /dashboard/:user/compiled - 取得編譯後的用戶儀表板
 * GET /dashboard/:user/raw - 取得原始 Vue 內容
 * GET /dashboard/:user/backups - 列出備份
 * POST /dashboard/:user/restore - 還原備份
 */

const express = require('express')
const router = express.Router()
const vueCompiler = require('../services/vue-compiler')
const dashboardBackup = require('../services/dashboard-backup')

/**
 * GET /:user/compiled
 * 取得編譯後的用戶儀表板
 */
router.get('/:user/compiled', async (req, res) => {
  try {
    const { user } = req.params

    const result = await vueCompiler.compileUserDashboard(user)

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: '編譯儀表板失敗',
        details: result.errors
      })
    }

    res.json({
      success: true,
      user,
      compiled: result.compiled,
      raw: result.raw
    })

  } catch (err) {
    console.error('[Dashboard API] 取得儀表板失敗:', err)
    res.status(500).json({
      success: false,
      error: '取得儀表板失敗'
    })
  }
})

/**
 * GET /:user/raw
 * 取得原始 Vue 內容
 */
router.get('/:user/raw', async (req, res) => {
  try {
    const { user } = req.params

    const content = await vueCompiler.getUserDashboardRaw(user)

    res.json({
      success: true,
      user,
      content
    })

  } catch (err) {
    console.error('[Dashboard API] 取得原始內容失敗:', err)
    res.status(500).json({
      success: false,
      error: '取得儀表板失敗'
    })
  }
})

/**
 * GET /:user/backups
 * 列出用戶的儀表板備份
 */
router.get('/:user/backups', async (req, res) => {
  try {
    const { user } = req.params

    const backups = await dashboardBackup.listBackups(user)

    res.json({
      success: true,
      user,
      backups
    })

  } catch (err) {
    console.error('[Dashboard API] 列出備份失敗:', err)
    res.status(500).json({
      success: false,
      error: '列出備份失敗'
    })
  }
})

/**
 * POST /:user/restore
 * 還原儀表板備份
 */
router.post('/:user/restore', async (req, res) => {
  try {
    const { user } = req.params
    const { filename } = req.body

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: '缺少備份檔名'
      })
    }

    const result = await dashboardBackup.restoreBackup(user, filename)

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      })
    }

    res.json({
      success: true,
      message: `已還原備份 ${filename}`
    })

  } catch (err) {
    console.error('[Dashboard API] 還原備份失敗:', err)
    res.status(500).json({
      success: false,
      error: '還原備份失敗'
    })
  }
})

module.exports = router
