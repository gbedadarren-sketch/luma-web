import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function callClaude({ messages, system, maxTokens = 800 }) {
    const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, system, maxTokens }),
    })
    if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Server error ' + res.status)
    }
    const data = await res.json()
    return data.answer || ''
}

export async function extractPdfText({ base64 }) {
    const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64 }),
    })
    if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Extraction error ' + res.status)
    }
    const data = await res.json()
    return data.text || ''
}
