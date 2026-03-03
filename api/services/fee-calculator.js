/**
 * Fee Calculator - Calculates broker fees based on trade parameters
 * Migrated from server/services/fee-calculator.js (D1 async)
 */

const TW_STOCK_BASE_RATE = 0.001425 // 0.1425%
const TW_STOCK_TAX_RATE = 0.003     // 0.3% sell only
const TW_ETF_TAX_RATE = 0.001       // 0.1% sell only

/**
 * Calculate fee and tax for a Taiwan stock trade
 */
function calculateTwStockFee({ broker, price, quantity, side, isEtf = false }) {
  const tradeValue = price * quantity

  // Commission = trade value × 0.1425% × discount
  let fee = Math.round(tradeValue * TW_STOCK_BASE_RATE * broker.tw_stock_discount)
  if (fee < broker.tw_stock_min_fee) {
    fee = broker.tw_stock_min_fee
  }

  // Tax: only on sell
  let tax = 0
  if (side === 'sell') {
    const taxRate = isEtf ? TW_ETF_TAX_RATE : TW_STOCK_TAX_RATE
    tax = Math.round(tradeValue * taxRate)
  }

  return { fee, tax }
}

/**
 * Calculate fees for any asset type
 * @param {D1Database} db - D1 database binding
 */
export async function calculateFees(db, { brokerId, assetType, price, quantity, side, symbol }) {
  if (!brokerId) return { fee: 0, tax: 0 }

  const broker = await db.prepare('SELECT * FROM brokers WHERE id = ?').bind(brokerId).first()
  if (!broker) return { fee: 0, tax: 0 }

  if (assetType === 'tw_stock') {
    const isEtf = /^00\d{2}/.test(symbol)
    return calculateTwStockFee({ broker, price, quantity, side, isEtf })
  }

  if (assetType === 'us_stock') {
    if (!broker.us_stock_fee_rate) return { fee: 0, tax: 0 }
    const tradeValue = price * quantity
    let fee = parseFloat((tradeValue * broker.us_stock_fee_rate).toFixed(2))
    if (broker.us_stock_min_fee && fee < broker.us_stock_min_fee) {
      fee = broker.us_stock_min_fee
    }
    return { fee, tax: 0 }
  }

  // For crypto, futures, options — no auto-calculation yet
  return { fee: 0, tax: 0 }
}
