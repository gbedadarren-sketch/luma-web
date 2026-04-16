export async function callClaude(messages, system = 'You are Luma, an AI study assistant for Indiana University students. Be helpful, clear, and encouraging.', maxTokens = 800) {
        const res = await fetch('/api/chat', {
            method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages, system, maxTokens })
                      })
                        if (!res.ok) {
                            const err = await res.json().catch(() => ({}))
                                throw new Error(err.error || `API error ${res.status}`)
                                  }
                                    const data = await res.json()
                                      return data.answer || ''
                                      }

                                      export async function extractPdfText(file) {
                                        const formData = new FormData()
                                          formData.append('file', file)
                                            const res = await fetch('/api/extract', { method: 'POST', body: formData })
                                              if (!res.ok) throw new Error('PDF extraction failed')
                                                const data = await res.json()
                                                  return data.text || ''
                                                  }
}
