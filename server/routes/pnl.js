/**
 * P&L API Routes
 * Query realized P&L records with summary statistics
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { recalculateSymbol } = require('../services/pnl-engine');
/**
 * GET /pnl/:user - Get P&L records with summary
 */
router.get('/:user', (req, res) => {
  try {
    const { user } = req.params;
    const { symbol, assetType, dateFrom, dateTo } = req.query;

    const conditions = ['user = ?'];
    const params = [user];

    if (symbol) { conditions.push('symbol LIKE ?'); params.push(`%${symbol}%`); }
    if (assetType) { conditions.push('asset_type = ?'); params.push(assetType); }
    if (dateFrom) { conditions.push('sell_date >= ?'); params.push(dateFrom); }
    if (dateTo) { conditions.push('sell_date <= ?'); params.push(dateTo); }

    const where = conditions.join(' AND ');
    const records = db.prepare(
      `SELECT * FROM pnl_records WHERE ${where} ORDER BY sell_date DESC`
    ).all(...params);

    const totalPnl = records.reduce((sum, r) => sum + r.realized_pnl, 0);
    const totalFees = records.reduce((sum, r) => sum + r.buy_fee + r.sell_fee + r.sell_tax, 0);
    const winCount = records.filter(r => r.realized_pnl > 0).length;
    const lossCount = records.filter(r => r.realized_pnl < 0).length;
    const totalClosed = winCount + lossCount;

    res.json({
      records,
      summary: {
        totalPnl,
        totalFees,
        winCount,
        lossCount,
        winRate: totalClosed > 0 ? winCount / totalClosed : 0,
      },
    });
  } catch (error) {
    console.error('GET pnl error:', error);
    res.status(500).json({ error: '取得損益記錄失敗' });
  }
});

/**
 * POST /pnl/:user/recalculate - Recalculate all P&L for a user
 */
router.post('/:user/recalculate', (req, res) => {
  try {
    const { user } = req.params;

    // Get all unique symbol + asset_type combinations
    const symbols = db.prepare(`
      SELECT DISTINCT symbol, asset_type FROM trades WHERE user = ?
    `).all(user);

    for (const { symbol, asset_type } of symbols) {
      recalculateSymbol(user, symbol, asset_type);
    }

    const records = db.prepare(
      'SELECT * FROM pnl_records WHERE user = ? ORDER BY sell_date DESC'
    ).all(user);

    res.json({ recalculated: symbols.length, records: records.length });
  } catch (error) {
    console.error('Recalculate P&L error:', error);
    res.status(500).json({ error: '重算損益失敗' });
  }
});

module.exports = router;
