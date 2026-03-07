/**
 * Portfolio API Routes (Hono + D1)
 * Serves portfolio JSON data from D1, with unified AI parsing for trades/adjustments/loans.
 */

import { Hono } from 'hono'
import { createBackup } from '../services/backup.js'
import { parseUnified } from '../services/portfolio-adjuster.js'

export const portfolioRoutes = new Hono()

const HOLDING_ARRAYS = ['股票', 'ETF', '其它資產']

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
 * POST /portfolio/:user/parse - Unified AI parse (auto-detects trade/adjust/loan)
 */
portfolioRoutes.post('/:user/parse', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')
    const { input } = await c.req.json()

    if (!input || !input.trim()) {
      return c.json({ error: '請輸入指令' }, 400)
    }

    const row = await db.prepare('SELECT data FROM portfolios WHERE user = ?').bind(user).first()
    const portfolioData = row ? JSON.parse(row.data) : null

    const result = await parseUnified(input.trim(), c.env, portfolioData)

    // For loan operations, attach the matched existing loan for preview
    if (result.type === 'loan' && portfolioData && result.action !== 'add') {
      const loans = portfolioData['貸款'] || []
      const sameType = loans.filter(l => l['貸款別'] === result.loanType)

      let matched = null
      if (result.remark) {
        matched = sameType.find(l => l['備註'] === result.remark)
      } else if (sameType.length === 1) {
        matched = sameType[0]
      } else if (sameType.length > 1) {
        // Disambiguate by rate and/or balance
        let candidates = sameType
        if (result.rate != null) {
          const byRate = candidates.filter(l => l['貸款利率'] === result.rate)
          if (byRate.length > 0) candidates = byRate
        }
        if (candidates.length > 1 && result.balance != null) {
          const byBalance = candidates.filter(l => l['貸款餘額'] === result.balance)
          if (byBalance.length > 0) candidates = byBalance
        }
        if (candidates.length === 1) matched = candidates[0]
      }

      if (matched) {
        result.matchedLoan = {
          loanType: matched['貸款別'],
          remark: matched['備註'] || null,
          balance: matched['貸款餘額'] || 0,
          rate: matched['貸款利率'] || 0,
        }
      }
    }

    return c.json(result)
  } catch (error) {
    console.error('unified parse error:', error)
    return c.json({ error: error.message || 'AI 解析失敗，請稍後再試' }, 500)
  }
})

/**
 * POST /portfolio/:user/adjust - Apply portfolio adjustment (position or loan)
 */
portfolioRoutes.post('/:user/adjust', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')
    const body = await c.req.json()

    const row = await db.prepare('SELECT data FROM portfolios WHERE user = ?').bind(user).first()
    if (!row) {
      return c.json({ error: `找不到使用者 "${user}" 的資料` }, 404)
    }

    await createBackup(db, user)
    const data = JSON.parse(row.data)

    // Route to handler based on type
    const adjustType = body.type || 'adjust'
    if (adjustType === 'loan') {
      return handleLoanAdjust(c, db, user, data, body)
    }
    return handlePositionAdjust(c, db, user, data, body)
  } catch (error) {
    console.error('adjust error:', error)
    return c.json({ error: '調整失敗，請稍後再試' }, 500)
  }
})

/**
 * Handle position (holding) adjustments
 */
