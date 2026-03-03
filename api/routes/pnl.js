/**
 * P&L API Routes (Hono + D1)
 * Migrated from server/routes/pnl.js
 */

import { Hono } from 'hono'
import { recalculateSymbol } from '../services/pnl-engine.js'

export const pnlRoutes = new Hono()

/**
 * GET /pnl/:user - Get P&L records with summary
 */
pnlRoutes.get('/:user', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')
    const { symbol, assetType, dateFrom, dateTo } = c.req.query()

    const conditions = ['user = ?']
    const params = [user]

    if (symbol) { conditions.push('symbol LIKE ?'); params.push(`%${symbol}%`) }
    if (assetType) { conditions.push('asset_type = ?'); params.push(assetType) }
    if (dateFrom) { conditions.push('sell_date >= ?'); params.push(dateFrom) }
    if (dateTo) { conditions.push('sell_date <= ?'); params.push(dateTo) }

    const where = conditions.join(' AND ')
    const { results: records } = await db.prepare(
      `SELECT * FROM pnl_records WHERE ${where} ORDER BY sell_date DESC`
    ).bind(...params).all()

    const totalPnl = records.reduce((sum, r) => sum + r.realized_pnl, 0)
    const totalFees = records.reduce((sum, r) => sum + r.buy_fee + r.sell_fee + r.sell_tax, 0)
    const winCount = records.filter(r => r.realized_pnl > 0).length
    const lossCount = records.filter(r => r.realized_pnl < 0).length
    const totalClosed = winCount + lossCount

    return c.json({
      records,
      summary: {
        totalPnl,
        totalFees,
        winCount,
        lossCount,
        winRate: totalClosed > 0 ? winCount / totalClosed : 0,
      },
    })
  } catch (error) {
    console.error('GET pnl error:', error)
    return c.json({ error: '取得損益記錄失敗' }, 500)
  }
})

/**
 * POST /pnl/:user/recalculate - Recalculate all P&L for a user
 */
pnlRoutes.post('/:user/recalculate', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')

    const { results: symbols } = await db.prepare(
      'SELECT DISTINCT symbol, asset_type FROM trades WHERE user = ?'
    ).bind(user).all()

    for (const { symbol, asset_type } of symbols) {
      await recalculateSymbol(db, user, symbol, asset_type)
    }

    const { results: records } = await db.prepare(
      'SELECT * FROM pnl_records WHERE user = ? ORDER BY sell_date DESC'
    ).bind(user).all()

    return c.json({ recalculated: symbols.length, records: records.length })
  } catch (error) {
    console.error('Recalculate P&L error:', error)
    return c.json({ error: '重算損益失敗' }, 500)
  }
})
