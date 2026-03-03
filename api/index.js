import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { tradesRoutes } from './routes/trades.js'
import { pnlRoutes } from './routes/pnl.js'
import { statsRoutes } from './routes/stats.js'
import { brokersRoutes } from './routes/brokers.js'
import { backupRoutes } from './routes/backup.js'
import { portfolioRoutes } from './routes/portfolio.js'

const app = new Hono().basePath('/api')

// CORS (needed for local dev where frontend is on different port)
app.use('*', cors())

// API key auth middleware
app.use('*', async (c, next) => {
  const apiKey = c.env.API_KEY
  if (!apiKey) return next() // dev mode: skip auth if not set
  const reqKey = c.req.header('x-api-key')
  if (reqKey !== apiKey) {
    return c.json({ success: false, error: 'API 金鑰無效' }, 401)
  }
  return next()
})

// Routes
app.route('/trades', tradesRoutes)
app.route('/pnl', pnlRoutes)
app.route('/stats', statsRoutes)
app.route('/brokers', brokersRoutes)
app.route('/backup', backupRoutes)
app.route('/portfolio', portfolioRoutes)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Root info
app.get('/', (c) => c.json({ service: 'portfolio-api', version: '2.0.0' }))

export { app }
