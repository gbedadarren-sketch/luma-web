export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const apiKey = process.env.CLAUDE_API_KEY
  const { messages, system, maxTokens = 800 } = req.body
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: maxTokens, system, messages })
  })
  const data = await response.json()
  if (!response.ok) return res.status(response.status).json({ error: data.error?.message })
  return res.status(200).json({ answer: data.content?.[0]?.text || '' })
}
