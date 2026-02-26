/**
 * Fee Calculator - Calculates broker fees based on trade parameters
 *
 * Taiwan stock standard commission: 0.1425% of trade value (both buy and sell)
 * Securities transaction tax (證交稅): sell only
 *   - Stocks: 0.3%
 *   - ETFs: 0.1%
 *   - Day trade stocks: 0.15% (through 2027)
 */

const db = require('../db');

const TW_STOCK_BASE_RATE = 0.001425; // 0.1425%
const TW_STOCK_TAX_RATE = 0.003;     // 0.3% sell only
const TW_ETF_TAX_RATE = 0.001;       // 0.1% sell only

/**
 * Calculate fee and tax for a Taiwan stock trade
 * @param {Object} params
 * @param {string} params.brokerId - Broker ID
 * @param {number} params.price - Price per share
 * @param {number} params.quantity - Number of shares
 * @param {string} params.side - 'buy' or 'sell'
 * @param {boolean} [params.isEtf=false] - Whether the symbol is an ETF
 * @returns {{ fee: number, tax: number }}
 */
function calculateTwStockFee({ brokerId, price, quantity, side, isEtf = false }) {
  const broker = db.prepare('SELECT * FROM brokers WHERE id = ?').get(brokerId);
  if (!broker) {
    return { fee: 0, tax: 0 };
  }

  const tradeValue = price * quantity;

  // Commission = trade value × 0.1425% × discount
  let fee = Math.round(tradeValue * TW_STOCK_BASE_RATE * broker.tw_stock_discount);
  if (fee < broker.tw_stock_min_fee) {
    fee = broker.tw_stock_min_fee;
  }

  // Tax: only on sell
  let tax = 0;
  if (side === 'sell') {
    const taxRate = isEtf ? TW_ETF_TAX_RATE : TW_STOCK_TAX_RATE;
    tax = Math.round(tradeValue * taxRate);
  }

  return { fee, tax };
}

/**
 * Calculate fees for any asset type
 */
function calculateFees({ brokerId, assetType, price, quantity, side, symbol }) {
  if (!brokerId) return { fee: 0, tax: 0 };

  if (assetType === 'tw_stock') {
    // Simple ETF detection: 4-digit codes starting with 00 are typically ETFs
    const isEtf = /^00\d{2}/.test(symbol);
    return calculateTwStockFee({ brokerId, price, quantity, side, isEtf });
  }

  if (assetType === 'us_stock') {
    const broker = db.prepare('SELECT * FROM brokers WHERE id = ?').get(brokerId);
    if (!broker || !broker.us_stock_fee_rate) return { fee: 0, tax: 0 };

    const tradeValue = price * quantity;
    let fee = parseFloat((tradeValue * broker.us_stock_fee_rate).toFixed(2));
    if (broker.us_stock_min_fee && fee < broker.us_stock_min_fee) {
      fee = broker.us_stock_min_fee;
    }
    return { fee, tax: 0 };
  }

  // For crypto, futures, options — no auto-calculation yet
  return { fee: 0, tax: 0 };
}

module.exports = { calculateFees, calculateTwStockFee };
