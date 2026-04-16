import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { callClaude, extractPdfText } from '../lib/api'

/* ─── Styles ─── */
const C = {
  // Layout
  page: { minHeight: '100vh', background: '#080810', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '.75rem 1.25rem', background: '#0d0d1a', borderBottom: '1px solid #1e1e3a',
    flexShrink: 0,
  },
  topLeft: { display: 'flex', alignItems: 'center', gap: '.75rem' },
  backBtn: { background: 'none', border: '1px solid #2d2d4a', borderRadius: '.4rem', padding: '.3rem .65rem', color: '#6b7280', cursor: 'pointer', fontSize: '.8rem' },
  courseCode: { background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.3)', borderRadius: '.4rem', padding: '.2rem .5rem', color: '#a78bfa', fontSize: '.75rem', fontWeight: 700, letterSpacing: '.1em' },
  courseName: { color: '#fff', fontWeight: 700, fontSize: '1rem' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },

  // Sidebar tabs (desktop)
  sidebar: { width: 200, background: '#0d0d1a', borderRight: '1px solid #1e1e3a', padding: '1rem .75rem', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '.25rem' },
  tabBtn: (active) => ({
    display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.65rem .75rem', borderRadius: '.5rem',
    background: active ? 'rgba(124,58,237,.15)' : 'transparent',
    border: active ? '1px solid rgba(124,58,237,.3)' : '1px solid transparent',
    color: active ? '#a78bfa' : '#6b7280', cursor: 'pointer', fontSize: '.875rem',
    fontWeight: active ? 600 : 400, textAlign: 'left', width: '100%',
  }),

  // Content
  content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },

  // Chat
  chatWrap: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  messages: { flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  msgUser: {
    alignSelf: 'flex-end', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
    color: '#fff', borderRadius: '1rem 1rem 0 1rem', padding: '.75rem 1rem',
    maxWidth: '80%', fontSize: '.9rem', lineHeight: 1.5,
  },
  msgBot: {
    alignSelf: 'flex-start', background: '#10101e', border: '1px solid #1e1e3a',
    color: '#e5e7eb', borderRadius: '1rem 1rem 1rem 0', padding: '.75rem 1rem',
    maxWidth: '80%', fontSize: '.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
  },
  msgLabel: { fontSize: '.7rem', color: '#4b5563', marginBottom: '.25rem', paddingLeft: '.25rem' },
  inputRow: {
    padding: '1rem 1.25rem', borderTop: '1px solid #1e1e3a',
    display: 'flex', gap: '.75rem', alignItems: 'flex-end',
  },
  chatInput: {
    flex: 1, background: '#1a1a2e', border: '1px solid #2d2d4a', borderRadius: '.75rem',
    padding: '.75rem 1rem', color: '#fff', fontSize: '.9rem', outline: 'none',
    resize: 'none', minHeight: 44, maxHeight: 120, lineHeight: 1.5,
    fontFamily: 'system-ui, sans-serif',
  },
  sendBtn: {
    background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff',
    border: 'none', borderRadius: '.65rem', padding: '.7rem 1.1rem',
    cursor: 'pointer', fontWeight: 600, fontSize: '.875rem', flexShrink: 0,
  },

  // Panel generic
  panel: { flex: 1, padding: '1.5rem', overflowY: 'auto' },
  panelTitle: { color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '.4rem' },
  panelSub: { color: '#6b7280', fontSize: '.875rem', marginBottom: '1.5rem', lineHeight: 1.5 },

  // Sources
  textarea: {
    width: '100%', background: '#1a1a2e', border: '1px solid #2d2d4a', borderRadius: '.5rem',
    padding: '.75rem 1rem', color: '#fff', fontSize: '.875rem', outline: 'none',
    resize: 'vertical', minHeight: 180, boxSizing: 'border-box',
    fontFamily: 'system-ui, sans-serif', lineHeight: 1.5,
  },
  addBtn: {
    marginTop: '.75rem', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff',
    border: 'none', borderRadius: '.5rem', padding: '.65rem 1.25rem',
    fontWeight: 600, cursor: 'pointer', fontSize: '.875rem',
  },
  sourceChip: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#10101e', border: '1px solid #1e1e3a', borderRadius: '.5rem',
    padding: '.6rem .85rem', marginBottom: '.5rem',
  },
  sourceChipName: { color: '#e5e7eb', fontSize: '.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '.5rem' },
  removeBtn: { background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '1rem', padding: 0 },
  uploadArea: {
    border: '2px dashed #2d2d4a', borderRadius: '.75rem', padding: '2rem 1rem',
    textAlign: 'center', cursor: 'pointer', marginBottom: '1rem', color: '#6b7280',
  },

  // Transcript
  recBtn: (recording) => ({
    display: 'flex', alignItems: 'center', gap: '.5rem',
    background: recording ? 'rgba(239,68,68,.15)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
    border: recording ? '1px solid rgba(239,68,68,.4)' : 'none',
    color: recording ? '#f87171' : '#fff', borderRadius: '.5rem',
    padding: '.7rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '.875rem',
    marginBottom: '1rem',
  }),
  transcriptBox: {
    background: '#10101e', border: '1px solid #1e1e3a', borderRadius: '.75rem',
    padding: '1rem', minHeight: 200, color: '#d1d5db', fontSize: '.9rem',
    lineHeight: 1.7, whiteSpace: 'pre-wrap',
  },

  // Status
  statusGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginTop: '1rem' },
  statusCard: (selected, color) => ({
    background: selected ? `rgba(${color},.15)` : '#10101e',
    border: `2px solid ${selected ? `rgba(${color},.5)` : '#1e1e3a'}`,
    borderRadius: '1rem', padding: '1.5rem 1rem', textAlign: 'center',
    cursor: 'pointer', transition: 'all .15s',
  }),
  statusEmoji: { fontSize: '2rem', marginBottom: '.5rem' },
  statusLabel: (selected, color) => ({ color: selected ? `rgb(${color})` : '#6b7280', fontWeight: 700, fontSize: '.9rem' }),

  // Students
  studentRow: {
    display: 'flex', alignItems: 'center', gap: '.75rem',
    padding: '.75rem', background: '#10101e', border: '1px solid #1e1e3a',
    borderRadius: '.5rem', marginBottom: '.5rem',
  },
  avatar: {
    width: 36, height: 36, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: '.875rem', flexShrink: 0,
  },
  codeBox: {
    background: 'rgba(124,58,237,.1)', border: '2px solid rgba(124,58,237,.3)',
    borderRadius: '.75rem', padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem',
  },
  codeDisplay: { color: '#a78bfa', fontSize: '2rem', fontWeight: 700, letterSpacing: '.2em' },
  codeCaption: { color: '#6b7280', fontSize: '.8rem', marginTop: '.5rem' },
}

