/**
 * Anthropic Messages API client
 * Replaces Claude CLI spawn for Cloudflare Workers environment
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export async function callAnthropic(prompt, env) {
  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('AI 解析服務未設定')

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Anthropic API error:', response.status, error)
    throw new Error('AI 解析服務暫時無法使用')
  }

  const result = await response.json()
  return result.content[0].text
}
