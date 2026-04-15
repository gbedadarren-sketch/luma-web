export const config = { api: { bodyParser: true } }

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'not POST' })
    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'no key' })
    try {
          const { messages, system, maxTokens = 800 } = req.body
          const r = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                  body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: maxTokens, system: system || 'You are Luma.', messages })
          })
          const d = await r.json()
          if (!r.ok) return res.status(r.status).json({ error: d.error?.message })
          return res.status(200).json({ answer: d.content?.[0]?.text || '' })
    } catch (e) { return res.status(500).json({ error: e.message }) }
}
