/**
 * 模組統計 API 路由
 * GET /modules/stats - 取得所有模組使用統計
 * GET /modules/all - 取得所有可用模組定義（含熱門度）
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../..');

/**
 * 掃描所有用戶檔案，統計各模組的使用次數
 */
async function calculateModuleStats() {
  const dataDir = path.join(PROJECT_ROOT, 'public', 'data');
  const stats = {};
  let totalUsers = 0;

  try {
    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('.'));

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(dataDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        // 跳過備份資料夾
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) continue;

        totalUsers++;

        // 統計啟用的模組
        const moduleConfig = data.模組配置;
        if (Array.isArray(moduleConfig)) {
          for (const config of moduleConfig) {
            if (config.enabled) {
              stats[config.uid] = (stats[config.uid] || 0) + 1;
            }
          }
        } else {
          // 沒有模組配置的用戶，視為使用預設模組
          const defaultModules = [
            'overseas-bonds',
            'stocks-etf',
            'other-assets',
            'loans',
            'asset-history'
          ];
          for (const uid of defaultModules) {
            stats[uid] = (stats[uid] || 0) + 1;
          }
        }
      } catch (err) {
        // 忽略單一檔案的解析錯誤
        console.warn(`[ModuleStats] 跳過檔案 ${file}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[ModuleStats] 掃描資料夾失敗:', err);
  }

  return { stats, totalUsers };
}

/**
 * GET /modules/stats
 * 取得所有模組使用統計
 */
router.get('/stats', async (req, res) => {
  try {
    const { stats, totalUsers } = await calculateModuleStats();

    res.json({
      success: true,
      stats,
      totalUsers,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[ModuleStats] 取得統計失敗:', err);
    res.status(500).json({
      success: false,
      error: '取得模組統計失敗'
    });
  }
});

/**
 * GET /modules/all
 * 取得所有可用模組定義（含熱門度）
 * 這裡返回內建模組，未來可擴充支援用戶自建模組
 */
router.get('/all', async (req, res) => {
  try {
    const { stats, totalUsers } = await calculateModuleStats();

    // 內建模組定義（與前端 moduleRegistry.js 保持同步）
    const builtInModules = [
      {
        uid: 'overseas-bonds',
        name: '海外債券',
        description: '顯示海外債券持倉，包含價格、殖利率、配息資訊',
        icon: '📈',
        category: 'investments',
        author: 'system'
      },
      {
        uid: 'stocks-etf',
        name: '股票/ETF',
        description: '顯示股票與 ETF 持倉，包含價格、損益、配息資訊',
        icon: '📊',
        category: 'investments',
        author: 'system'
      },
      {
        uid: 'other-assets',
        name: '無配息資產',
        description: '顯示美股、台股、加密貨幣等無固定配息資產',
        icon: '💰',
        category: 'investments',
        author: 'system'
      },
      {
        uid: 'loans',
        name: '貸款別',
        description: '顯示各項貸款資訊，包含餘額、利率、每月還款',
        icon: '🏦',
        category: 'liabilities',
        author: 'system'
      },
      {
        uid: 'asset-history',
        name: '資產變化記錄與趨勢圖',
        description: '顯示資產變化歷史記錄與趨勢圖表',
        icon: '📉',
        category: 'analytics',
        author: 'system'
      }
    ];

    // 附加熱門度資訊
    const modulesWithStats = builtInModules.map(module => ({
      ...module,
      usageCount: stats[module.uid] || 0
    }));

    // 依熱門度排序
    modulesWithStats.sort((a, b) => b.usageCount - a.usageCount);

    res.json({
      success: true,
      modules: modulesWithStats,
      totalUsers,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[ModuleStats] 取得模組列表失敗:', err);
    res.status(500).json({
      success: false,
      error: '取得模組列表失敗'
    });
  }
});

module.exports = router;
