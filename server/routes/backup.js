/**
 * 備份 API 路由
 * GET /backup/:user - 取得用戶備份列表
 * POST /backup/:user/restore - 還原指定備份
 */

const express = require('express');
const router = express.Router();
const backupService = require('../services/backup');

/**
 * GET /backup/:user
 * 取得用戶的備份列表
 */
router.get('/:user', async (req, res) => {
  try {
    const { user } = req.params;

    if (!user) {
      return res.status(400).json({
        success: false,
        error: '缺少用戶參數'
      });
    }

    const backups = await backupService.listBackups(user);

    res.json({
      success: true,
      user,
      backups,
      count: backups.length
    });
  } catch (err) {
    console.error('[Backup API] 取得備份列表失敗:', err);
    res.status(500).json({
      success: false,
      error: '取得備份列表失敗'
    });
  }
});

/**
 * POST /backup/:user/restore
 * 還原指定備份
 * Body: { filename: string }
 */
router.post('/:user/restore', async (req, res) => {
  try {
    const { user } = req.params;
    const { filename } = req.body;

    if (!user || !filename) {
      return res.status(400).json({
        success: false,
        error: '缺少必要參數: user, filename'
      });
    }

    console.log(`[Backup API] 還原備份: ${user} / ${filename}`);

    const result = await backupService.restoreBackup(user, filename);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || '還原失敗'
      });
    }

    res.json({
      success: true,
      message: `已還原備份: ${filename}`
    });
  } catch (err) {
    console.error('[Backup API] 還原備份失敗:', err);
    res.status(500).json({
      success: false,
      error: '還原備份失敗'
    });
  }
});

module.exports = router;
