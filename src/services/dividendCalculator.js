/**
 * 累計配息計算服務
 * 精確計算持有期間已收到的配息總額
 */

/**
 * 計算 ETF/股票 的累計配息
 * 對每筆歷史配息，根據 open_lots 的 trade_date 計算當時持有單位數
 *
 * @param {Array} dividendHistory - 歷史配息記錄 [{ exDate, amount }, ...]
 * @param {Array} openLots - 持倉明細 [{ trade_date, remaining_qty }, ...]
 * @returns {number} 累計配息金額（原幣）
 */
export function calculateEtfCumulativeDividend(dividendHistory, openLots) {
  if (!dividendHistory?.length || !openLots?.length) return 0

  let cumulative = 0

  for (const div of dividendHistory) {
    // 計算在除息日前已持有的單位數
    const unitsHeld = openLots.reduce((sum, lot) => {
      if (lot.trade_date < div.exDate) {
        return sum + lot.remaining_qty
      }
      return sum
    }, 0)

    if (unitsHeld > 0) {
      cumulative += div.amount * unitsHeld
    }
  }

  return Math.round(cumulative)
}

/**
 * 計算債券的累計配息
 * 債券配息固定（半年配一次），根據交易日和票面利率計算
 *
 * @param {Object} bond - 債券資料 { 交易日, 票面利率, 持有單位, 配息日 }
 * @param {number} usdRate - 美元匯率
 * @returns {{ cumulative: number, paymentCount: number }} 累計配息金額（TWD）及配息次數
 */
export function calculateBondCumulativeDividend(bond, usdRate) {
  if (!bond.交易日 || !bond.票面利率 || !bond.配息日) return { cumulative: 0, paymentCount: 0 }

  const buyDate = parseSimpleDate(bond.交易日)
  if (!buyDate) return { cumulative: 0, paymentCount: 0 }

  const today = new Date()
  const paymentDates = enumeratePaymentDates(bond.配息日, buyDate, today)

  // 每次配息 = 票面利率/100 / 2 × 面額(100) × 持有單位
  const perPayment = (bond.票面利率 / 100 / 2) * 100 * bond.持有單位

  return {
    cumulative: Math.round(perPayment * paymentDates.length * usdRate),
    paymentCount: paymentDates.length,
  }
}

/**
 * 解析日期字串 "YYYY/MM/DD" 為 Date 物件
 */
function parseSimpleDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
}

/**
 * 列舉從 buyDate 到 today 之間的所有配息日
 * @param {string} paymentSchedule - 配息日格式 "MM/DD, MM/DD"
 * @param {Date} buyDate - 買入日期
 * @param {Date} endDate - 結束日期（通常是今天）
 * @returns {Date[]} 所有已經過的配息日
 */
function enumeratePaymentDates(paymentSchedule, buyDate, endDate) {
  const dates = paymentSchedule.split(',').map(d => d.trim())
  const paymentMonthDays = dates.map(d => {
    const [month, day] = d.split('/').map(Number)
    return { month, day }
  })

  const result = []
  const startYear = buyDate.getFullYear()
  const endYear = endDate.getFullYear()

  for (let year = startYear; year <= endYear; year++) {
    for (const { month, day } of paymentMonthDays) {
      const payDate = new Date(year, month - 1, day)
      // 配息日必須在買入日之後且不超過今天
      if (payDate > buyDate && payDate <= endDate) {
        result.push(payDate)
      }
    }
  }

  return result
}
