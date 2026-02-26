/**
 * Broker API Routes
 * Manages broker data and user broker preferences
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateFees } = require('../services/fee-calculator');

/**
 * GET /brokers - List all brokers
 */
router.get('/', (req, res) => {
  try {
    const brokers = db.prepare('SELECT * FROM brokers ORDER BY sort_order ASC').all();
    res.json(brokers);
  } catch (error) {
    console.error('GET brokers error:', error);
    res.status(500).json({ error: '取得券商列表失敗' });
  }
});

/**
 * GET /brokers/user/:user/default - Get user's default broker
 */
router.get('/user/:user/default', (req, res) => {
  try {
    const { user } = req.params;
    const setting = db.prepare(
      "SELECT value FROM user_settings WHERE user = ? AND key = 'default_broker'"
    ).get(user);

    if (!setting) {
      return res.json({ brokerId: null });
    }

    const broker = db.prepare('SELECT * FROM brokers WHERE id = ?').get(setting.value);
    res.json({ brokerId: setting.value, broker: broker || null });
  } catch (error) {
    console.error('GET default broker error:', error);
    res.status(500).json({ error: '取得預設券商失敗' });
  }
});

/**
 * PUT /brokers/user/:user/default - Set user's default broker
 */
router.put('/user/:user/default', (req, res) => {
  try {
    const { user } = req.params;
    const { brokerId } = req.body;

    if (!brokerId) {
      return res.status(400).json({ error: '缺少券商ID' });
    }

    const broker = db.prepare('SELECT * FROM brokers WHERE id = ?').get(brokerId);
    if (!broker) {
      return res.status(404).json({ error: '找不到此券商' });
    }

    db.prepare(`
      INSERT INTO user_settings (user, key, value, updated_at)
      VALUES (?, 'default_broker', ?, ?)
      ON CONFLICT(user, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(user, brokerId, Date.now());

    res.json({ brokerId, broker });
  } catch (error) {
    console.error('PUT default broker error:', error);
    res.status(500).json({ error: '設定預設券商失敗' });
  }
});

/**
 * POST /brokers/calculate-fee - Calculate fees for a trade
 */
router.post('/calculate-fee', (req, res) => {
  try {
    const { brokerId, assetType, price, quantity, side, symbol } = req.body;

    if (!brokerId || !assetType || price == null || quantity == null || !side) {
      return res.status(400).json({ error: '缺少必要參數' });
    }

    const result = calculateFees({ brokerId, assetType, price, quantity, side, symbol: symbol || '' });
    res.json(result);
  } catch (error) {
    console.error('Calculate fee error:', error);
    res.status(500).json({ error: '計算手續費失敗' });
  }
});

module.exports = router;
