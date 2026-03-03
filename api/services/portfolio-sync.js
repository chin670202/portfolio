/**
 * Portfolio Sync Service
 * Syncs trade records back to the user's portfolio data in D1.
 * Migrated from server/services/portfolio-sync.js (filesystem → D1)
 */

const HOLDING_ARRAYS = ['ETF', '其它資產']

/**
 * Find a holding by symbol across all arrays.
 */
function findHolding(data, symbol) {
  for (const key of HOLDING_ARRAYS) {
    const arr = data[key]
    if (!Array.isArray(arr)) continue
    const idx = arr.findIndex(a => a['代號'] === symbol)
    if (idx >= 0) return { arrayKey: key, index: idx, entry: arr[idx] }
  }
  return null
}

/**
 * Apply a trade to the portfolio data in D1.
 * @param {D1Database} db
 */
export async function applyTradeToPortfolio(db, user, trade) {
  const row = await db.prepare('SELECT data FROM portfolios WHERE user = ?').bind(user).first()
  if (!row) {
    console.warn(`[portfolio-sync] Portfolio for ${user} not found in D1, skipping`)
    return
  }

  const data = JSON.parse(row.data)
  const { symbol, name, side, price, quantity } = trade

  const found = findHolding(data, symbol)

  if (side === 'buy') {
    if (found) {
      const old = found.entry
      const oldQty = old['持有單位'] || 0
      const oldAvg = old['買入均價'] || 0
      const newQty = oldQty + quantity
      const newAvg = newQty > 0
        ? (oldAvg * oldQty + price * quantity) / newQty
        : 0

      old['持有單位'] = newQty
      old['買入均價'] = Math.round(newAvg * 100) / 100
    } else {
      if (!data['其它資產']) data['其它資產'] = []
      data['其它資產'].push({
        '名稱': name || symbol,
        '代號': symbol,
        '買入均價': Math.round(price * 100) / 100,
        '持有單位': quantity,
      })
    }
  } else if (side === 'sell') {
    if (found) {
      const old = found.entry
      const oldQty = old['持有單位'] || 0
      const newQty = oldQty - quantity

      if (newQty <= 0) {
        data[found.arrayKey].splice(found.index, 1)
      } else {
        old['持有單位'] = newQty
      }
    }
  }

  data['資料更新日期'] = new Date().toISOString().slice(0, 10)
  await db.prepare('UPDATE portfolios SET data = ?, updated_at = ? WHERE user = ?')
    .bind(JSON.stringify(data), Date.now(), user).run()
}

/**
 * Reverse a trade from portfolio (used when deleting a trade).
 * @param {D1Database} db
 */
export async function reverseTradeFromPortfolio(db, user, trade) {
  const reversed = {
    ...trade,
    side: trade.side === 'buy' ? 'sell' : 'buy',
  }
  await applyTradeToPortfolio(db, user, reversed)
}
