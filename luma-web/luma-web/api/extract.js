export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const apiKey = process.env.CLAUDE_API_KEY
      if (!apiKey) return res.status(500).json({ error: 'API key not configured' })
        const { base64 } = req.body
          if (!base64) return res.status(400).json({ error: 'No file data' })
            try {
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                      method: 'POST',
                            headers: {
                                    'Content-Type': 'application/json',
                                            'x-api-key': apiKey,
                                                    'anthropic-version': '2023-06-01',
                                                            'anthropic-beta': 'pdfs-2024-09-25'
                                                                  },
                                                                        body: JSON.stringify({
                                                                                model: 'claude-haiku-4-5',
                                                                                        max_tokens: 4000,
                                                                                                messages: [{
                                                                                                          role: 'user',
                                                                                                                    content: [
                                                                                                                                { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
                                                                                                                                            { type: 'text', text: 'Extract ALL text from this document verbatim, organized by slide or page. Include every title, bullet point, and body text. Format: Slide 1: [text] Slide 2: [text] etc. Do not summarize.' }
                                                                                                                                                      ]
                                                                                                                                                              }]
                                                                                                                                                                    })
                                                                                                                                                                        })
                                                                                                                                                                            const data = await response.json()
                                                                                                                                                                                if (!response.ok) return res.status(response.status).json({ error: data.error?.message })
                                                                                                                                                                                    return res.status(200).json({ text: data.content?.[0]?.text || '' })
                                                                                                                                                                                      } catch (err) {
                                                                                                                                                                                          return res.status(500).json({ error: err.message })
                                                                                                                                                                                            }
                                                                                                                                                                                            }