const TABS_STUDENT = [
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'sources', icon: '📄', label: 'Sources' },
  { id: 'transcript', icon: '🎤', label: 'Transcript' },
  { id: 'status', icon: '📊', label: 'Status' },
]
const TABS_PROFESSOR = [...TABS_STUDENT, { id: 'students', icon: '👥', label: 'Students' }]

const STATUS_OPTIONS = [
  { id: 'lost', emoji: '😵', label: 'Lost', color: '239,68,68' },
  { id: 'unsure', emoji: '🤔', label: 'Unsure', color: '245,158,11' },
  { id: 'got_it', emoji: '✅', label: 'Got it!', color: '34,197,94' },
]

export default function ClassRoom({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const role = user?.user_metadata?.role || 'student'
  const tabs = role === 'professor' ? TABS_PROFESSOR : TABS_STUDENT

  const [course, setCourse] = useState(null)
  const [activeTab, setActiveTab] = useState('chat')

  // Chat
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Sources
  const [sources, setSources] = useState([]) // [{name, text}]
  const [pasteText, setPasteText] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  // Transcript
  const [transcript, setTranscript] = useState('')
  const [recording, setRecording] = useState(false)
  const recognitionRef = useRef(null)

  // Status
  const [myStatus, setMyStatus] = useState(null)

  // Students
  const [students, setStudents] = useState([])

  useEffect(() => { loadCourse() }, [id])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadCourse() {
    const { data, error } = await supabase.from('courses').select('*').eq('id', id).single()
    if (error || !data) { navigate('/home'); return }
    setCourse(data)
    if (role === 'professor') loadStudents(id)
  }

  async function loadStudents(courseId) {
    const { data } = await supabase
      .from('enrollments')
      .select('student_id, enrolled_at')
      .eq('course_id', courseId)
    setStudents(data || [])
  }

  function buildSystem() {
    let sys = `You are Luma, an AI study assistant for the course "${course?.name || 'this course'}".
Be helpful, clear, and encouraging. Answer questions based on the provided materials when possible.`
    if (sources.length > 0) {
      sys += '\n\n--- COURSE MATERIALS ---\n'
      sources.forEach(s => { sys += `\n[${s.name}]\n${s.text}\n` })
    }
    if (transcript.trim()) {
      sys += `\n\n--- LECTURE TRANSCRIPT ---\n${transcript}`
    }
    return sys
  }

  async function sendMessage(e) {
    e?.preventDefault()
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setChatLoading(true)
    try {
      const answer = await callClaude(newMessages.map(m => ({ role: m.role, content: m.content })), buildSystem())
      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally { setChatLoading(false) }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function addPasteSource() {
    if (!pasteText.trim()) return
    setSources(prev => [...prev, { name: `Pasted text ${prev.length + 1}`, text: pasteText.trim() }])
    setPasteText('')
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfLoading(true)
    try {
      const text = await extractPdfText(file)
      setSources(prev => [...prev, { name: file.name, text }])
    } catch {
      setSources(prev => [...prev, { name: file.name, text: `[PDF: ${file.name}]` }])
    } finally { setPdfLoading(false); e.target.value = '' }
  }

  function toggleRecording() {
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported. Try Chrome.'); return }
    const rec = new SR()
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'
    rec.onresult = (ev) => {
      let final = ''
      for (let i = 0; i < ev.results.length; i++) if (ev.results[i].isFinal) final += ev.results[i][0].transcript + ' '
      setTranscript(prev => {
        const base = prev.replace(/\[live\].*$/, '').trim()
        const interim = ev.results[ev.results.length-1]?.[0]?.transcript || ''
        return base + (base ? ' ' : '') + (final || '') + (interim && !ev.results[ev.results.length-1].isFinal ? `[live] ${interim}` : '')
      })
    }
    rec.onerror = rec.onend = () => setRecording(false)
    recognitionRef.current = rec; rec.start(); setRecording(true)
  }

  async function saveStatus(statusId) { setMyStatus(statusId) }

  if (!course) return (
    <div style={{ ...C.page, alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6b7280' }}>Loading...</p>
    </div>
  )

  return (
    <div style={C.page}>
      <div style={C.topBar}>
        <div style={C.topLeft}>
          <button style={C.backBtn} onClick={() => navigate('/home')}>← Back</button>
          <span style={C.courseCode}>{course.code}</span>
          <span style={C.courseName}>{course.name}</span>
        </div>
        <div style={{ color: '#4b5563', fontSize: '.8rem' }}>
          {role === 'professor' ? '🏫 Professor' : '🎓 Student'}
        </div>
      </div>
      <div style={C.body}>
        <div style={C.sidebar}>
          {tabs.map(tab => (
            <button key={tab.id} style={C.tabBtn(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
        <div style={C.content}>
          {activeTab === 'chat' && (
            <div style={C.chatWrap}>
              <div style={C.messages}>
                {messages.length === 0 && (<div style={{ textAlign: 'center', margin: 'auto', color: '#4b5563' }}><p style={{ fontSize: '2rem', marginBottom: '.5rem' }}>💬</p><p style={{ fontSize: '1rem', color: '#6b7280' }}>Ask Luma anything about this course</p></div>)}
                {messages.map((m, i) => (<div key={i}><div style={m.role === 'user' ? C.msgLabel : { ...C.msgLabel, textAlign: 'right' }}>{m.role === 'user' ? 'You' : 'Luma'}</div><div style={m.role === 'user' ? C.msgUser : C.msgBot}>{m.content}</div></div>))}
                {chatLoading && (<div><div style={C.msgLabel}>Luma</div><div style={C.msgBot}><span style={{ opacity: .6 }}>Thinking...</span></div></div>)}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} style={C.inputRow}>
                <textarea style={C.chatInput} placeholder="Ask about the lecture..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={handleKeyDown} rows={1} />
                <button style={C.sendBtn} type="submit" disabled={chatLoading || !chatInput.trim()}>Send</button>
              </form>
            </div>
          )}
          {activeTab === 'sources' && (
            <div style={C.panel}>
              <h2 style={C.panelTitle}>Course Materials</h2>
              <p style={C.panelSub}>Add slides, notes, or readings. Luma will use these to answer questions more accurately.</p>
              {sources.length > 0 && (<div style={{ marginBottom: '1.5rem' }}><p style={{ color: '#6b7280', fontSize: '.8rem', marginBottom: '.5rem' }}>{sources.length} source{sources.length !== 1 ? 's' : ''} added</p>{sources.map((s, i) => (<div key={i} style={C.sourceChip}><span style={{ marginRight: '.5rem' }}>📄</span><span style={C.sourceChipName}>{s.name}</span><button style={C.removeBtn} onClick={() => setSources(prev => prev.filter((_, j) => j !== i))}>✕</button></div>))}</div>)}
              <p style={{ color: '#9ca3af', fontSize: '.875rem', fontWeight: 600, marginBottom: '.5rem' }}>📋 Paste text</p>
              <textarea style={C.textarea} placeholder="Paste lecture slides or notes..." value={pasteText} onChange={e => setPasteText(e.target.value)} />
              <button style={C.addBtn} onClick={addPasteSource} disabled={!pasteText.trim()}>Add as source</button>
              <div style={{ marginTop: '2rem' }}><p style={{ color: '#9ca3af', fontSize: '.875rem', fontWeight: 600, marginBottom: '.5rem' }}>📎 Upload PDF</p><label style={C.uploadArea}><input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />{pdfLoading ? '⏳ Extracting...' : '+ Upload PDF'}</label></div>
            </div>
          )}
          {activeTab === 'transcript' && (
            <div style={C.panel}>
              <h2 style={C.panelTitle}>Live Transcript</h2>
              <p style={C.panelSub}>Record your lecture in real time.</p>
              <button style={C.recBtn(recording)} onClick={toggleRecording}>{recording ? '⏹ Stop' : '🎙 Start'}</button>
              <div style={C.transcriptBox}>{transcript || <span style={{ color: '#4b5563' }}>Transcript will appear here...</span>}</div>
              {transcript && (<button style={{ ...C.addBtn, background: 'transparent', border: '1px solid #2d2d4a', color: '#9ca3af', marginTop: '.75rem' }} onClick={() => { setSources(prev => [...prev, { name: 'Lecture Transcript', text: transcript }]); setActiveTab('sources') }}>Add to sources</button>)}
            </div>
          )}
          {activeTab === 'status' && (
            <div style={C.panel}>
              <h2 style={C.panelTitle}>Understanding Check</h2>
              <p style={C.panelSub}>How&�ell are you following?</p>
              <div style={C.statusGrid}>{STATUS_OPTIONS.map(opt => (<div key={opt.id} style={C.statusCard(myStatus === opt.id, opt.color)} onClick={() => saveStatus(opt.id)}><div style={C.statusEmoji}>{opt.emoji}</div><div style={C.statusLabel(myStatus === opt.id, opt.color)}>{opt.label}</div></div>))}</div>
              {myStatus && (<p style={{ color: '#6b7280', fontSize: '.875rem', textAlign: 'center', marginTop: '1.5rem' }}>Status: <strong style={{ color: '#a78bfa' }}>{STATUS_OPTIONS.find(o => o.id === myStatus)?.label}</strong></p>)}
            </div>
          )}
          {activeTab === 'students' && role === 'professor' && (
            <div style={C.panel}>
              <h2 style={C.panelTitle}>Students</h2>
              <p style={C.panelSub}>Share this code with students.</p>
              <div style={C.codeBox}><div style={C.codeDisplay}>{course.code}</div><div style={C.codeCaption}>Class code — tell students to enter on home screen</div><button style={{ marginTop: '.75rem', background: 'none', border: '1px solid rgba(124,58,237,.4)', borderRadius: '.4rem', padding: '.35rem .75rem', color: '#a78bfa', cursor: 'pointer', fontSize: '.8rem' }} onClick={() => navigator.clipboard.writeText(course.code)}>Copy code</button></div>
              <p style={{ color: '#6b7280', fontSize: '.8rem', marginBottom: '1rem' }}>{students.length} student{students.length !== 1 ? 's' : ''}</p>
              {students.length === 0 ? (<div style={{ color: '#4b5563', textAlign: 'center', padding: '2rem', border: '2px dashed #1e1e3a', borderRadius: '.75rem' }}>No students yet.</div>) : students.map((s, i) => (<div key={s.student_id} style={C.studentRow}><div style={C.avatar}>{String.fromCharCode(65+(i%26))}</div><div><div style={{ color: '#e5e7eb', fontSize: '.875rem' }}>Student {i+1}</div><div style={{ color: '#4b5563', fontSize: '.75rem' }}>Joined {new Date(s.enrolled_at).toLocaleDateString()}</div></div></div>))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

