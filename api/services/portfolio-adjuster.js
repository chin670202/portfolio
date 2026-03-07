/**
 * Unified Portfolio Parser - Uses Anthropic API to parse natural language input.
 * Automatically detects intent: trade, position adjustment, or loan management.
 */

import { callAnthropic } from './anthropic.js'

function buildUnifiedPrompt(input, today, holdings, loans) {
  const holdingList = holdings.length > 0
    ? holdings.map(h => `- ${h.symbol} ${h.name} (持有 ${h.quantity}, 均價 ${h.avgPrice})`).join('\n')
    : '（目前沒有持倉）'

  const loanList = loans.length > 0
    ? loans.map(l => `- ${l.loanType}${l.remark ? '（' + l.remark + '）' : ''} (餘額 ${l.balance}, 利率 ${l.rate}%${l.usage ? ', 用途: ' + l.usage : ''})`).join('\n')
    : '（目前沒有貸款）'

  return `你是一個投資組合助手。使用者會用口語描述，你需要判斷意圖並解析成結構化 JSON。

今天的日期是 ${today}。

使用者目前的持倉：
${holdingList}

使用者目前的貸款：
${loanList}

## 第一步：判斷意圖類型

**trade** — 描述一筆實際的買賣交易，有買/賣動作和成交價。
例如：「今天買了兩張台積電 680元」「sell 100 AAPL at 235.5」「昨天賣出 0050 一張 150元」

**adjust** — 直接修改持倉數據（部位），不是描述一筆交易。
例如：「台積電改成 3000 股均價 580」「增加 0.5 BTC」「刪除 XYZ 部位」「新增 AAPL 50股均價 180」

**loan** — 新增、修改或移除貸款。
例如：「新增房貸 500萬 利率 2.185%」「把金交債貸款餘額改成 300萬」「刪除信貸」「房貸餘額減少 5萬」

判斷依據：
- 有「買了/賣了/買入/賣出/進場/出場/buy/sell」+ 成交價 → trade
- 有「改成/調整為/設定/增加部位/減少部位/刪除部位/移除/新增部位」且針對股票/ETF/加密貨幣 → adjust
- 提到「貸款/房貸/信貸/車貸/金交債貸款/股票貸款」的增刪改 → loan
- 模糊不清時偏向 trade

## 第二步：根據類型回傳 JSON

### type = "trade"
規則：
1. 日期沒提到就預設今天
2. 商品類型：tw_stock(4位數字)、us_stock(英文)、crypto(BTC/ETH)、futures(期貨)、options(選擇權)
3. 台股「一張」= 1000股
4. 手續費/稅沒提到就設 0
5. 「買/買入/進場」= buy；「賣/賣出/出場」= sell
6. 公司名稱對照持倉列表找代號

回傳：
{"type":"trade","tradeDate":"YYYY-MM-DD","assetType":"tw_stock|us_stock|crypto|futures|options","symbol":"代號","name":"名稱或null","side":"buy|sell","price":數字,"quantity":股數數字,"fee":數字,"tax":數字,"notes":"備註或null"}

### type = "adjust"
動作：set(設定/改成)、add(增加/新增)、reduce(減少)、remove(刪除/移除)
規則：
1. symbol 大寫，對照持倉列表或常識推測
2. 台股「一張」= 1000 股
3. avgPrice：set/add 時需要，沒提到從持倉帶入（有的話），沒有就 null
4. name 從持倉帶入或常識填寫

回傳：
{"type":"adjust","action":"set|add|reduce|remove","symbol":"代號","name":"名稱或null","quantity":數字或null,"avgPrice":數字或null,"notes":"備註或null"}

### type = "loan"
動作：add(新增貸款)、set(修改貸款，覆蓋欄位)、reduce(減少餘額)、remove(移除貸款)
規則：
1. loanType 是貸款類型（如「房屋貸款」「其他貸款」「循環理財貸款」「汽車貸款」）。對照現有貸款列表匹配
2. remark 是用來區分同類貸款的**現有**備註標識（如「民德路」「金交債」「股票質借」「CUSTIN汽車」）。用於匹配哪一筆貸款
3. newRemark 是要**更新成**的新備註值。只有在使用者想修改備註時才需要填
4. balance 是貸款餘額（萬元要轉換成元，如 500萬 = 5000000）
5. rate 是年利率百分比數字（如 2.185 代表 2.185%）
6. usage 是貸款用途（如「房貸」「投資」）
7. 修改時只需提供要改的欄位，其餘設 null
8. reduce 時 balance 是要減少的金額
9. 當有多筆同類貸款時（如多筆房屋貸款），remark 是必要的，用來指定是哪一筆
10. remove 時如果使用者提到了餘額或利率來辨識哪一筆，仍需填入 balance/rate 以利系統比對
11. 如果使用者只提到備註相關的內容（如「CUSTIN汽車改成現代CUSTIN」），判定為 loan set，用 remark 匹配，newRemark 設為新值

回傳：
{"type":"loan","action":"add|set|reduce|remove","loanType":"貸款別","remark":"現有備註或null","newRemark":"新備註或null","balance":數字或null,"rate":數字或null,"usage":"用途或null","notes":"備註或null"}

請解析以下輸入，只回傳純 JSON，不要加任何其他文字或 markdown 格式：

"${input}"`
}

