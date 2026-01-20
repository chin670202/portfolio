/**
 * 投資資料計算服務
 * 根據 Excel 公式轉換而來
 */

import { getBondPrice, getStockPrice, getLatestDividend, getNextDividendDate, getCryptoPrice, daysToNextDividend } from './api'

// ============================================================
// 債券計算（對應 Excel 第 3-11 列）
// ============================================================

/**
 * 計算單一債券的衍生數據
 * Excel 欄位對應：
 * - B: 代號 (ISIN)
 * - C: 買入價格
 * - D: 持有單位
 * - E: 最新價格 = getBondPrice(B)
 * - F: 損益(%) = (E-C)/C
 * - G: 台幣資產 = E*D*匯率
 * - H: 票面利率
 * - J: 每年利息 = H*D*匯率
 * - K: 配息日
 * - L: 剩餘天配息 = daysToNextDividend(K)
 * - M: 下次配息 = H*1000*匯率 (半年一次)
 * - O: 已質押資產 = E*D*匯率 (=G，因為質押單位=持有單位)
 */
export function calculateBondDerivedData(bond, usdRate) {
  const E = bond.最新價格
  const C = bond.買入價格
  const D = bond.持有單位
  const H = bond.票面利率
  const K = bond.配息日
  const N = bond.質押單位

  // F: 損益(%) = (E-C)/C
  const 損益百分比 = ((E - C) / C) * 100

  // G: 台幣資產 = E * D * 匯率
  const 台幣資產 = E * D * usdRate

  // J: 每年利息 = H * D * 匯率
  const 每年利息 = H * D * usdRate

  // I: 年殖利率 = H / E * 100
  const 年殖利率 = (H / E) * 100

  // L: 剩餘天配息 = daysToNextDividend(K)
  const 剩餘天配息 = daysToNextDividend(K)

  // M: 下次配息 = H * 1000 * 匯率 (半年配一次，所以是票面利率*1000面額)
  const 下次配息 = H * 1000 * usdRate

  // O: 已質押資產 = E * N * 匯率
  const 已質押資產 = E * N * usdRate

  return {
    ...bond,
    損益百分比: Math.round(損益百分比 * 100) / 100,
    台幣資產: Math.round(台幣資產),
    每年利息: Math.round(每年利息),
    年殖利率: Math.round(年殖利率 * 100) / 100,
    剩餘天配息,
    下次配息: Math.round(下次配息),
    已質押資產: Math.round(已質押資產)
  }
}

// ============================================================
// ETF 計算（對應 Excel 第 16-24 列）
// ============================================================

/**
 * 計算單一 ETF 的衍生數據
 * Excel 欄位對應：
 * - B: 代號
 * - C: 買入均價
 * - D: 持有單位
 * - E: 最新價格 = getStockPrice(B)
 * - F: 損益(%) = (E-C)/C
 * - G: 台幣資產 = E*D
 * - H: 每股配息 = getLatestDividend(B)
 * - I: 年殖利率 = H/C*配息頻率
 * - J: 每年利息 = D*H*配息頻率
 * - K: 下次配息日 = getNextDividendDate(B)
 * - L: 剩餘天配息 = daysToNextDividend(K)
 * - M: 下次配息 = D*H
 * - N: 質押單位
 * - O: 已質押資產 = E*N
 * - Q: 最新殖利率 = H/E*配息頻率
 */
export function calculateEtfDerivedData(etf) {
  const E = etf.最新價格
  const C = etf.買入均價
  const D = etf.持有單位
  const H = etf.每股配息
  const K = etf.下次配息日
  const N = etf.質押單位

  // 配息頻率：月配=12, 季配=4, 半年配=2
  const freq = etf.配息頻率 || 4

  // F: 損益(%) = (E-C)/C
  const 損益百分比 = ((E - C) / C) * 100

  // G: 台幣資產 = E * D
  const 台幣資產 = E * D

  // I: 年殖利率 = H / C * freq
  const 年殖利率 = (H / C) * freq * 100

  // J: 每年利息 = D * H * freq
  const 每年利息 = D * H * freq

  // L: 剩餘天配息 = daysToNextDividend(K)
  const 剩餘天配息 = K ? daysToNextDividend(K) : (etf.剩餘天配息備註 || null)

  // M: 下次配息 = D * H
  const 下次配息 = D * H

  // O: 已質押資產 = E * N
  const 已質押資產 = E * N

  // Q: 最新殖利率 = H / E * freq
  const 最新殖利率 = (H / E) * freq * 100

  return {
    ...etf,
    損益百分比: Math.round(損益百分比 * 100) / 100,
    台幣資產: Math.round(台幣資產),
    年殖利率: Math.round(年殖利率 * 100) / 100,
    每年利息: Math.round(每年利息),
    剩餘天配息,
    下次配息: Math.round(下次配息),
    已質押資產: Math.round(已質押資產),
    最新殖利率: Math.round(最新殖利率 * 100) / 100
  }
}

