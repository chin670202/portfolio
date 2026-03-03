/**
 * Portfolio API Routes (Hono + D1)
 * New route: serves portfolio JSON data from D1 instead of static files
 */

import { Hono } from 'hono'

export const portfolioRoutes = new Hono()

/**
 * GET /portfolio/:user - Get portfolio data
 */
portfolioRoutes.get('/:user', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')

    const row = await db.prepare('SELECT data FROM portfolios WHERE user = ?').bind(user).first()
    if (!row) {
      return c.json({ error: `找不到使用者 "${user}" 的資料` }, 404)
    }

    return c.json(JSON.parse(row.data))
  } catch (error) {
    console.error('GET portfolio error:', error)
    return c.json({ error: '取得投資組合資料失敗' }, 500)
  }
})

/**
 * PUT /portfolio/:user - Update portfolio data
 */
portfolioRoutes.put('/:user', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')
    const data = await c.req.json()

    await db.prepare(
      'INSERT INTO portfolios (user, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
    ).bind(user, JSON.stringify(data), Date.now()).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('PUT portfolio error:', error)
    return c.json({ error: '更新投資組合資料失敗' }, 500)
  }
})
