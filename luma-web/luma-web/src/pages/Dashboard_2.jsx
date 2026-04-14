import { useState, useRef, useEffect } from 'react'
import { Button, Modal } from '../components/UI'
import { callClaude, extractPdfText } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { SourcesPanel, SettingsPanel, TranscriptPanel, StatusPanel } from './Panels'

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
  const [messages, setMessages] = useState([{ id: '0', role: 'assistant', content: 'Add sources to your knowledge base, then ask me anything.', ts: Date.now() }])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useLocalStorage('luma_transcript', '')
  const [recordingTime, setRecordingTime] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [confusion, setConfusion] = useState(null)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const msgsEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0
  const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  // ── RECORDING ────────────────────────────────────────────────
  function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { addMsg('assistant', 'Speech recognition requires Chrome.'); return }
    const rec = new SR()
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'
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
    setIsRecording(true); setRecordingTime(0)
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
  }

  function stopRecording() {
    if (recognitionRef.current) { recognitionRef.current.onend = null; try { recognitionRef.current.stop() } catch(e){} }
    setIsRecording(false); clearInterval(timerRef.current)
  }

  // ── SOURCES ──────────────────────────────────────────────────
  async function handleFileUpload(e) {
    const file = e.target.files[0]; if (!file) return
    setUploadLoading(true); setUploadError('')
    try {
      const reader = new FileReader()
      const base64 = await new Promise((res, rej) => { reader.onload = e => res(e.target.result.split(',')[1]); reader.onerror = rej; reader.readAsDataURL(file) })
      const text = await extractPdfText({ base64 })
      addSource(file.name.replace(/\.[^.]+$/, ''), text)
    } catch (err) { setUploadError(err.message || 'Failed to read PDF') }
    finally { setUploadLoading(false); e.target.value = '' }
  }

  function addSource(name, text) {
    if (!text.trim()) return
    const src = { id: Date.now().toString(), name, chars: text.length, added: Date.now() }
    const marker = `\n\n=== ${name} ===\n`
    setSources(prev => [...prev.filter(s => s.name !== name), src])
    setKbText(prev => prev + marker + text)
    addMsg('assistant', `✓ Added "${name}" to knowledge base (${Math.round(text.length/1000)}k chars). Ask me anything about it.`)
  }

  function removeSource(id) {
    const src = sources.find(s => s.id === id); if (!src) return
    setSources(prev => prev.filter(s => s.id !== id))
    const marker = `\n\n=== ${src.name} ===\n`
    const mi = kbText.indexOf(marker)
    if (mi !== -1) {
      const ni = kbText.indexOf('\n\n=== ', mi + marker.length)
      setKbText(ni !== -1 ? kbText.slice(0, mi) + kbText.slice(ni) : kbText.slice(0, mi))
    }
  }

  // ── CHAT ─────────────────────────────────────────────────────
  function addMsg(role, content) {
    setMessages(prev => [...prev, { id: Date.now().toString(), role, content, ts: Date.now() }])
  }

  async function sendMessage(q = input.trim()) {
    if (!q || sending) return
    setInput(''); setSending(true)
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: q, ts: Date.now() }])
    const thinkId = 'think-' + Date.now()
    setMessages(prev => [...prev, { id: thinkId, role: 'thinking', content: '', ts: Date.now() }])
    try {
      let system = `You are Luma, a real-time AI study assistant for Indiana University students. Lead with a direct answer. Be concise. Never say "great question".`
      if (kbText && kbText.length > 10) system += `\n\n## KNOWLEDGE BASE:\n${kbText.slice(0, 45000)}\n[END]\n\nAlways reference the knowledge base when relevant.`
      if (transcript && transcript.length > 20) system += `\n\n## LIVE TRANSCRIPT:\n${transcript.slice(-6000)}`
      const history = messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-8).map(m => ({ role: m.role, content: m.content }))
      const answer = await callClaude({ system, messages: [...history, { role: 'user', content: q }], maxTokens: 800 })
      setMessages(prev => prev.filter(m => m.id !== thinkId).concat({ id: Date.now().toString(), role: 'assistant', content: answer, ts: Date.now() }))
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== thinkId).concat({ id: Date.now().toString(), role: 'error', content: err.message, ts: Date.now() }))
    } finally { setSending(false) }
  }

  function exportNotes() {
    const html = `<html><body style="font-family:sans-serif;max-width:760px;margin:40px auto"><h1>Luma Notes</h1><hr>${messages.filter(m=>m.role==='user'||m.role==='assistant').map(m=>`<div style="margin:12px 0"><strong>${m.role==='user'?'You':'✦ Luma'}:</strong><p>${m.content.replace(/\n/g,'<br>')}</p></div>`).join('')}</body></html>`
    const w = window.open('','_blank'); if (w) { w.document.write(html); w.document.close(); setTimeout(()=>w.print(),300) }
  }

  const tabs = [
    { id: 'chat', label: 'Chat', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
    { id: 'sources', label: 'Sources', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6' },
    { id: 'transcript', label: 'Transcript', icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
    { id: 'status', label: 'Status', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      {/* SIDEBAR */}
      <aside style={{ width: '240px', flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '26px', height: '26px', background: 'var(--accent)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '12px', color: '#fff', flexShrink: 0 }}>L</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>Luma</span>
          <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: isRecording ? 'rgba(255,85,85,0.15)' : 'rgba(255,255,255,0.05)', color: isRecording ? 'var(--red)' : 'var(--text3)', border: `1px solid ${isRecording ? 'rgba(255,85,85,0.3)' : 'var(--border)'}` }}>{isRecording ? 'Live' : 'Idle'}</span>
        </div>
        <nav style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: 'var(--radius-sm)', border: 'none', background: activeTab === tab.id ? 'var(--surface2)' : 'transparent', color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)', fontSize: '13px', fontWeight: activeTab === tab.id ? 500 : 400, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all .15s' }}>
              <Icon d={tab.icon} size={14} />{tab.label}
              {tab.id === 'sources' && sources.length > 0 && <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: '#fff', borderRadius: '99px', padding: '1px 6px', fontSize: '10px' }}>{sources.length}</span>}
            </button>
          ))}
        </nav>
        <div style={{ margin: '0 10px 10px', padding: '12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Recording</span>
            {isRecording && <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--red)' }}>{fmtTime(recordingTime)}</span>}
          </div>
          <Button variant={isRecording ? 'danger' : 'primary'} style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }} onClick={isRecording ? stopRecording : startRecording}>
            {isRecording ? '■ Stop' : '● Start recording'}
          </Button>
          {wordCount > 0 && <p style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '6px', textAlign: 'center' }}>{wordCount.toLocaleString()} words</p>}
        </div>
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{user?.email?.[0]?.toUpperCase() || 'U'}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <p style={{ fontSize: '11px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'Guest'}</p>
          </div>
          <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '2px' }}>
            <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" size={14} />
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        {activeTab === 'chat' && (
          <>
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700 }}>Chat</h2>
                <p style={{ fontSize: '11px', color: 'var(--text3)' }}>{sources.length > 0 ? `${sources.length} source${sources.length > 1 ? 's' : ''} loaded` : 'No sources — add in Sources tab'}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="ghost" size="sm" onClick={exportNotes}>Export</Button>
                <Button variant="ghost" size="sm" onClick={() => { setMessages([{ id: '0', role: 'assistant', content: 'New session started.', ts: Date.now() }]) }}>New session</Button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map(msg => <Message key={msg.id} msg={msg} onChip={q => sendMessage(q)} />)}
              <div ref={msgsEndRef} />
            </div>
            {sources.length === 0 && (
              <div style={{ margin: '0 24px 8px', padding: '9px 14px', background: 'rgba(124,111,255,0.06)', border: '1px solid rgba(124,111,255,0.12)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>💡 Add sources for better answers</span>
                <button onClick={() => setActiveTab('sources')} style={{ background: 'none', border: 'none', color: 'var(--accent2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}>Add sources →</button>
              </div>
            )}
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} placeholder="Ask about the lecture, your slides, or any concept…" rows={1} style={{ flex: 1, resize: 'none', minHeight: '44px', maxHeight: '120px', padding: '11px 14px', fontSize: '14px', lineHeight: 1.5, borderRadius: 'var(--radius-sm)', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none' }} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }} />
              <Button onClick={() => sendMessage()} loading={sending} disabled={!input.trim()} style={{ height: '44px', padding: '0 16px' }}>→</Button>
            </div>
          </>
        )}
        {activeTab === 'sources' && (
          <>
            <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileUpload} />
            <SourcesPanel sources={sources} onAddPaste={(name, text) => addSource(name, text)} onRemove={removeSource} onUpload={() => fileInputRef.current?.click()} uploadLoading={uploadLoading} uploadError={uploadError} />
          </>
        )}
        {activeTab === 'transcript' && <TranscriptPanel transcript={transcript} onClear={() => setTranscript('')} wordCount={wordCount} isRecording={isRecording} />}
        {activeTab === 'status' && <StatusPanel confusion={confusion} onSetConfusion={setConfusion} />}
      </main>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <SettingsPanel onSignOut={signOut} />
      </Modal>
    </div>
  )
}

