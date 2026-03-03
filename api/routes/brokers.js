/**
 * Broker API Routes (Hono + D1)
 * Migrated from server/routes/brokers.js
 */

import { Hono } from 'hono'
import { calculateFees } from '../services/fee-calculator.js'

export const brokersRoutes = new Hono()

/**
 * GET /brokers - List all brokers
 */
brokersRoutes.get('/', async (c) => {
  try {
    const db = c.env.DB
    const { results: brokers } = await db.prepare('SELECT * FROM brokers ORDER BY sort_order ASC').all()
    return c.json(brokers)
  } catch (error) {
    console.error('GET brokers error:', error)
    return c.json({ error: '取得券商列表失敗' }, 500)
  }
})

/**
 * GET /brokers/user/:user/default - Get user's default broker
 */
brokersRoutes.get('/user/:user/default', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')

    const setting = await db.prepare(
      "SELECT value FROM user_settings WHERE user = ? AND key = 'default_broker'"
    ).bind(user).first()

    if (!setting) {
      return c.json({ brokerId: null })
    }

    const broker = await db.prepare('SELECT * FROM brokers WHERE id = ?').bind(setting.value).first()
    return c.json({ brokerId: setting.value, broker: broker || null })
  } catch (error) {
    console.error('GET default broker error:', error)
    return c.json({ error: '取得預設券商失敗' }, 500)
  }
})

/**
 * PUT /brokers/user/:user/default - Set user's default broker
 */
brokersRoutes.put('/user/:user/default', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')
    const { brokerId } = await c.req.json()

    if (!brokerId) {
      return c.json({ error: '缺少券商ID' }, 400)
    }

    const broker = await db.prepare('SELECT * FROM brokers WHERE id = ?').bind(brokerId).first()
    if (!broker) {
      return c.json({ error: '找不到此券商' }, 404)
    }

    await db.prepare(`
      INSERT INTO user_settings (user, key, value, updated_at)
      VALUES (?, 'default_broker', ?, ?)
      ON CONFLICT(user, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).bind(user, brokerId, Date.now()).run()

    return c.json({ brokerId, broker })
  } catch (error) {
    console.error('PUT default broker error:', error)
    return c.json({ error: '設定預設券商失敗' }, 500)
  }
})

/**
 * POST /brokers/calculate-fee - Calculate fees for a trade
 */
brokersRoutes.post('/calculate-fee', async (c) => {
  try {
    const db = c.env.DB
    const { brokerId, assetType, price, quantity, side, symbol } = await c.req.json()

    if (!brokerId || !assetType || price == null || quantity == null || !side) {
      return c.json({ error: '缺少必要參數' }, 400)
    }

    const result = await calculateFees(db, { brokerId, assetType, price, quantity, side, symbol: symbol || '' })
    return c.json(result)
  } catch (error) {
    console.error('Calculate fee error:', error)
    return c.json({ error: '計算手續費失敗' }, 500)
  }
})
