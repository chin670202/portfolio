/**
 * P&L Engine - FIFO lot matching and realized P&L calculation
 * Ported from trade-history/src/lib/pnl-engine.ts
 */

const db = require('../db');

/**
 * Process a buy trade - creates an open lot entry
 */
function processBuyTrade(tradeId) {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(tradeId);
  if (!trade || trade.side !== 'buy') return;

  db.prepare(`
    INSERT INTO open_lots (user, trade_id, symbol, asset_type, remaining_qty, original_qty, price, fee, trade_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trade.user, trade.id, trade.symbol, trade.asset_type,
    trade.quantity, trade.quantity, trade.price, trade.fee, trade.trade_date
  );
}

/**
 * Process a sell trade - FIFO matching against open lots
 */
function processSellTrade(tradeId) {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(tradeId);
  if (!trade || trade.side !== 'sell') return;

  const lots = db.prepare(`
    SELECT * FROM open_lots
    WHERE user = ? AND symbol = ? AND asset_type = ? AND remaining_qty > 0
    ORDER BY trade_date ASC, id ASC
  `).all(trade.user, trade.symbol, trade.asset_type);

  let remainingToSell = trade.quantity;

  for (const lot of lots) {
    if (remainingToSell <= 0) break;

    const matchQty = Math.min(lot.remaining_qty, remainingToSell);

    // Prorate fees and taxes based on matched quantity
    const buyFeeProrated = lot.fee * (matchQty / lot.original_qty);
    const sellFeeProrated = trade.fee * (matchQty / trade.quantity);
    const sellTaxProrated = trade.tax * (matchQty / trade.quantity);

    // Calculate realized P&L
    const pnl = (trade.price - lot.price) * matchQty - buyFeeProrated - sellFeeProrated - sellTaxProrated;

    db.prepare(`
      INSERT INTO pnl_records (user, sell_trade_id, buy_trade_id, symbol, asset_type,
        matched_qty, buy_price, sell_price, buy_fee, sell_fee, sell_tax,
        realized_pnl, buy_date, sell_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      trade.user, trade.id, lot.trade_id, trade.symbol, trade.asset_type,
      matchQty, lot.price, trade.price, buyFeeProrated, sellFeeProrated, sellTaxProrated,
      pnl, lot.trade_date, trade.trade_date
    );

    // Update remaining quantity in open lot
    db.prepare('UPDATE open_lots SET remaining_qty = ? WHERE id = ?')
      .run(lot.remaining_qty - matchQty, lot.id);

    remainingToSell -= matchQty;
  }

  if (remainingToSell > 0) {
    console.warn(`[P&L] Warning: Sell ${trade.symbol} has ${remainingToSell} unmatched quantity`);
  }
}

/**
 * Recalculate all P&L for a given symbol
 * Used after trade deletion or modification
 */
function recalculateSymbol(user, symbol, assetType) {
  const symbolTrades = db.prepare(`
    SELECT * FROM trades
    WHERE user = ? AND symbol = ? AND asset_type = ?
    ORDER BY trade_date ASC, id ASC
  `).all(user, symbol, assetType);

  // Delete existing records for these trades
  for (const trade of symbolTrades) {
    db.prepare('DELETE FROM pnl_records WHERE sell_trade_id = ? OR buy_trade_id = ?')
      .run(trade.id, trade.id);
    db.prepare('DELETE FROM open_lots WHERE trade_id = ?').run(trade.id);
  }

  // Re-process all trades in chronological order
  for (const trade of symbolTrades) {
    if (trade.side === 'buy') {
      processBuyTrade(trade.id);
    } else {
      processSellTrade(trade.id);
    }
  }
}

module.exports = { processBuyTrade, processSellTrade, recalculateSymbol };
