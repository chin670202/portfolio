/**
 * Trade API Routes (Hono + D1)
 * Migrated from server/routes/trades.js
 */

import { Hono } from 'hono'
import { recalculateSymbol } from '../services/pnl-engine.js'
import { parseTrade } from '../services/trade-parser.js'
import { calculateFees } from '../services/fee-calculator.js'
import { applyTradeToPortfolio, reverseTradeFromPortfolio } from '../services/portfolio-sync.js'
import { createBackup } from '../services/backup.js'

export const tradesRoutes = new Hono()

/**
 * Lookup name from portfolio JSON in D1
 */
async function lookupNameFromPortfolio(db, user, symbol) {
  try {
    const row = await db.prepare('SELECT data FROM portfolios WHERE user = ?').bind(user).first()
    if (!row) return null
    const data = JSON.parse(row.data)
    for (const key of ['股票', 'ETF', '其它資產']) {
      const arr = data[key]
      if (!Array.isArray(arr)) continue
      const found = arr.find(a => a['代號'] === symbol)
      if (found) return found['名稱'] || found['公司名稱'] || null
    }
  } catch { /* ignore */ }
  return null
}

// Validate user param middleware
tradesRoutes.use('/:user/*', async (c, next) => {
  const user = c.req.param('user')
  if (!user || !/^[a-zA-Z0-9_-]+$/.test(user)) {
    return c.json({ error: '無效的用戶名稱' }, 400)
  }
  return next()
})
tradesRoutes.use('/:user', async (c, next) => {
  const user = c.req.param('user')
  if (!user || !/^[a-zA-Z0-9_-]+$/.test(user)) {
    return c.json({ error: '無效的用戶名稱' }, 400)
  }
  return next()
})

/**
 * GET /trades/:user - List trades with filtering, pagination, sorting
 */
tradesRoutes.get('/:user', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')
    const { assetType, symbol, side, dateFrom, dateTo,
      page = '1', limit = '50', sortBy = 'trade_date', sortOrder = 'desc'
    } = c.req.query()

    const conditions = ['user = ?']
    const params = [user]

    if (assetType) { conditions.push('asset_type = ?'); params.push(assetType) }
    if (symbol) { conditions.push('symbol LIKE ?'); params.push(`%${symbol}%`) }
    if (side) { conditions.push('side = ?'); params.push(side) }
    if (dateFrom) { conditions.push('trade_date >= ?'); params.push(dateFrom) }
    if (dateTo) { conditions.push('trade_date <= ?'); params.push(dateTo) }

    const where = conditions.join(' AND ')
    const allowedSort = ['trade_date', 'symbol', 'price', 'quantity', 'created_at']
    const sort = allowedSort.includes(sortBy) ? sortBy : 'trade_date'
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC'
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    const countRow = await db.prepare(`SELECT count(*) as count FROM trades WHERE ${where}`).bind(...params).first()
    const total = countRow.count

    const { results: trades } = await db.prepare(
      `SELECT * FROM trades WHERE ${where} ORDER BY ${sort} ${order}, id DESC LIMIT ? OFFSET ?`
    ).bind(...params, limitNum, offset).all()

    return c.json({ trades, total, page: pageNum, limit: limitNum })
  } catch (error) {
    console.error('GET trades error:', error)
    return c.json({ error: '取得交易列表失敗' }, 500)
  }
})

/**
 * GET /trades/:user/lots - Get open lots grouped by symbol
 */
tradesRoutes.get('/:user/lots', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')

    const { results: rows } = await db.prepare(`
      SELECT symbol, trade_date, remaining_qty, price
      FROM open_lots
      WHERE user = ? AND remaining_qty > 0
      ORDER BY symbol, trade_date ASC
    `).bind(user).all()

    const grouped = {}
    for (const row of rows) {
      if (!grouped[row.symbol]) grouped[row.symbol] = []
      grouped[row.symbol].push({
        trade_date: row.trade_date,
        remaining_qty: row.remaining_qty,
        price: row.price,
      })
    }
    return c.json(grouped)
  } catch (error) {
    console.error('GET lots error:', error)
    return c.json({ error: '取得持倉明細失敗' }, 500)
  }
})

/**
 * POST /trades/:user - Create a new trade
 */
tradesRoutes.post('/:user', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')
    const { tradeDate, assetType, symbol, name, side, price, quantity, fee: manualFee, tax: manualTax, notes, brokerId } = await c.req.json()

    if (!tradeDate || !assetType || !symbol || !side || price == null || quantity == null) {
      return c.json({ error: '缺少必要欄位' }, 400)
    }

    const validAssetTypes = ['tw_stock', 'us_stock', 'crypto', 'futures', 'options']
    if (!validAssetTypes.includes(assetType)) {
      return c.json({ error: '無效的商品類型' }, 400)
    }
    if (!['buy', 'sell'].includes(side)) {
      return c.json({ error: '無效的交易方向' }, 400)
    }

    // Auto-calculate fees if broker is provided and no manual fee/tax
    let fee = manualFee ?? 0
    let tax = manualTax ?? 0
    if (brokerId && manualFee == null && manualTax == null) {
      const calc = await calculateFees(db, { brokerId, assetType, price, quantity, side, symbol: symbol || '' })
      fee = calc.fee
      tax = calc.tax
    }

    const resolvedName = name || await lookupNameFromPortfolio(db, user, symbol.toUpperCase()) || null

    const now = Date.now()
    const result = await db.prepare(`
      INSERT INTO trades (user, trade_date, asset_type, symbol, name, side, price, quantity, fee, tax, notes, broker_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(user, tradeDate, assetType, symbol.toUpperCase(), resolvedName, side, price, quantity, fee, tax, notes || null, brokerId || null, now, now).run()

    const trade = await db.prepare('SELECT * FROM trades WHERE id = ?').bind(result.meta.last_row_id).first()

    // Recalculate all P&L for this symbol
    await recalculateSymbol(db, user, trade.symbol, trade.asset_type)

    // Backup before modifying portfolio
    await createBackup(db, user)

    // Sync holdings to portfolio
    await applyTradeToPortfolio(db, user, trade)

    return c.json(trade, 201)
  } catch (error) {
    console.error('POST trade error:', error)
    return c.json({ error: '新增交易失敗' }, 500)
  }
})

/**
 * DELETE /trades/:user/:id - Delete a trade and recalculate P&L
 */
tradesRoutes.delete('/:user/:id', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')
    const id = c.req.param('id')

    const existing = await db.prepare('SELECT * FROM trades WHERE id = ? AND user = ?').bind(id, user).first()
    if (!existing) {
      return c.json({ error: '找不到此交易' }, 404)
    }

    await db.prepare('DELETE FROM trades WHERE id = ? AND user = ?').bind(id, user).run()
    await recalculateSymbol(db, user, existing.symbol, existing.asset_type)

    // Reverse the trade's effect on portfolio
    await reverseTradeFromPortfolio(db, user, existing)

    return c.json({ success: true })
  } catch (error) {
    console.error('DELETE trade error:', error)
    return c.json({ error: '刪除交易失敗' }, 500)
  }
})

/**
 * POST /trades/:user/parse - Parse natural language trade description
 */
tradesRoutes.post('/:user/parse', async (c) => {
  try {
    const { input } = await c.req.json()
    if (!input || typeof input !== 'string' || !input.trim()) {
      return c.json({ error: '請輸入交易描述' }, 400)
    }
    const parsed = await parseTrade(input.trim(), c.env)
    return c.json(parsed)
  } catch (error) {
    console.error('Parse error:', error)
    return c.json({ error: error.message || '解析失敗' }, 500)
  }
})
