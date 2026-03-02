/**
 * Trade API Routes
 * CRUD operations for trade records with per-user isolation
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { processBuyTrade, processSellTrade, recalculateSymbol } = require('../services/pnl-engine');
const { parseTrade } = require('../services/trade-parser');
const { calculateFees } = require('../services/fee-calculator');
const { applyTradeToPortfolio, reverseTradeFromPortfolio } = require('../services/portfolio-sync');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data');

/**
 * 從用戶 portfolio JSON 查找商品名稱
 */
function lookupNameFromPortfolio(user, symbol) {
  try {
    const jsonPath = path.join(DATA_DIR, `${user}.json`);
    if (!fs.existsSync(jsonPath)) return null;
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    for (const key of ['股票', 'ETF', '其它資產']) {
      const arr = data[key];
      if (!Array.isArray(arr)) continue;
      const found = arr.find(a => a['代號'] === symbol);
      if (found) return found['名稱'] || found['公司名稱'] || null;
    }
  } catch { /* ignore */ }
  return null;
}

// Validate user param
function validateUser(req, res, next) {
  const { user } = req.params;
  if (!user || !/^[a-zA-Z0-9_-]+$/.test(user)) {
    return res.status(400).json({ error: '無效的用戶名稱' });
  }
  next();
}

/**
 * GET /trades/:user - List trades with filtering, pagination, sorting
 */
router.get('/:user', validateUser, (req, res) => {
  try {
    const { user } = req.params;
    const {
      assetType, symbol, side, dateFrom, dateTo,
      page = 1, limit = 50, sortBy = 'trade_date', sortOrder = 'desc'
    } = req.query;

    const conditions = ['user = ?'];
    const params = [user];

    if (assetType) { conditions.push('asset_type = ?'); params.push(assetType); }
    if (symbol) { conditions.push('symbol LIKE ?'); params.push(`%${symbol}%`); }
    if (side) { conditions.push('side = ?'); params.push(side); }
    if (dateFrom) { conditions.push('trade_date >= ?'); params.push(dateFrom); }
    if (dateTo) { conditions.push('trade_date <= ?'); params.push(dateTo); }

    const where = conditions.join(' AND ');
    const allowedSort = ['trade_date', 'symbol', 'price', 'quantity', 'created_at'];
    const sort = allowedSort.includes(sortBy) ? sortBy : 'trade_date';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const total = db.prepare(`SELECT count(*) as count FROM trades WHERE ${where}`).get(...params).count;
    const trades = db.prepare(
      `SELECT * FROM trades WHERE ${where} ORDER BY ${sort} ${order}, id DESC LIMIT ? OFFSET ?`
    ).all(...params, limitNum, offset);

    res.json({ trades, total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('GET trades error:', error);
    res.status(500).json({ error: '取得交易列表失敗' });
  }
});

/**
 * POST /trades/:user - Create a new trade
 */
router.post('/:user', validateUser, (req, res) => {
  try {
    const { user } = req.params;
    const { tradeDate, assetType, symbol, name, side, price, quantity, fee: manualFee, tax: manualTax, notes, brokerId } = req.body;

    if (!tradeDate || !assetType || !symbol || !side || price == null || quantity == null) {
      return res.status(400).json({ error: '缺少必要欄位' });
    }

    const validAssetTypes = ['tw_stock', 'us_stock', 'crypto', 'futures', 'options'];
    if (!validAssetTypes.includes(assetType)) {
      return res.status(400).json({ error: '無效的商品類型' });
    }
    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({ error: '無效的交易方向' });
    }

    // Auto-calculate fees if broker is provided and no manual fee/tax
    let fee = manualFee ?? 0;
    let tax = manualTax ?? 0;
    if (brokerId && manualFee == null && manualTax == null) {
      const calc = calculateFees({ brokerId, assetType, price, quantity, side, symbol: symbol || '' });
      fee = calc.fee;
      tax = calc.tax;
    }

    // 如果沒有名稱，從 portfolio JSON 查找
    const resolvedName = name || lookupNameFromPortfolio(user, symbol.toUpperCase()) || null;

    const now = Date.now();
    const result = db.prepare(`
      INSERT INTO trades (user, trade_date, asset_type, symbol, name, side, price, quantity, fee, tax, notes, broker_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user, tradeDate, assetType, symbol.toUpperCase(), resolvedName, side, price, quantity, fee, tax, notes || null, brokerId || null, now, now);

    const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(result.lastInsertRowid);

    // Recalculate all P&L for this symbol (handles out-of-order entry: sell before buy)
    recalculateSymbol(user, trade.symbol, trade.asset_type);

    // Sync holdings to portfolio JSON
    applyTradeToPortfolio(user, trade);

    res.status(201).json(trade);
  } catch (error) {
    console.error('POST trade error:', error);
    res.status(500).json({ error: '新增交易失敗' });
  }
});

/**
 * DELETE /trades/:user/:id - Delete a trade and recalculate P&L
 */
router.delete('/:user/:id', validateUser, (req, res) => {
  try {
    const { user, id } = req.params;
    const existing = db.prepare('SELECT * FROM trades WHERE id = ? AND user = ?').get(id, user);

    if (!existing) {
      return res.status(404).json({ error: '找不到此交易' });
    }

    db.prepare('DELETE FROM trades WHERE id = ? AND user = ?').run(id, user);
    recalculateSymbol(user, existing.symbol, existing.asset_type);

    // Reverse the trade's effect on portfolio JSON
    reverseTradeFromPortfolio(user, existing);

    res.json({ success: true });
  } catch (error) {
    console.error('DELETE trade error:', error);
    res.status(500).json({ error: '刪除交易失敗' });
  }
});

/**
 * POST /trades/:user/parse - Parse natural language trade description
 */
router.post('/:user/parse', validateUser, async (req, res) => {
  try {
    const { input } = req.body;
    if (!input || typeof input !== 'string' || !input.trim()) {
      return res.status(400).json({ error: '請輸入交易描述' });
    }
    const parsed = await parseTrade(input.trim());
    res.json(parsed);
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: error.message || '解析失敗' });
  }
});

module.exports = router;
