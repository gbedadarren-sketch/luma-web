import { useState } from 'react'
import { Button } from '../components/UI'
import { callClaude, extractPdfText } from '../lib/api'

// ── SOURCES PANEL ─────────────────────────────────────────────
export function SourcesPanel({ sources, onAddPaste, onRemove, onUpload, uploadLoading, uploadError }) {
  const [pasteText, setPasteText] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [pasteError, setPasteError] = useState('')

  function handleAddPaste() {
    if (!pasteText.trim()) { setPasteError('Paste some text first'); return }
    onAddPaste(sourceName || 'Source ' + (sources.length + 1), pasteText)
    setPasteText(''); setSourceName(''); setPasteError('')
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ width: '260px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700 }}>Knowledge Base</h2>
          <p style={{ fontSize: '11px', color: 'var(--text3)' }}>{sources.length} source{sources.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
          {sources.length === 0 ? (
            <div style={{ padding: '30px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.3 }}>📚</div>
              <p style={{ fontSize: '12px', color: 'var(--text3)' }}>No sources yet</p>
            </div>
          ) : sources.map(src => (
            <div key={src.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '6px', background: 'var(--surface)' }}>
              <span style={{ fontSize: '14px' }}>📄</span>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.name}</p>
                <p style={{ fontSize: '10px', color: 'var(--text3)' }}>{Math.round(src.chars / 1000)}k chars</p>
              </div>
              <button onClick={() => onRemove(src.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '14px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
              >×</button>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Add a source</h3>
        <div
          onClick={onUpload}
          style={{ border: '2px dashed var(--border2)', borderRadius: 'var(--radius)', padding: '28px', textAlign: 'center', cursor: 'pointer', marginBottom: '24px', transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(124,111,255,0.04)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'transparent' }}
        >
          {uploadLoading ? <p style={{ color: 'var(--text2)' }}>Reading PDF with AI…</p> : (
            <>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>⬆</div>
              <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Click to upload PDF</p>
              <p style={{ fontSize: '12px', color: 'var(--text3)' }}>AI extracts all text automatically</p>
            </>
          )}
        </div>
        {uploadError && <p style={{ fontSize: '12px', color: 'var(--red)', marginBottom: '12px' }}>{uploadError}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>or paste text directly</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>Source name</label>
            <input value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="e.g. W14 M&A Slides" style={{ fontSize: '13px' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>
              Text — <span style={{ fontWeight: 400, color: 'var(--text3)' }}>Open PowerPoint → Ctrl+A → Ctrl+C → paste here</span>
            </label>
            <textarea value={pasteText} onChange={e => { setPasteText(e.target.value); setPasteError('') }} placeholder="Paste slide text, lecture notes, readings…" rows={10} style={{ fontSize: '13px', resize: 'vertical', width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: 'var(--text)', fontFamily: 'var(--font-body)' }} />
          </div>
          {pasteError && <p style={{ fontSize: '12px', color: 'var(--red)' }}>{pasteError}</p>}
          <Button onClick={handleAddPaste} disabled={!pasteText.trim()} style={{ alignSelf: 'flex-start' }}>Add to knowledge base →</Button>
        </div>
      </div>
    </div>
  )
}

// ── SETTINGS PANEL ────────────────────────────────────────────
export function SettingsPanel({ onSignOut }) {
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState('')

  async function handleTest() {
    setTesting(true); setStatus('')
    try {
      const result = await callClaude({ messages: [{ role: 'user', content: 'Reply: working!' }], system: 'Reply: working!', maxTokens: 20 })
      setStatus(result ? '✓ AI connected and working!' : '✓ Connected')
    } catch (e) { setStatus('✗ ' + e.message) }
    finally { setTesting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>
          AI is powered by Claude and managed by Luma — no setup needed.
        </p>
        {status && <p style={{ fontSize: '12px', color: status.startsWith('✓') ? 'var(--green)' : 'var(--red)', marginBottom: '10px' }}>{status}</p>}
        <Button variant="ghost" onClick={handleTest} loading={testing}>Test AI connection</Button>
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <Button variant="danger" size="sm" onClick={onSignOut}>Sign out</Button>
      </div>
    </div>
  )
}

// ── TRANSCRIPT PANEL ──────────────────────────────────────────
export function TranscriptPanel({ transcript, onClear, wordCount, isRecording }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700 }}>Lecture Transcript</h2>
          <p style={{ fontSize: '11px', color: 'var(--text3)' }}>{wordCount.toLocaleString()} words {isRecording && '· recording'}</p>
        </div>
        {transcript && <Button variant="danger" size="sm" onClick={onClear}>Clear</Button>}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {transcript ? (
          <p style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--text2)', fontWeight: 300, whiteSpace: 'pre-wrap' }}>{transcript}</p>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}>🎙</div>
            <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Start recording to capture the lecture</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── STATUS PANEL ──────────────────────────────────────────────
export function StatusPanel({ confusion, onSetConfusion }) {
  const [escalation, setEscalation] = useState('')
  const [sent, setSent] = useState(false)
  const levels = [
    { id: 'lost', label: 'Lost', emoji: '😕', color: 'var(--red)' },
    { id: 'unsure', label: 'Unsure', emoji: '🤔', color: 'var(--amber)' },
    { id: 'good', label: 'Got it', emoji: '✓', color: 'var(--green)' },
  ]
  return (
    <div style={{ padding: '24px', overflow: 'auto' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>How are you following?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '28px' }}>
        {levels.map(l => (
          <button key={l.id} onClick={() => onSetConfusion(l.id)} style={{
            padding: '16px 8px', borderRadius: 'var(--radius)', cursor: 'pointer',
            border: `1px solid ${confusion === l.id ? l.color : 'var(--border)'}`,
            background: confusion === l.id ? `${l.color}18` : 'var(--surface)',
            color: confusion === l.id ? l.color : 'var(--text2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            fontFamily: 'var(--font-body)', fontSize: '12px', transition: 'all .15s',
          }}>
            <span style={{ fontSize: '22px' }}>{l.emoji}</span>{l.label}
          </button>
        ))}
      </div>
      <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>Escalate anonymously</h3>
      <textarea value={escalation} onChange={e => { setEscalation(e.target.value); setSent(false) }} placeholder="What concept are you stuck on?" rows={3} style={{ width: '100%', marginBottom: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '13px', resize: 'vertical' }} />
      {sent ? <p style={{ fontSize: '13px', color: 'var(--green)' }}>✓ Sent anonymously</p> : (
        <Button size="sm" onClick={() => { if (escalation.trim()) { setSent(true); setEscalation('') } }}>Send to professor 🔒</Button>
      )}
    </div>
  )
}