// ============================================================
// 其他資產計算（對應 Excel 第 29-34 列）
// ============================================================

/**
 * 計算其他資產的衍生數據
 * Excel 欄位對應：
 * - E: 最新價格 = GOOGLEFINANCE(代號) 或 GOOGLEFINANCE("CURRENCY:BTCUSD")*匯率
 * - F: 損益(%) = (E-C)/C
 * - G: 台幣資產 = E*D*匯率 (美股) 或 E*D (加密貨幣已換算TWD)
 */
export function calculateOtherAssetDerivedData(asset, usdRate) {
  const E = asset.最新價格 || 0  // 沒有最新價格時預設為 0
  const C = asset.買入均價
  const D = asset.持有單位

  // F: 損益(%) = (E-C)/C，價格為 0 時顯示 0
  const 損益百分比 = E > 0 ? ((E - C) / C) * 100 : 0

  // G: 台幣資產
  let 台幣資產
  let 台幣成本
  // 判斷是否為台幣計價資產
  const isTwdAsset = asset.代號.includes('/TWD') || /^\d/.test(asset.代號)
  if (isTwdAsset) {
    // 加密貨幣(TWD)或台股已是台幣計價
    台幣資產 = E * D
    台幣成本 = C * D
  } else {
    // 美股/美元計價
    台幣資產 = E * D * usdRate
    台幣成本 = C * D * usdRate
  }

  // 台幣損益 = 台幣資產 - 台幣成本
  const 台幣損益 = 台幣資產 - 台幣成本

  return {
    ...asset,
    損益百分比: Math.round(損益百分比 * 100) / 100,
    台幣損益: Math.round(台幣損益),
    台幣資產: Math.round(台幣資產)
  }
}

// ============================================================
// 貸款計算（對應 Excel 第 40-46 列）
// ============================================================

/**
 * 計算貸款的衍生數據
 * Excel 欄位對應：
 * - G: 貸款餘額
 * - H: 貸款利率
 * - I: 月繳金額 = J/12
 * - J: 每年利息 = G*H
 */
export function calculateLoanDerivedData(loan) {
  const G = loan.貸款餘額
  const H = loan.貸款利率 / 100

  // J: 每年利息 = G * H
  const 每年利息 = G * H

  // I: 月繳金額 = J / 12
  const 月繳金額 = 每年利息 / 12

  return {
    ...loan,
    月繳金額: Math.round(月繳金額),
    每年利息: Math.round(每年利息)
  }
}

// ============================================================
// 小計與總計計算
// ============================================================

/**
 * 計算債券小計（對應 Excel G12, J12, O12）
 */
export function calculateBondSubtotal(bonds, loanG42, loanG43) {
  const 台幣資產 = bonds.reduce((sum, b) => sum + b.台幣資產, 0)
  const 每年利息 = bonds.reduce((sum, b) => sum + b.每年利息, 0)
  const 已質押資產 = bonds.reduce((sum, b) => sum + b.已質押資產, 0)

  // G14: 預警資產 = (G42+G43) * 1.27
  const 預警資產 = (loanG42 + loanG43) * 1.27

  // O14: 整戶維持率 = O12 / (G42+G43) * 100
  const 整戶維持率百分比 = (已質押資產 / (loanG42 + loanG43)) * 100

  return {
    台幣資產: Math.round(台幣資產),
    每年利息: Math.round(每年利息),
    已質押資產: Math.round(已質押資產),
    預警資產: Math.round(預警資產),
    整戶維持率百分比: Math.round(整戶維持率百分比 * 100) / 100,
    預警維持率百分比: 127.0,
    追繳維持率百分比: 119.0
  }
}

/**
 * 計算 ETF 小計（對應 Excel G25, J25, O25, O27）
 */
export function calculateEtfSubtotal(etfs, loanG44, loanG45) {
  const 台幣資產 = etfs.reduce((sum, e) => sum + e.台幣資產, 0)
  const 每年利息 = etfs.reduce((sum, e) => sum + e.每年利息, 0)
  const 已質押資產 = etfs.reduce((sum, e) => sum + e.已質押資產, 0)

  // O27: 整戶維持率 = O25 / (G44+G45) * 100
  const 整戶維持率百分比 = (已質押資產 / (loanG44 + loanG45)) * 100

  return {
    台幣資產: Math.round(台幣資產),
    每年利息: Math.round(每年利息),
    已質押資產: Math.round(已質押資產),
    整戶維持率百分比: Math.round(整戶維持率百分比 * 100) / 100,
    追繳維持率百分比: 140.0
  }
}