function extractHoldings(data) {
  const holdings = []
  for (const key of ['股票', 'ETF', '其它資產']) {
    const arr = data[key]
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      holdings.push({
        symbol: item['代號'] || '',
        name: item['名稱'] || item['公司名稱'] || '',
        quantity: item['持有單位'] || item['股數'] || 0,
        avgPrice: item['買入均價'] || 0,
      })
    }
  }
  return holdings
}

function extractLoans(data) {
  const loans = []
  const arr = data['貸款']
  if (!Array.isArray(arr)) return loans
  for (const item of arr) {
    loans.push({
      loanType: item['貸款別'] || '',
      remark: item['備註'] || '',
      balance: item['貸款餘額'] || 0,
      rate: item['貸款利率'] || 0,
      usage: item['用途'] || '',
    })
  }
  return loans
}

export async function parseUnified(input, env, portfolioData) {
  const today = new Date().toISOString().split('T')[0]
  const holdings = portfolioData ? extractHoldings(portfolioData) : []
  const loans = portfolioData ? extractLoans(portfolioData) : []
  const prompt = buildUnifiedPrompt(input, today, holdings, loans)

  let stdout
  try {
    stdout = await callAnthropic(prompt, env)
  } catch (error) {
    throw new Error(error.message || 'AI 解析服務暫時無法使用')
  }

  let jsonStr = stdout
  const jsonMatch = stdout.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    jsonStr = jsonMatch[0]
  }

  let parsed
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    console.error('Failed to parse JSON from Anthropic output:', stdout)
    throw new Error('AI 回傳格式異常，請嘗試更清楚的描述')
  }

  if (parsed.type === 'trade') {
    return {
      type: 'trade',
      tradeDate: parsed.tradeDate || today,
      assetType: parsed.assetType,
      symbol: String(parsed.symbol).toUpperCase(),
      name: parsed.name ? String(parsed.name) : null,
      side: parsed.side,
      price: Number(parsed.price),
      quantity: Number(parsed.quantity),
      fee: Number(parsed.fee) || 0,
      tax: Number(parsed.tax) || 0,
      notes: parsed.notes ? String(parsed.notes) : null,
    }
  }

  if (parsed.type === 'adjust') {
    const action = parsed.action
    if (!['set', 'add', 'reduce', 'remove'].includes(action)) {
      throw new Error('無法辨識的調整動作，請描述要「設定」「增加」「減少」或「刪除」部位')
    }
    return {
      type: 'adjust',
      action,
      symbol: String(parsed.symbol).toUpperCase(),
      name: parsed.name ? String(parsed.name) : null,
      quantity: parsed.quantity != null ? Number(parsed.quantity) : null,
      avgPrice: parsed.avgPrice != null ? Number(parsed.avgPrice) : null,
      notes: parsed.notes ? String(parsed.notes) : null,
    }
  }

  if (parsed.type === 'loan') {
    const action = parsed.action
    if (!['add', 'set', 'reduce', 'remove'].includes(action)) {
      throw new Error('無法辨識的貸款動作，請描述要「新增」「修改」「減少」或「刪除」貸款')
    }
    return {
      type: 'loan',
      action,
      loanType: parsed.loanType ? String(parsed.loanType) : null,
      remark: parsed.remark ? String(parsed.remark) : null,
      newRemark: parsed.newRemark ? String(parsed.newRemark) : null,
      balance: parsed.balance != null ? Number(parsed.balance) : null,
      rate: parsed.rate != null ? Number(parsed.rate) : null,
      usage: parsed.usage ? String(parsed.usage) : null,
      notes: parsed.notes ? String(parsed.notes) : null,
    }
  }

  throw new Error('無法判斷意圖，請描述得更清楚一些')
}
