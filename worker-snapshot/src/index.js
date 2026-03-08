/**
 * Portfolio Snapshot Worker
 * 每週自動建立資產變化記錄（Cron Trigger）
 * 也可透過 HTTP POST /snapshot 手動觸發
 */

import { fetchAllPrices } from './price-fetcher.js'
import { calculateSnapshot } from './snapshot-calculator.js'

export default {
  // Cron Trigger handler
  async scheduled(event, env, ctx) {
    ctx.waitUntil(generateSnapshots(env))
  },

  // HTTP handler for manual trigger
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return json({ status: 'ok', service: 'portfolio-snapshot' })
    }

    if (url.pathname === '/snapshot' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const result = await generateSnapshots(env, body.user)
      return json(result)
    }

    return new Response('Not Found', { status: 404 })
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * 為所有（或指定）使用者產生資產快照
 */
async function generateSnapshots(env, specificUser = null) {
  const db = env.DB
  const results = []

  // 取得使用者列表
  let users
  if (specificUser) {
    users = [{ user: specificUser }]
  } else {
    const { results: allUsers } = await db.prepare(
      'SELECT user FROM portfolios'
    ).all()
    users = allUsers
  }

  for (const { user } of users) {
    try {
      const row = await db.prepare(
        'SELECT data FROM portfolios WHERE user = ?'
      ).bind(user).first()

      if (!row) {
        results.push({ user, success: false, error: 'Portfolio not found' })
        continue
      }

      const portfolioData = JSON.parse(row.data)

      // 檢查是否有持倉資料（沒有持倉就不需要快照）
      const hasHoldings = (portfolioData.股票?.length > 0) ||
        (portfolioData.ETF?.length > 0) ||
        (portfolioData.其它資產?.length > 0)

      if (!hasHoldings) {
        results.push({ user, success: true, skipped: true, reason: '無持倉資料' })
        continue
      }

      // 抓取所有即時價格
      const priceResult = await fetchAllPrices(portfolioData)

      // 計算快照
      const snapshot = calculateSnapshot(portfolioData, priceResult)

      // 安全檢查：有持倉但部位總額為 0，代表價格全部抓取失敗，跳過
      if (snapshot.部位總額 === 0 && hasHoldings) {
        results.push({ user, success: false, error: '價格抓取失敗，部位總額為 0，跳過快照' })
        continue
      }

      // 重複偵測：同日已有記錄則跳過
      const existing = portfolioData.資產變化記錄 || []
      if (existing.some(r => r.記錄時間 === snapshot.記錄時間)) {
        results.push({ user, success: true, skipped: true, reason: '今日已有記錄' })
        continue
      }

      // 追加新記錄
      portfolioData.資產變化記錄 = [...existing, snapshot]

      // 寫回 D1
      await db.prepare(
        'UPDATE portfolios SET data = ?, updated_at = ? WHERE user = ?'
      ).bind(JSON.stringify(portfolioData), Date.now(), user).run()

      results.push({
        user,
        success: true,
        snapshot,
        priceErrors: priceResult.errors.length > 0 ? priceResult.errors : undefined
      })
    } catch (e) {
      results.push({ user, success: false, error: e.message })
    }
  }

  return { timestamp: new Date().toISOString(), results }
}