async function handlePositionAdjust(c, db, user, data, body) {
  const { action, symbol, name, quantity, avgPrice,
    // Bond-specific fields
    companyName, buyPrice, couponRate, paymentDate, tradeDate, maturityDate, pledgeUnits } = body
  if (!action || !symbol) {
    return c.json({ error: '缺少必要欄位' }, 400)
  }

  // Find existing holding
  let found = null
  for (const key of HOLDING_ARRAYS) {
    const arr = data[key]
    if (!Array.isArray(arr)) continue
    const idx = arr.findIndex(a => a['代號'] === symbol)
    if (idx >= 0) {
      found = { arrayKey: key, index: idx, entry: arr[idx] }
      break
    }
  }

  if (action === 'set') {
    if (quantity == null || quantity <= 0) {
      return c.json({ error: '設定部位需要提供有效數量' }, 400)
    }
    if (found) {
      found.entry['持有單位'] = quantity
      if (avgPrice != null) found.entry['買入均價'] = Math.round(avgPrice * 100) / 100
      if (name) found.entry['名稱'] = name
      // Bond-specific fields
      if (companyName) found.entry['公司名稱'] = companyName
      if (buyPrice != null) found.entry['買入價格'] = Math.round(buyPrice * 100) / 100
      if (couponRate != null) found.entry['票面利率'] = couponRate
      if (paymentDate !== undefined) found.entry['配息日'] = paymentDate || ''
      if (tradeDate !== undefined) found.entry['交易日'] = tradeDate || ''
      if (maturityDate !== undefined) found.entry['到期日'] = maturityDate || ''
      if (pledgeUnits != null) found.entry['質押單位'] = pledgeUnits
    } else {
      if (!data['其它資產']) data['其它資產'] = []
      data['其它資產'].push({
        '名稱': name || symbol,
        '代號': symbol,
        '買入均價': avgPrice != null ? Math.round(avgPrice * 100) / 100 : 0,
        '持有單位': quantity,
      })
    }
  } else if (action === 'add') {
    if (quantity == null || quantity <= 0) {
      return c.json({ error: '增加部位需要提供有效數量' }, 400)
    }
    if (found) {
      const oldQty = found.entry['持有單位'] || 0
      const oldAvg = found.entry['買入均價'] || 0
      const addAvg = avgPrice != null ? avgPrice : oldAvg
      const newQty = oldQty + quantity
      const newAvg = newQty > 0
        ? (oldAvg * oldQty + addAvg * quantity) / newQty
        : 0
      found.entry['持有單位'] = newQty
      found.entry['買入均價'] = Math.round(newAvg * 100) / 100
      if (name) found.entry['名稱'] = name
    } else {
      if (!data['其它資產']) data['其它資產'] = []
      data['其它資產'].push({
        '名稱': name || symbol,
        '代號': symbol,
        '買入均價': avgPrice != null ? Math.round(avgPrice * 100) / 100 : 0,
        '持有單位': quantity,
      })
    }
  } else if (action === 'reduce') {
    if (quantity == null || quantity <= 0) {
      return c.json({ error: '減少部位需要提供有效數量' }, 400)
    }
    if (!found) {
      return c.json({ error: `找不到 ${symbol} 的持倉` }, 404)
    }
    const oldQty = found.entry['持有單位'] || 0
    const newQty = oldQty - quantity
    if (newQty <= 0) {
      data[found.arrayKey].splice(found.index, 1)
    } else {
      found.entry['持有單位'] = newQty
    }
  } else if (action === 'remove') {
    if (!found) {
      return c.json({ error: `找不到 ${symbol} 的持倉` }, 404)
    }
    data[found.arrayKey].splice(found.index, 1)
  } else {
    return c.json({ error: '不支援的調整動作' }, 400)
  }

  data['資料更新日期'] = new Date().toISOString().slice(0, 10)
  await db.prepare('UPDATE portfolios SET data = ?, updated_at = ? WHERE user = ?')
    .bind(JSON.stringify(data), Date.now(), user).run()

  return c.json({ success: true, type: 'adjust', action, symbol })
}

/**
 * Handle loan adjustments
 */
