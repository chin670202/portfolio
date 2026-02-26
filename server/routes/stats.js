/**
 * Stats API Routes
 * Aggregated trading statistics per user
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /stats/:user - Get comprehensive trading statistics
 */
router.get('/:user', (req, res) => {
  try {
    const { user } = req.params;

    const allPnl = db.prepare('SELECT * FROM pnl_records WHERE user = ?').all(user);
    const wins = allPnl.filter(r => r.realized_pnl > 0);
    const losses = allPnl.filter(r => r.realized_pnl < 0);

    const totalRealizedPnl = allPnl.reduce((sum, r) => sum + r.realized_pnl, 0);
    const totalTrades = db.prepare('SELECT count(*) as count FROM trades WHERE user = ?').get(user).count;
    const openPositionCount = db.prepare(
      'SELECT count(distinct symbol) as count FROM open_lots WHERE user = ? AND remaining_qty > 0'
    ).get(user).count;

    const winCount = wins.length;
    const lossCount = losses.length;
    const totalClosed = winCount + lossCount;

    // P&L by month
    const pnlByMonthMap = {};
    for (const record of allPnl) {
      const month = record.sell_date.substring(0, 7);
      pnlByMonthMap[month] = (pnlByMonthMap[month] || 0) + record.realized_pnl;
    }
    const pnlByMonth = Object.entries(pnlByMonthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, pnl]) => ({ month, pnl }));

    // P&L by asset type
    const pnlByAssetType = {};
    for (const record of allPnl) {
      pnlByAssetType[record.asset_type] = (pnlByAssetType[record.asset_type] || 0) + record.realized_pnl;
    }

    res.json({
      totalRealizedPnl,
      totalTrades,
      winCount,
      lossCount,
      winRate: totalClosed > 0 ? winCount / totalClosed : 0,
      avgWin: winCount > 0 ? wins.reduce((s, r) => s + r.realized_pnl, 0) / winCount : 0,
      avgLoss: lossCount > 0 ? losses.reduce((s, r) => s + r.realized_pnl, 0) / lossCount : 0,
      largestWin: wins.length > 0 ? Math.max(...wins.map(r => r.realized_pnl)) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map(r => r.realized_pnl)) : 0,
      openPositionCount,
      pnlByAssetType,
      pnlByMonth,
    });
  } catch (error) {
    console.error('GET stats error:', error);
    res.status(500).json({ error: '取得統計資料失敗' });
  }
});

module.exports = router;
