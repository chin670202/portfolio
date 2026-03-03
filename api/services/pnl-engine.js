/**
 * P&L Engine - FIFO lot matching and realized P&L calculation
 * Migrated from server/services/pnl-engine.js (D1 async)
 */

/**
 * Process a buy trade - creates an open lot entry
 * @param {D1Database} db
 */
async function processBuyTrade(db, tradeId) {
  const trade = await db.prepare('SELECT * FROM trades WHERE id = ?').bind(tradeId).first()
  if (!trade || trade.side !== 'buy') return

  await db.prepare(`
    INSERT INTO open_lots (user, trade_id, symbol, asset_type, remaining_qty, original_qty, price, fee, trade_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    trade.user, trade.id, trade.symbol, trade.asset_type,
    trade.quantity, trade.quantity, trade.price, trade.fee, trade.trade_date
  ).run()
}

/**
 * Process a sell trade - FIFO matching against open lots
 * @param {D1Database} db
 */
async function processSellTrade(db, tradeId) {
  const trade = await db.prepare('SELECT * FROM trades WHERE id = ?').bind(tradeId).first()
  if (!trade || trade.side !== 'sell') return

  const { results: lots } = await db.prepare(`
    SELECT * FROM open_lots
    WHERE user = ? AND symbol = ? AND asset_type = ? AND remaining_qty > 0
    ORDER BY trade_date ASC, id ASC
  `).bind(trade.user, trade.symbol, trade.asset_type).all()

  let remainingToSell = trade.quantity

  for (const lot of lots) {
    if (remainingToSell <= 0) break

    const matchQty = Math.min(lot.remaining_qty, remainingToSell)

    // Prorate fees and taxes based on matched quantity
    const buyFeeProrated = lot.fee * (matchQty / lot.original_qty)
    const sellFeeProrated = trade.fee * (matchQty / trade.quantity)
    const sellTaxProrated = trade.tax * (matchQty / trade.quantity)

    // Calculate realized P&L
    const pnl = (trade.price - lot.price) * matchQty - buyFeeProrated - sellFeeProrated - sellTaxProrated

    await db.prepare(`
      INSERT INTO pnl_records (user, sell_trade_id, buy_trade_id, symbol, asset_type,
        matched_qty, buy_price, sell_price, buy_fee, sell_fee, sell_tax,
        realized_pnl, buy_date, sell_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      trade.user, trade.id, lot.trade_id, trade.symbol, trade.asset_type,
      matchQty, lot.price, trade.price, buyFeeProrated, sellFeeProrated, sellTaxProrated,
      pnl, lot.trade_date, trade.trade_date
    ).run()

    // Update remaining quantity in open lot
    await db.prepare('UPDATE open_lots SET remaining_qty = ? WHERE id = ?')
      .bind(lot.remaining_qty - matchQty, lot.id).run()

    remainingToSell -= matchQty
  }

  if (remainingToSell > 0) {
    console.warn(`[P&L] Warning: Sell ${trade.symbol} has ${remainingToSell} unmatched quantity`)
  }
}

/**
 * Recalculate all P&L for a given symbol
 * @param {D1Database} db
 */
export async function recalculateSymbol(db, user, symbol, assetType) {
  const { results: symbolTrades } = await db.prepare(`
    SELECT * FROM trades
    WHERE user = ? AND symbol = ? AND asset_type = ?
    ORDER BY trade_date ASC, id ASC
  `).bind(user, symbol, assetType).all()

  // Delete existing records for these trades (batch in chunks of 50)
  for (let i = 0; i < symbolTrades.length; i += 25) {
    const chunk = symbolTrades.slice(i, i + 25)
    const stmts = []
    for (const trade of chunk) {
      stmts.push(
        db.prepare('DELETE FROM pnl_records WHERE sell_trade_id = ? OR buy_trade_id = ?').bind(trade.id, trade.id),
        db.prepare('DELETE FROM open_lots WHERE trade_id = ?').bind(trade.id)
      )
    }
    if (stmts.length > 0) await db.batch(stmts)
  }

  // Re-process all trades in chronological order
  for (const trade of symbolTrades) {
    if (trade.side === 'buy') {
      await processBuyTrade(db, trade.id)
    } else {
      await processSellTrade(db, trade.id)
    }
  }
}
