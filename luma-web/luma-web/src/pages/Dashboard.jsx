import { useState, useRef, useEffect, useCallback } from 'react'
import { Button, Badge, Spinner, Card, Modal, Input, Textarea } from '../components/UI'
import { callClaude, extractPdfText } from '../lib/api'
import { supabase } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useLocalStorage } from '../hooks/useLocalStorage'

// ── ICONS ─────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('chat')
  const [sources, setSources] = useLocalStorage('luma_sources', [])
  const [kbText, setKbText] = useLocalStorage('luma_kb_text', '')
  const [sessions, setSessions] = useLocalStorage('luma_sessions', [])
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useLocalStorage('luma_transcript', '')
  const [recordingTime, setRecordingTime] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showAddSource, setShowAddSource] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [confusion, setConfusion] = useState(null)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const msgsEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Init session
  useEffect(() => {
    if (!activeSession) {
      const id = Date.now().toString()
      setActiveSession(id)
      setMessages([{
        id: '0', role: 'assistant',
        content: sources.length > 0
          ? `Knowledge base loaded with ${sources.length} source${sources.length > 1 ? 's' : ''}. Ask me anything about your materials.`
          : 'Add sources to your knowledge base, then ask me anything.',
        ts: Date.now(),
      }])
    }
  }, [])

  // ── RECORDING ────────────────────────────────────────────────
  function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Speech recognition requires Chrome.'); return }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = e => {
      let t = transcript
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) t += e.results[i][0].transcript + ' '
      }
      setTranscript(t)
    }
    rec.onerror = () => stopRecording()
    rec.onend = () => { if (isRecording) { try { rec.start() } catch(e){} } }
    rec.start()
    recognitionRef.current = rec
    setIsRecording(true)
    setRecordingTime(0)
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
  }

  function stopRecording() {
    if (recognitionRef.current) { recognitionRef.current.onend = null; try { recognitionRef.current.stop() } catch(e){} }
    setIsRecording(false)
    clearInterval(timerRef.current)
  }

  const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  // ── SOURCES ──────────────────────────────────────────────────
  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadLoading(true)
    setUploadError('')
    try {
      const reader = new FileReader()
      const base64 = await new Promise((res, rej) => {
        reader.onload = e => res(e.target.result.split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const text = await extractPdfText({ base64 })
      const name = file.name.replace(/\.[^.]+$/, '')
      addSource(name, text)
    } catch (err) {
      setUploadError(err.message || 'Failed to read PDF')
    } finally {
      setUploadLoading(false)
      e.target.value = ''
    }
  }

  function addSource(name, text) {
    if (!text.trim()) return
    const label = name || `Source ${sources.length + 1}`
    const newSource = { id: Date.now().toString(), name: label, chars: text.length, added: Date.now() }
    const marker = `\n\n=== ${label} ===\n`
    setSources(prev => [...prev.filter(s => s.name !== label), newSource])
    setKbText(prev => prev + marker + text)
    setShowAddSource(false)
    setPasteText('')
    setSourceName('')
    addSystemMsg(`Added "${label}" to knowledge base (${Math.round(text.length/1000)}k chars).`)
  }

  function removeSource(id) {
    const src = sources.find(s => s.id === id)
    if (!src) return
    setSources(prev => prev.filter(s => s.id !== id))
    const marker = `\n\n=== ${src.name} ===\n`
    const mi = kbText.indexOf(marker)
    if (mi !== -1) {
      const ni = kbText.indexOf('\n\n=== ', mi + marker.length)
      setKbText(ni !== -1 ? kbText.slice(0, mi) + kbText.slice(ni) : kbText.slice(0, mi))
    }
  }

  function addSystemMsg(text) {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: text, ts: Date.now() }])
  }

  // ── CHAT ─────────────────────────────────────────────────────
  async function sendMessage(q = input.trim()) {
    if (!q || sending) return
    setInput('')
    setSending(true)

    const userMsg = { id: Date.now().toString(), role: 'user', content: q, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])

    const thinkingId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, { id: thinkingId, role: 'thinking', content: '', ts: Date.now() }])

    try {
      const system = buildSystem()
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content }))

      const answer = await callClaude({
        system,
        messages: [...history, { role: 'user', content: q }],
        maxTokens: 800,
      })

      setMessages(prev => prev
        .filter(m => m.id !== thinkingId)
        .concat({ id: Date.now().toString(), role: 'assistant', content: answer, ts: Date.now() })
      )
    } catch (err) {
      setMessages(prev => prev
        .filter(m => m.id !== thinkingId)
        .concat({ id: Date.now().toString(), role: 'error', content: err.message, ts: Date.now() })
      )
    } finally {
      setSending(false)
    }
  }

  function buildSystem() {
    let sys = `You are Luma, a real-time AI study assistant for Indiana University students.`
    sys += `\n\nRules: Lead with a direct answer. Be concise but complete. Use bullet points for lists. Format answers clearly with markdown. Never say "great question".`

    if (kbText && kbText.length > 10) {
      sys += `\n\n## KNOWLEDGE BASE (${sources.length} source${sources.length !== 1 ? 's' : ''}):\n${kbText.slice(0, 45000)}\n[END KNOWLEDGE BASE]\n\nAlways reference the knowledge base when relevant. Quote directly from source material when helpful.`
    }
    if (transcript && transcript.length > 20) {
      sys += `\n\n## LIVE LECTURE TRANSCRIPT (current session):\n${transcript.slice(-6000)}`
    }
    return sys
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── EXPORT ───────────────────────────────────────────────────
  function exportNotes() {
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const chatContent = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `**${m.role === 'user' ? 'You' : 'Luma'}:** ${m.content}`)
      .join('\n\n')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Luma Notes</title>
    <style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.7;color:#1a1a1a}
    h1{font-size:28px;margin-bottom:4px}pre{background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:13px}
    .user{background:#f0eeff;padding:12px 16px;border-radius:8px;margin:8px 0}
    .ai{padding:12px 0;border-bottom:1px solid #eee}</style></head>
    <body><h1>Luma Study Notes</h1><p style="color:#666">${date}</p><hr style="margin:24px 0">
    ${transcript ? `<h2>Lecture Transcript</h2><pre>${transcript}</pre><hr style="margin:24px 0">` : ''}
    <h2>Chat Session</h2>${messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m =>
      `<div class="${m.role}"><strong>${m.role === 'user' ? 'You' : '✦ Luma'}</strong><p>${m.content.replace(/\n/g,'<br>')}</p></div>`
    ).join('')}
    </body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300) }
  }

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: '260px', flexShrink: 0,
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: '28px', height: '28px', background: 'var(--accent)', borderRadius: '7px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '13px', color: '#fff',
            flexShrink: 0,
          }}>L</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', flex: 1 }}>Luma</span>
          <Badge color={isRecording ? 'red' : 'gray'}>{isRecording ? 'Live' : 'Idle'}</Badge>
        </div>

        {/* NAV */}
        <nav style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[
            { id: 'chat', label: 'Chat', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
            { id: 'sources', label: 'Sources', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6' },
            { id: 'transcript', label: 'Transcript', icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
            { id: 'status', label: 'Status', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                border: 'none', background: activeTab === tab.id ? 'var(--surface2)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)',
                fontSize: '13px', fontWeight: activeTab === tab.id ? 500 : 400,
                fontFamily: 'var(--font-body)', textAlign: 'left',
                transition: 'all 0.15s', cursor: 'pointer',
              }}
            >
              <Icon d={tab.icon} size={15} />
              {tab.label}
              {tab.id === 'sources' && sources.length > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'var(--accent)', color: '#fff',
                  borderRadius: '99px', padding: '1px 7px', fontSize: '10px', fontWeight: 600,
                }}>{sources.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* RECORDING CARD */}
        <div style={{ margin: '0 12px', padding: '14px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recording</span>
            {isRecording && (
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--red)', fontWeight: 600 }}>
                {fmtTime(recordingTime)}
              </span>
            )}
          </div>
          <Button
            variant={isRecording ? 'danger' : 'primary'}
            style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? (
              <><span style={{ width: '8px', height: '8px', background: 'currentColor', borderRadius: '2px', flexShrink: 0 }} /> Stop</>
            ) : (
              <><span style={{ width: '8px', height: '8px', background: 'currentColor', borderRadius: '50%', flexShrink: 0, animation: 'none' }} /> Start recording</>
            )}
          </Button>
          {wordCount > 0 && (
            <p style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '8px', textAlign: 'center' }}>
              {wordCount.toLocaleString()} words captured
            </p>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* USER */}
        <div style={{
          padding: '14px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || 'Guest'}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text3)' }}>Student</p>
          </div>
          <button onClick={() => setShowSettings(true)} style={{
            background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '4px',
          }}>
            <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" size={15} />
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <>
            {/* Header */}
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg)',
            }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700 }}>Chat</h2>
                <p style={{ fontSize: '11px', color: 'var(--text3)' }}>
                  {sources.length > 0
                    ? `${sources.length} source${sources.length > 1 ? 's' : ''} in knowledge base`
                    : 'No sources — add PDFs or paste notes in Sources tab'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="ghost" size="sm" onClick={exportNotes}>Export notes</Button>
                <Button variant="ghost" size="sm" onClick={() => { setMessages([]); setActiveSession(Date.now().toString()) }}>
                  New session
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map(msg => <Message key={msg.id} msg={msg} onChip={q => sendMessage(q)} />)}
              <div ref={msgsEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid var(--border)',
              background: 'var(--bg)',
            }}>
              {sources.length === 0 && (
                <div style={{
                  marginBottom: '10px', padding: '10px 14px',
                  background: 'rgba(124,111,255,0.06)', border: '1px solid rgba(124,111,255,0.12)',
                  borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>💡 Add sources for better answers</span>
                  <button onClick={() => setActiveTab('sources')} style={{
                    background: 'none', border: 'none', color: 'var(--accent2)', fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500,
                  }}>Add sources →</button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about the lecture, your slides, or any concept…"
                  rows={1}
                  style={{
                    flex: 1, resize: 'none', minHeight: '44px', maxHeight: '140px',
                    padding: '11px 14px', fontSize: '14px', lineHeight: '1.5',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontFamily: 'var(--font-body)',
                    transition: 'border-color 0.15s',
                    outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px' }}
                />
                <Button onClick={() => sendMessage()} loading={sending} disabled={!input.trim()} style={{ height: '44px', padding: '0 18px' }}>
                  <Icon d="M22 2L11 13 M22 2L15 22 8 13 2 6z" size={15} />
                </Button>
              </div>
              <p style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '6px', textAlign: 'center' }}>
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}

        {/* SOURCES TAB */}
        {activeTab === 'sources' && (
          <SourcesPanel
            sources={sources}
            onAddPaste={(name, text) => addSource(name, text)}
            onRemove={removeSource}
            onUpload={() => fileInputRef.current?.click()}
            uploadLoading={uploadLoading}
            uploadError={uploadError}
          />
        )}

        {/* TRANSCRIPT TAB */}
        {activeTab === 'transcript' && (
          <TranscriptPanel
            transcript={transcript}
            onClear={() => setTranscript('')}
            wordCount={wordCount}
            isRecording={isRecording}
          />
        )}

        {/* STATUS TAB */}
        {activeTab === 'status' && (
          <StatusPanel confusion={confusion} onSetConfusion={setConfusion} />
        )}
      </main>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileUpload} />

      {/* SETTINGS MODAL */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <SettingsPanel onSignOut={signOut} />
      </Modal>
    </div>
  )
}

// ── MESSAGE COMPONENT ─────────────────────────────────────────
function Message({ msg, onChip }) {
  if (msg.role === 'thinking') return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>L</span>
      </div>
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', paddingTop: '6px' }}>
        {[0, 150, 300].map(delay => (
          <span key={delay} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', opacity: 0.6, animation: `pulse 1.2s ${delay}ms infinite` }} />
        ))}
      </div>
    </div>
  )

  if (msg.role === 'system') return (
    <div style={{ textAlign: 'center' }}>
      <span style={{ fontSize: '11px', color: 'var(--text3)', background: 'var(--surface)', padding: '3px 10px', borderRadius: '99px', border: '1px solid var(--border)' }}>
        {msg.content}
      </span>
    </div>
  )

  if (msg.role === 'error') return (
    <div style={{ background: 'rgba(255,85,85,0.08)', border: '1px solid rgba(255,85,85,0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '13px', color: 'var(--red)' }}>
      Error: {msg.content}
    </div>
  )

  if (msg.role === 'user') return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'fadeUp 0.2s ease' }}>
      <div style={{
        background: 'var(--accent)', color: '#fff',
        borderRadius: '14px 14px 4px 14px',
        padding: '10px 16px', maxWidth: '72%',
        fontSize: '14px', lineHeight: 1.55,
      }}>{msg.content}</div>
    </div>
  )

  // Assistant
  const chips = ['Explain simpler', 'Go deeper', 'Give an example']
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', animation: 'fadeUp 0.2s ease' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent) 0%, #5c4fff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>L</span>
      </div>
      <div style={{ flex: 1, maxWidth: 'calc(100% - 40px)' }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>✦ Luma</div>
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: '4px 14px 14px 14px',
          padding: '12px 16px', fontSize: '14px', lineHeight: 1.65, color: 'var(--text)',
        }}>
          <MarkdownText text={msg.content} />
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
          {chips.map(chip => (
            <button key={chip} onClick={() => onChip(chip)} style={{
              background: 'none', border: '1px solid var(--border2)',
              borderRadius: '99px', padding: '3px 10px',
              fontSize: '11px', color: 'var(--text3)', cursor: 'pointer',
              fontFamily: 'var(--font-body)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent2)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text3)' }}
            >{chip}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Simple markdown renderer
function MarkdownText({ text }) {
  const html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:var(--surface);padding:1px 5px;border-radius:3px;font-size:13px">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:600;margin:10px 0 4px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:15px;font-weight:600;margin:12px 0 6px">$1</h2>')
    .replace(/^- (.+)$/gm, '<li style="margin:3px 0;padding-left:4px">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>)/gs, '<ul style="padding-left:18px;margin:6px 0">$1</ul>')
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    .replace(/\n/g, '<br>')
  return <div dangerouslySetInnerHTML={{ __html: `<p style="margin:0">${html}</p>` }} />
}

// ── SOURCES PANEL ─────────────────────────────────────────────
function SourcesPanel({ sources, onAddPaste, onRemove, onUpload, uploadLoading, uploadError }) {
  const [pasteText, setPasteText] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [pasteError, setPasteError] = useState('')

  function handleAddPaste() {
    if (!pasteText.trim()) { setPasteError('Paste some text first'); return }
    onAddPaste(sourceName || `Source ${sources.length + 1}`, pasteText)
    setPasteText(''); setSourceName(''); setPasteError('')
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: source list */}
      <div style={{ width: '280px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700 }}>Knowledge Base</h2>
            <p style={{ fontSize: '11px', color: 'var(--text3)' }}>{sources.length} source{sources.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          {sources.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>📚</div>
              <p style={{ fontSize: '13px', color: 'var(--text3)' }}>No sources yet. Add PDFs or paste text.</p>
            </div>
          ) : sources.map(src => (
            <div key={src.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', marginBottom: '6px',
              background: 'var(--surface)',
            }}>
              <span style={{ fontSize: '16px' }}>📄</span>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.name}</p>
                <p style={{ fontSize: '10px', color: 'var(--text3)' }}>{Math.round(src.chars / 1000)}k chars</p>
              </div>
              <button onClick={() => onRemove(src.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '2px', fontSize: '14px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
              >×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Right: add source */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Add a source</h3>

        {/* PDF upload */}
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Upload PDF</p>
          <div
            onClick={onUpload}
            style={{
              border: '2px dashed var(--border2)', borderRadius: 'var(--radius)',
              padding: '32px', textAlign: 'center', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(124,111,255,0.04)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'transparent' }}
          >
            {uploadLoading ? (
              <><Spinner size={24} /><p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text2)' }}>Extracting text with AI...</p></>
            ) : (
              <>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>⬆</div>
                <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Click to upload PDF</p>
                <p style={{ fontSize: '12px', color: 'var(--text3)' }}>AI extracts all text automatically · Max 20MB</p>
              </>
            )}
          </div>
          {uploadError && <p style={{ fontSize: '12px', color: 'var(--red)', marginTop: '6px' }}>{uploadError}</p>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>or paste text directly</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Paste text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>Source name</label>
            <input
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              placeholder="e.g. W14 M&A Slides, Chapter 5 Notes"
              style={{ fontSize: '13px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: '6px' }}>
              Text content
              <span style={{ marginLeft: '8px', fontWeight: 400, color: 'var(--text3)' }}>
                Open PowerPoint → Ctrl+A → Ctrl+C → paste here
              </span>
            </label>
            <textarea
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setPasteError('') }}
              placeholder="Paste slide text, lecture notes, textbook excerpts, Canvas content…"
              rows={10}
              style={{ fontSize: '13px', resize: 'vertical' }}
            />
          </div>
          {pasteError && <p style={{ fontSize: '12px', color: 'var(--red)' }}>{pasteError}</p>}
          <Button onClick={handleAddPaste} disabled={!pasteText.trim()} style={{ alignSelf: 'flex-start' }}>
            Add to knowledge base →
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── TRANSCRIPT PANEL ──────────────────────────────────────────
function TranscriptPanel({ transcript, onClear, wordCount, isRecording }) {
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
            <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.3 }}>🎙</div>
            <p style={{ color: 'var(--text3)', fontSize: '14px' }}>Start recording to capture the lecture</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── STATUS PANEL ──────────────────────────────────────────────
function StatusPanel({ confusion, onSetConfusion }) {
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '32px' }}>
        {levels.map(l => (
          <button key={l.id} onClick={() => onSetConfusion(l.id)} style={{
            padding: '18px 12px', borderRadius: 'var(--radius)',
            border: `1px solid ${confusion === l.id ? l.color : 'var(--border)'}`,
            background: confusion === l.id ? `${l.color}15` : 'var(--surface)',
            color: confusion === l.id ? l.color : 'var(--text2)',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '8px', transition: 'all 0.15s',
            fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: confusion === l.id ? 600 : 400,
          }}>
            <span style={{ fontSize: '24px' }}>{l.emoji}</span>
            {l.label}
          </button>
        ))}
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
        Escalate anonymously
      </h3>
      <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '12px' }}>
        Send an anonymous question to your professor without raising your hand.
      </p>
      <textarea
        value={escalation}
        onChange={e => { setEscalation(e.target.value); setSent(false) }}
        placeholder="What concept are you stuck on?"
        rows={3}
        style={{ marginBottom: '10px', fontSize: '13px', resize: 'vertical' }}
      />
      {sent ? (
        <p style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 500 }}>✓ Sent anonymously</p>
      ) : (
        <Button size="sm" onClick={() => { if (escalation.trim()) { setSent(true); setEscalation('') } }}>
          Send to professor 🔒
        </Button>
      )}
    </div>
  )
}

// ── SETTINGS PANEL ────────────────────────────────────────────
function SettingsPanel({ onSignOut }) {
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState('')

  async function handleTest() {
    setTesting(true); setStatus('')
    try {
      const result = await callClaude({
        messages: [{ role: 'user', content: 'Reply with just: working!' }],
        system: 'Reply with just: working!',
        maxTokens: 20,
      })
      setStatus(result.includes('working') ? '✓ AI is connected and working!' : '✓ Connected')
    } catch (e) {
      setStatus('✗ ' + e.message)
    } finally { setTesting(false) }
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