async function handleLoanAdjust(c, db, user, data, body) {
  const { action, loanType, balance, rate, usage, remark, newRemark, newLoanType } = body
  if (!action || !loanType) {
    return c.json({ error: '缺少貸款名稱' }, 400)
  }

  if (!data['貸款']) data['貸款'] = []
  const loans = data['貸款']

  // Find all matching loans by type
  const sameTypeLoans = loans
    .map((l, i) => ({ ...l, _idx: i }))
    .filter(l => l['貸款別'] === loanType)

  let idx = -1
  if (remark) {
    // Specific remark: match exactly
    idx = loans.findIndex(l => l['貸款別'] === loanType && l['備註'] === remark)
  } else if (sameTypeLoans.length === 1) {
    // Only one of this type: safe to match
    idx = sameTypeLoans[0]._idx
  } else if (sameTypeLoans.length > 1 && action !== 'add') {
    // Multiple same-type loans without remark: try disambiguating by rate/balance
    let candidates = sameTypeLoans
    if (rate != null) {
      const byRate = candidates.filter(l => l['貸款利率'] === rate)
      if (byRate.length > 0) candidates = byRate
    }
    if (candidates.length > 1 && balance != null && action === 'remove') {
      const byBalance = candidates.filter(l => l['貸款餘額'] === balance)
      if (byBalance.length > 0) candidates = byBalance
    }
    if (candidates.length === 1) {
      idx = candidates[0]._idx
    } else {
      const options = sameTypeLoans.map(l => l['備註'] ? `「${l['備註']}」` : '（無備註）').join('、')
      return c.json({
        error: `有 ${sameTypeLoans.length} 筆「${loanType}」，請指定是哪一筆：${options}`
      }, 400)
    }
  }

  if (action === 'add') {
    if (idx >= 0) {
      const label = remark ? `「${loanType}（${remark}）」` : `「${loanType}」`
      return c.json({ error: `${label}已存在，如需修改請用「修改」` }, 400)
    }
    const newLoan = { '貸款別': loanType }
    if (balance != null) newLoan['貸款餘額'] = balance
    if (rate != null) newLoan['貸款利率'] = rate
    if (usage) newLoan['用途'] = usage
    if (remark) newLoan['備註'] = remark
    loans.push(newLoan)
  } else if (action === 'set') {
    if (idx < 0) {
      const newLoan = { '貸款別': loanType }
      if (balance != null) newLoan['貸款餘額'] = balance
      if (rate != null) newLoan['貸款利率'] = rate
      if (usage) newLoan['用途'] = usage
      if (remark) newLoan['備註'] = remark
      loans.push(newLoan)
    } else {
      if (balance != null) loans[idx]['貸款餘額'] = balance
      if (rate != null) loans[idx]['貸款利率'] = rate
      if (usage) loans[idx]['用途'] = usage
      if (newLoanType) loans[idx]['貸款別'] = newLoanType
      if (newRemark) loans[idx]['備註'] = newRemark
      else if (remark && !loans[idx]['備註']) loans[idx]['備註'] = remark
    }
  } else if (action === 'reduce') {
    const label = remark ? `${loanType}（${remark}）` : loanType
    if (idx < 0) {
      return c.json({ error: `找不到「${label}」貸款` }, 404)
    }
    if (balance == null || balance <= 0) {
      return c.json({ error: '減少餘額需要提供金額' }, 400)
    }
    const oldBalance = loans[idx]['貸款餘額'] || 0
    const newBalance = oldBalance - balance
    if (newBalance <= 0) {
      loans.splice(idx, 1)
    } else {
      loans[idx]['貸款餘額'] = newBalance
    }
  } else if (action === 'remove') {
    const label = remark ? `${loanType}（${remark}）` : loanType
    if (idx < 0) {
      return c.json({ error: `找不到「${label}」貸款` }, 404)
    }
    loans.splice(idx, 1)
  } else {
    return c.json({ error: '不支援的貸款動作' }, 400)
  }

  data['資料更新日期'] = new Date().toISOString().slice(0, 10)
  await db.prepare('UPDATE portfolios SET data = ?, updated_at = ? WHERE user = ?')
    .bind(JSON.stringify(data), Date.now(), user).run()

  return c.json({ success: true, type: 'loan', action, loanType })
}

/**
 * POST /portfolio/:user/migrate-loans - One-time migration to split 貸款別 into 貸款別 + 備註
 */
portfolioRoutes.post('/:user/migrate-loans', async (c) => {
  try {
    const db = c.env.DB
    const user = c.req.param('user')

    const row = await db.prepare('SELECT data FROM portfolios WHERE user = ?').bind(user).first()
    if (!row) return c.json({ error: `找不到使用者 "${user}" 的資料` }, 404)

    await createBackup(db, user)
    const data = JSON.parse(row.data)
    const loans = data['貸款']
    if (!Array.isArray(loans)) return c.json({ message: '沒有貸款資料', migrated: 0 })

    let migrated = 0
    for (const loan of loans) {
      const original = loan['貸款別']
      if (!original || loan['備註']) continue // already has remark

      // Pattern: "房屋貸款 2.15% (民德路)" → 貸款別=房屋貸款, 備註=民德路
      // Pattern: "其他貸款 2.15% (金交債)" → 貸款別=其他貸款, 備註=金交債
      // Pattern: "循環理財貸款 2.69% (股票質借)" → 貸款別=循環理財貸款, 備註=股票質借
      const match = original.match(/^(.+?)\s+[\d.]+%\s*\((.+?)\)$/)
      if (match) {
        loan['貸款別'] = match[1].trim()
        loan['備註'] = match[2].trim()
        migrated++
      }
    }

    if (migrated > 0) {
      data['資料更新日期'] = new Date().toISOString().slice(0, 10)
      await db.prepare('UPDATE portfolios SET data = ?, updated_at = ? WHERE user = ?')
        .bind(JSON.stringify(data), Date.now(), user).run()
    }

    return c.json({ success: true, migrated, loans: loans.map(l => ({ 貸款別: l['貸款別'], 備註: l['備註'] || null })) })
  } catch (error) {
    console.error('migrate-loans error:', error)
    return c.json({ error: '遷移失敗' }, 500)
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

    await createBackup(db, user)

    await db.prepare(
      'INSERT INTO portfolios (user, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
    ).bind(user, JSON.stringify(data), Date.now()).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('PUT portfolio error:', error)
    return c.json({ error: '更新投資組合資料失敗' }, 500)
  }
})
