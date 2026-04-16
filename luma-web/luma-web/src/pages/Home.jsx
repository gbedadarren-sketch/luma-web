import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const S = {
  page: { minHeight: '100vh', background: '#080810', fontFamily: 'system-ui, sans-serif' },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem 1.5rem', borderBottom: '1px solid #1e1e3a',
    background: '#0d0d1a',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: '.5rem', color: '#fff',
    fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none',
  },
  logoMark: {
    width: 32, height: 32, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700, color: '#fff',
  },
  navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  userChip: {
    background: '#1a1a2e', border: '1px solid #2d2d4a', borderRadius: '999px',
    padding: '.3rem .75rem', color: '#9ca3af', fontSize: '.8rem',
  },
  signOutBtn: {
    background: 'none', border: '1px solid #2d2d4a', borderRadius: '.4rem',
    padding: '.35rem .75rem', color: '#6b7280', cursor: 'pointer', fontSize: '.85rem',
  },
  main: { maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  greeting: { color: '#fff', fontSize: '1.6rem', fontWeight: 700 },
  sub: { color: '#6b7280', fontSize: '.9rem', marginTop: '.25rem' },
  primaryBtn: {
    background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff',
    border: 'none', borderRadius: '.5rem', padding: '.7rem 1.25rem',
    fontWeight: 600, cursor: 'pointer', fontSize: '.9rem',
  },
  joinRow: { display: 'flex', gap: '.75rem', alignItems: 'center' },
  joinInput: {
    background: '#1a1a2e', border: '1px solid #2d2d4a', borderRadius: '.5rem',
    padding: '.7rem 1rem', color: '#fff', fontSize: '.9rem', outline: 'none',
    width: 140, letterSpacing: '.1em', textTransform: 'uppercase',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' },
  card: {
    background: '#10101e', border: '1px solid #1e1e3a', borderRadius: '1rem',
    padding: '1.5rem', cursor: 'pointer', transition: 'border-color .15s',
    textDecoration: 'none', display: 'block',
  },
  cardCode: {
    display: 'inline-block', background: 'rgba(124,58,237,.15)',
    border: '1px solid rgba(124,58,237,.3)', borderRadius: '.4rem',
    padding: '.2rem .6rem', color: '#a78bfa', fontSize: '.75rem',
    fontWeight: 700, letterSpacing: '.1em', marginBottom: '.75rem',
  },
  cardName: { color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: '.4rem' },
  cardDesc: { color: '#6b7280', fontSize: '.85rem', marginBottom: '.75rem', lineHeight: 1.5 },
  cardMeta: { color: '#4b5563', fontSize: '.8rem' },
  empty: {
    textAlign: 'center', padding: '3rem 1rem', color: '#4b5563', border: '2px dashed #1e1e3a',
    borderRadius: '1rem',
  },
  sectionTitle: { color: '#9ca3af', fontSize: '.8rem', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '1rem' },
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem',
  },
  modalCard: {
    background: '#10101e', border: '1px solid #1e1e3a', borderRadius: '1rem',
    padding: '2rem', width: '100%', maxWidth: '400px',
  },
  modalTitle: { color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '.5rem' },
  modalSub: { color: '#6b7280', fontSize: '.875rem', marginBottom: '1.5rem' },
  label: { display: 'block', color: '#9ca3af', fontSize: '.85rem', marginBottom: '.4rem' },
  input: {
    width: '100%', background: '#1a1a2e', border: '1px solid #2d2d4a', borderRadius: '.5rem',
    padding: '.75rem 1rem', color: '#fff', fontSize: '1rem', outline: 'none',
    boxSizing: 'border-box', marginBottom: '1rem',
  },
  modalBtns: { display: 'flex', gap: '.75rem', justifyContent: 'flex-end', marginTop: '.5rem' },
  cancelBtn: {
    background: 'none', border: '1px solid #2d2d4a', borderRadius: '.5rem',
    padding: '.6rem 1.25rem', color: '#9ca3af', cursor: 'pointer', fontSize: '.9rem',
  },
  error: { color: '#f87171', fontSize: '.85rem', marginBottom: '1rem' },
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Home({ user }) {
  const navigate = useNavigate()
  const role = user?.user_metadata?.role || 'student'
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseDesc, setNewCourseDesc] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => { loadCourses() }, [])

  async function loadCourses() {
    setLoading(true)
    try {
      if (role === 'professor') {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('professor_id', user.id)
          .order('created_at', { ascending: false })
        if (error) throw error
        setCourses(data || [])
      } else {
        const { data, error } = await supabase
          .from('enrollments')
          .select('*, courses(*)')
          .eq('student_id', user.id)
          .order('enrolled_at', { ascending: false })
        if (error) throw error
        setCourses((data || []).map(e => e.courses).filter(Boolean))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newCourseName.trim()) return
    setCreateLoading(true)
    setCreateError('')
    try {
      const code = generateCode()
      const { data, error } = await supabase.from('courses').insert({
        name: newCourseName.trim(),
        description: newCourseDesc.trim() || null,
        code,
        professor_id: user.id,
        professor_name: displayName,
      }).select().single()
      if (error) throw error
      setCourses(prev => [data, ...prev])
      setShowCreate(false)
      setNewCourseName('')
      setNewCourseDesc('')
      navigate(`/class/${data.id}`)
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoinError('')
    const code = joinCode.trim().toUpperCase()
    try {
      const { data: course, error: findErr } = await supabase
        .from('courses')
        .select('*')
        .eq('code', code)
        .single()
      if (findErr || !course) { setJoinError('Course not found. Check the code and try again.'); return }

      // Check not already enrolled
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('course_id', course.id)
        .single()
      if (existing) { navigate(`/class/${course.id}`); return }

      const { error: enrollErr } = await supabase.from('enrollments').insert({
        student_id: user.id,
        course_id: course.id,
      })
      if (enrollErr) throw enrollErr
      navigate(`/class/${course.id}`)
    } catch (err) {
      setJoinError(err.message)
    }
  }

  return (
    <div style={S.page}>
      {/* Nav */}
      <nav style={S.nav}>
        <div style={S.logo}>
          <div style={S.logoMark}>L</div>
          <span>Luma</span>
          <span style={{ background: '#1e1e3a', color: '#7c3aed', fontSize: '.65rem', fontWeight: 700, padding: '.15rem .4rem', borderRadius: '4px', marginLeft: '.25rem' }}>Beta</span>
        </div>
        <div style={S.navRight}>
          <span style={S.userChip}>{role === 'professor' ? '🏫' : '🎓'} {displayName}</span>
          <button style={S.signOutBtn} onClick={async () => { await supabase.auth.signOut() }}>Sign out</button>
        </div>
      </nav>

      <main style={S.main}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <h1 style={S.greeting}>Hey, {displayName.split(' ')[0]} 👋</h1>
            <p style={S.sub}>
              {role === 'professor'
                ? 'Manage your courses and see student activity.'
                : 'Your enrolled courses — pick one to start studying.'}
            </p>
          </div>

          role === 'professor' ? (
            <button style={S.primaryBtn} onClick={() => setShowCreate(true)}>+ Create course</button>
          ) : (
            <form onSubmit={handleJoin} style={S.joinRow}>
              <input
                style={S.joinInput}
                placeholder="Class code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                maxLength={6}
              />
              <button style={S.primaryBtn} type="submit">Join →</button>
            </form>
          )}
        </div>

        {joinError && <p style={{ color: '#f87171', marginBottom: '1rem', fontSize: '.875rem' }}>{joinError}</p>}

        {/* Courses */}
        <p style={S.sectionTitle}>
          {role === 'professor' ? 'Your courses' : 'Enrolled courses'}
          {' '}· {courses.length}
        </p>

        {loading ? (
          <p style={{ color: '#4b5563' }}>Loading courses...</p>
        ) : courses.length === 0 ? (
          <div style={S.empty}>
            {role === 'professor' ? (
              <>
                <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>📚</p>
                <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '.5rem' }}>No courses yet</p>
                <p style={{ fontSize: '.875rem' }}>Create your first course to get started.</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>🎓</p>
                <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '.5rem' }}>No courses yet</p>
                <p style={{ fontSize: '.875rem' }}>Enter a class code above to join your first course.</p>
              </>
            )}
          </div>
        ) : (
          <div style={S.grid}>
            {courses.map(course => (
              <div
                key={course.id}
                style={S.card}
                onClick={() => navigate(`/class/${course.id}`)}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#7c3aed'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e3a'}
              >
                <span style={S.cardCode}>{course.code}</span>
                <div style={S.cardName}>{course.name}</div>
                {course.description && <div style={S.cardDesc}>{course.description}</div>}
                <div style={S.cardMeta}>
                  {role === 'student' && course.professor_name ? `Prof. ${course.professor_name}` : 'Open to study →'}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Course Modal */}
      {showCreate && (
        <div style={S.modal} onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div style={S.modalCard}>
            <h2 style={S.modalTitle}>Create a course</h2>
            <p style={S.modalSub}>A unique 6-character class code will be generated automatically.</p>
            {createError && <p style={S.error}>{createError}</p>}
            <form onSubmit={handleCreate}>
              <label style={S.label}>Course name *</label>
              <input
                style={S.input}
                placeholder="e.g. FIN301 — Corporate Finance"
                value={newCourseName}
                onChange={e => setNewCourseName(e.target.value)}
                required
                autoFocus
              />
              <label style={S.label}>Description (optional)</label>
              <input
                style={S.input}
                placeholder="Brief description of the course"
                value={newCourseDesc}
                onChange={e => setNewCourseDesc(e.target.value)}
              />
              <div style={S.modalBtns}>
                <button type="button" style={S.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" style={S.primaryBtn} disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create course →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

