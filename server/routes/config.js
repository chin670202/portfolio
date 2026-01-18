/**
 * 用戶配置 API 路由
 * GET /config/:user/modules - 取得用戶模組配置
 * PUT /config/:user/modules - 更新用戶模組配置
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../..');

/**
 * GET /config/:user/modules
 * 取得用戶的模組配置
 */
router.get('/:user/modules', async (req, res) => {
  try {
    const { user } = req.params;

    if (!user) {
      return res.status(400).json({
        success: false,
        error: '缺少用戶參數'
      });
    }

    const jsonPath = path.join(PROJECT_ROOT, 'public', 'data', `${user}.json`);

    try {
      const content = await fs.readFile(jsonPath, 'utf-8');
      const data = JSON.parse(content);

      res.json({
        success: true,
        user,
        moduleConfig: data.模組配置 || null
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: `找不到用戶 ${user} 的資料`
        });
      }
      throw err;
    }
  } catch (err) {
    console.error('[Config API] 取得模組配置失敗:', err);
    res.status(500).json({
      success: false,
      error: '取得模組配置失敗'
    });
  }
});

/**
 * PUT /config/:user/modules
 * 更新用戶的模組配置
 * Body: { moduleConfig: Array }
 */
router.put('/:user/modules', async (req, res) => {
  try {
    const { user } = req.params;
    const { moduleConfig } = req.body;

    if (!user) {
      return res.status(400).json({
        success: false,
        error: '缺少用戶參數'
      });
    }

    if (!moduleConfig || !Array.isArray(moduleConfig)) {
      return res.status(400).json({
        success: false,
        error: '無效的模組配置格式'
      });
    }

    const jsonPath = path.join(PROJECT_ROOT, 'public', 'data', `${user}.json`);

    try {
      // 讀取現有資料
      const content = await fs.readFile(jsonPath, 'utf-8');
      const data = JSON.parse(content);

      // 更新模組配置
      data.模組配置 = moduleConfig;

      // 寫回檔案
      await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf-8');

      console.log(`[Config API] 用戶 ${user} 模組配置已更新`);

      res.json({
        success: true,
        message: '模組配置已更新'
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: `找不到用戶 ${user} 的資料`
        });
      }
      throw err;
    }
  } catch (err) {
    console.error('[Config API] 更新模組配置失敗:', err);
    res.status(500).json({
      success: false,
      error: '更新模組配置失敗'
    });
  }
});

module.exports = router;
