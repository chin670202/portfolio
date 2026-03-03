/**
 * Stats API Routes (Hono + D1)
 * Migrated from server/routes/stats.js
 */

import { Hono } from 'hono'

export const statsRoutes = new Hono()

/**
 * GET /stats/:user - Get comprehensive trading statistics
 */
statsRoutes.get('/:user', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')

    const { results: allPnl } = await db.prepare('SELECT * FROM pnl_records WHERE user = ?').bind(user).all()
    const wins = allPnl.filter(r => r.realized_pnl > 0)
    const losses = allPnl.filter(r => r.realized_pnl < 0)

    const totalRealizedPnl = allPnl.reduce((sum, r) => sum + r.realized_pnl, 0)
    const totalTradesRow = await db.prepare('SELECT count(*) as count FROM trades WHERE user = ?').bind(user).first()
    const openPosRow = await db.prepare(
      'SELECT count(distinct symbol) as count FROM open_lots WHERE user = ? AND remaining_qty > 0'
    ).bind(user).first()

    const winCount = wins.length
    const lossCount = losses.length
    const totalClosed = winCount + lossCount

    // P&L by month
    const pnlByMonthMap = {}
    for (const record of allPnl) {
      const month = record.sell_date.substring(0, 7)
      pnlByMonthMap[month] = (pnlByMonthMap[month] || 0) + record.realized_pnl
    }
    const pnlByMonth = Object.entries(pnlByMonthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, pnl]) => ({ month, pnl }))

    // P&L by asset type
    const pnlByAssetType = {}
    for (const record of allPnl) {
      pnlByAssetType[record.asset_type] = (pnlByAssetType[record.asset_type] || 0) + record.realized_pnl
    }

    return c.json({
      totalRealizedPnl,
      totalTrades: totalTradesRow.count,
      winCount,
      lossCount,
      winRate: totalClosed > 0 ? winCount / totalClosed : 0,
      avgWin: winCount > 0 ? wins.reduce((s, r) => s + r.realized_pnl, 0) / winCount : 0,
      avgLoss: lossCount > 0 ? losses.reduce((s, r) => s + r.realized_pnl, 0) / lossCount : 0,
      largestWin: wins.length > 0 ? Math.max(...wins.map(r => r.realized_pnl)) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map(r => r.realized_pnl)) : 0,
      openPositionCount: openPosRow.count,
      pnlByAssetType,
      pnlByMonth,
    })
  } catch (error) {
    console.error('GET stats error:', error)
    return c.json({ error: '取得統計資料失敗' }, 500)
  }
})