/**
 * 計算其他資產小計（對應 Excel G35）
 */
export function calculateOtherAssetSubtotal(assets) {
  const 台幣資產 = assets.reduce((sum, a) => sum + a.台幣資產, 0)
  return {
    台幣資產: Math.round(台幣資產)
  }
}

/**
 * 計算貸款總計（對應 Excel G47, I47, J47）
 */
export function calculateLoanTotal(loans) {
  const 貸款餘額 = loans.reduce((sum, l) => sum + l.貸款餘額, 0)
  const 月繳金額 = loans.reduce((sum, l) => sum + l.月繳金額, 0)
  const 每年利息 = loans.reduce((sum, l) => sum + l.每年利息, 0)
  return {
    貸款餘額: Math.round(貸款餘額),
    月繳金額: Math.round(月繳金額),
    每年利息: Math.round(每年利息)
  }
}

/**
 * 計算投資總計（對應 Excel G37, J37）
 */
export function calculateGrandTotal(bondSubtotal, etfSubtotal, otherSubtotal) {
  return {
    台幣資產: bondSubtotal.台幣資產 + etfSubtotal.台幣資產 + otherSubtotal.台幣資產,
    每年利息: bondSubtotal.每年利息 + etfSubtotal.每年利息
  }
}

/**
 * 計算全年淨收入（對應 Excel J49 = J37 - J47）
 */
export function calculateNetIncome(totalInterest, loanInterest) {
  return totalInterest - loanInterest
}

// ============================================================
// 價格更新函式
// ============================================================

/**
 * 更新所有債券的最新價格
 */
export async function updateBondPrices(bonds) {
  const updatedBonds = await Promise.all(
    bonds.map(async (bond) => {
      try {
        const price = await getBondPrice(bond.代號)
        if (!String(price).startsWith('Error') && !String(price).startsWith('0.000')) {
          return { ...bond, 最新價格: parseFloat(price) }
        }
      } catch (e) {
        console.error(`Failed to update bond price for ${bond.代號}:`, e)
      }
      return bond
    })
  )
  return updatedBonds
}

/**
 * 更新所有 ETF 的最新價格和配息資料
 */
export async function updateEtfPrices(etfs) {
  const updatedEtfs = await Promise.all(
    etfs.map(async (etf) => {
      try {
        const [price, dividend, nextDate] = await Promise.all([
          getStockPrice(etf.代號),
          getLatestDividend(etf.代號),
          getNextDividendDate(etf.代號)
        ])

        const updates = { ...etf }

        if (!String(price).startsWith('錯誤') && !String(price).startsWith('無法')) {
          updates.最新價格 = parseFloat(price)
        }
        if (!String(dividend).startsWith('錯誤') && !String(dividend).startsWith('無法')) {
          updates.每股配息 = parseFloat(dividend)
        }
        if (!String(nextDate).startsWith('錯誤') && !String(nextDate).startsWith('無法')) {
          updates.下次配息日 = nextDate
        }

        return updates
      } catch (e) {
        console.error(`Failed to update ETF data for ${etf.代號}:`, e)
      }
      return etf
    })
  )
  return updatedEtfs
}

/**
 * 更新其他資產價格（美股用 GOOGLEFINANCE，加密貨幣用 CoinGecko）
 * 注意：前端無法直接使用 GOOGLEFINANCE，這裡用 CoinGecko 替代加密貨幣
 */
export async function updateOtherAssetPrices(assets, usdRate) {
  const cryptoMapping = {
    'BTC/TWD': 'bitcoin',
    'ETH/TWD': 'ethereum'
  }

  const updatedAssets = await Promise.all(
    assets.map(async (asset) => {
      try {
        const coinId = cryptoMapping[asset.代號]
        if (coinId) {
          // 加密貨幣用 CoinGecko
          const price = await getCryptoPrice(coinId, 'twd')
          if (typeof price === 'number') {
            return { ...asset, 最新價格: price }
          }
        }
        // 美股目前無法從前端直接抓取，保留原值
      } catch (e) {
        console.error(`Failed to update asset price for ${asset.代號}:`, e)
      }
      return asset
    })
  )
  return updatedAssets
}
