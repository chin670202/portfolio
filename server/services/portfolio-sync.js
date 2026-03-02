/**
 * Portfolio Sync Service
 * Syncs trade records back to the user's portfolio JSON file.
 * Uses delta-based approach: each trade adds/subtracts from existing holdings.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data');

/**
 * All arrays in the JSON that may contain holdings with 代號/持有單位/買入均價
 */
const HOLDING_ARRAYS = ['ETF', '其它資產'];

/**
 * Find a holding by symbol across all arrays.
 * Returns { arrayKey, index, entry } or null.
 */
function findHolding(data, symbol) {
  for (const key of HOLDING_ARRAYS) {
    const arr = data[key];
    if (!Array.isArray(arr)) continue;
    const idx = arr.findIndex(a => a['代號'] === symbol);
    if (idx >= 0) return { arrayKey: key, index: idx, entry: arr[idx] };
  }
  return null;
}

/**
 * Apply a trade to the portfolio JSON.
 * For buy: increase holding quantity and recalculate weighted average price.
 * For sell: decrease holding quantity, remove if 0.
 */
function applyTradeToPortfolio(user, trade) {
  const jsonPath = path.join(DATA_DIR, `${user}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.warn(`[portfolio-sync] ${jsonPath} not found, skipping`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const { symbol, name, side, price, quantity } = trade;

  const found = findHolding(data, symbol);

  if (side === 'buy') {
    if (found) {
      // Existing holding: update weighted average and quantity
      const old = found.entry;
      const oldQty = old['持有單位'] || 0;
      const oldAvg = old['買入均價'] || 0;
      const newQty = oldQty + quantity;
      const newAvg = newQty > 0
        ? (oldAvg * oldQty + price * quantity) / newQty
        : 0;

      old['持有單位'] = newQty;
      old['買入均價'] = Math.round(newAvg * 100) / 100;
      console.log(`[portfolio-sync] ${user}: ${symbol} buy +${quantity} → ${newQty} units @ ${newAvg.toFixed(2)} (in ${found.arrayKey})`);
    } else {
      // New holding: add to 其它資產
      if (!data['其它資產']) data['其它資產'] = [];
      data['其它資產'].push({
        '名稱': name || symbol,
        '代號': symbol,
        '買入均價': Math.round(price * 100) / 100,
        '持有單位': quantity,
      });
      console.log(`[portfolio-sync] ${user}: ${symbol} new holding ${quantity} units @ ${price} (in 其它資產)`);
    }
  } else if (side === 'sell') {
    if (found) {
      const old = found.entry;
      const oldQty = old['持有單位'] || 0;
      const newQty = oldQty - quantity;

      if (newQty <= 0) {
        // Fully sold: remove from array
        data[found.arrayKey].splice(found.index, 1);
        console.log(`[portfolio-sync] ${user}: ${symbol} fully sold, removed from ${found.arrayKey}`);
      } else {
        old['持有單位'] = newQty;
        // Average price stays the same on sell
        console.log(`[portfolio-sync] ${user}: ${symbol} sell -${quantity} → ${newQty} units (in ${found.arrayKey})`);
      }
    } else {
      console.warn(`[portfolio-sync] ${user}: ${symbol} sell but not found in portfolio, skipping`);
    }
  }

  data['資料更新日期'] = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Reverse a trade from the portfolio JSON (used when deleting a trade).
 * Buy deletion → subtract quantity. Sell deletion → add quantity back.
 */
function reverseTradeFromPortfolio(user, trade) {
  const reversed = {
    ...trade,
    side: trade.side === 'buy' ? 'sell' : 'buy',
  };
  applyTradeToPortfolio(user, reversed);
}

module.exports = { applyTradeToPortfolio, reverseTradeFromPortfolio };