function Message({ msg, onChip }) {
  if (msg.role === 'thinking') return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>L</span></div>
      <div style={{ display: 'flex', gap: '4px', paddingTop: '2px' }}>{[0,150,300].map(d => <span key={d} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', opacity: 0.6, animation: `pulse 1.2s ${d}ms infinite` }} />)}</div>
    </div>
  )
  if (msg.role === 'system') return <div style={{ textAlign: 'center' }}><span style={{ fontSize: '11px', color: 'var(--text3)', background: 'var(--surface)', padding: '3px 10px', borderRadius: '99px', border: '1px solid var(--border)' }}>{msg.content}</span></div>
  if (msg.role === 'error') return <div style={{ background: 'rgba(255,85,85,0.08)', border: '1px solid rgba(255,85,85,0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '13px', color: 'var(--red)' }}>{msg.content}</div>
  if (msg.role === 'user') return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'fadeUp .2s ease' }}>
      <div style={{ background: 'var(--accent)', color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '10px 16px', maxWidth: '72%', fontSize: '14px', lineHeight: 1.55 }}>{msg.content}</div>
    </div>
  )
  return (
    <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', animation: 'fadeUp .2s ease' }}>
      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),#5c4fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}><span style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>L</span></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px' }}>✦ Luma</div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px 14px 14px 14px', padding: '11px 15px', fontSize: '14px', lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
        <div style={{ display: 'flex', gap: '5px', marginTop: '6px', flexWrap: 'wrap' }}>
          {['Explain simpler','Go deeper','Give an example'].map(chip => (
            <button key={chip} onClick={() => onChip(chip)} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: '99px', padding: '3px 9px', fontSize: '11px', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent2)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.color='var(--text3)' }}
            >{chip}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
