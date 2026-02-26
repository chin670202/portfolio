/**
 * Trade Parser - Uses Claude CLI to parse natural language trade descriptions
 * Ported from trade-history/src/lib/trade-parser.ts
 */

const { runClaudeRaw } = require('./claude');

function buildPrompt(input, today) {
  return `你是一個交易記錄解析助手。使用者會用口語描述他們的交易，你需要解析成結構化 JSON。

今天的日期是 ${today}。

規則：
1. 日期：如果沒提到日期，預設為今天。支援「今天」「昨天」「上週五」等口語表達。
2. 商品類型判斷：
   - tw_stock：台股，4位數字代號(如 2330)，或提到「台積電」等台灣公司名
   - us_stock：美股，英文代號(如 AAPL, TSLA)，或提到美國公司名
   - crypto：加密貨幣，BTC, ETH 等，或提到「比特幣」「以太幣」
   - futures：期貨，提到「期貨」、「台指期」、「小台」等
   - options：選擇權，提到「選擇權」、「call」、「put」
3. 數量：
   - 台股「一張」= 1000股，「兩張」= 2000股。如果只說「張」就乘以1000。如果說「股」就是實際股數。
   - 其他商品按實際數量
4. 手續費/稅：如果沒提到就設為 0
5. 買賣方向：「買」「買入」「買了」「進場」= buy；「賣」「賣出」「賣了」「出場」= sell

請解析以下交易描述，只回傳純 JSON，不要加任何其他文字或 markdown 格式：

"${input}"

回傳格式：
{"tradeDate":"YYYY-MM-DD","assetType":"tw_stock|us_stock|crypto|futures|options","symbol":"代號","name":"名稱或null","side":"buy|sell","price":數字,"quantity":股數數字,"fee":數字,"tax":數字,"notes":"備註或null"}`;
}

async function parseTrade(input) {
  const today = new Date().toISOString().split('T')[0];
  const prompt = buildPrompt(input, today);

  let stdout;
  try {
    stdout = await runClaudeRaw(prompt, process.cwd());
  } catch (error) {
    throw new Error(error.message || 'Claude CLI 呼叫失敗');
  }

  // Extract JSON from response (handle markdown wrapping)
  let jsonStr = stdout;
  const jsonMatch = stdout.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse JSON from Claude CLI output:', stdout);
    throw new Error('AI 回傳格式異常，請嘗試更清楚的描述');
  }

  return {
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
  };
}

module.exports = { parseTrade };
