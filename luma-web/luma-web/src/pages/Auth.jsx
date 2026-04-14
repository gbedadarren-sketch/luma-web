import { useState } from 'react'
import { Button, Input, Divider } from '../components/UI'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage({ onBack }) {
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signIn, signUp } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setSuccess(true)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative',
    }}>
      {/* Background */}
      <div style={{
        position: 'fixed', top: '-100px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(124,111,255,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px', animation: 'fadeUp 0.4s ease' }}>
          <div style={{
            width: '48px', height: '48px',
            background: 'var(--accent)', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', color: '#fff',
            margin: '0 auto 16px',
          }}>L</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800,
            letterSpacing: '-0.5px', marginBottom: '6px',
          }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: '14px', fontWeight: 300 }}>
            {mode === 'signin' ? 'Sign in to your Luma account' : 'Start studying smarter today'}
          </p>
        </div>

        {success ? (
          <div style={{
            background: 'rgba(62,207,142,0.08)', border: '1px solid rgba(62,207,142,0.2)',
            borderRadius: 'var(--radius)', padding: '20px', textAlign: 'center',
            animation: 'fadeUp 0.3s ease',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>✉️</div>
            <p style={{ fontWeight: 500, marginBottom: '6px' }}>Check your email</p>
            <p style={{ fontSize: '13px', color: 'var(--text2)' }}>
              We sent a confirmation link to <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '28px',
            animation: 'fadeUp 0.4s 0.05s ease both',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <Input
              label="Email"
              type="email"
              placeholder="you@indiana.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />

            {error && (
              <div style={{
                background: 'rgba(255,85,85,0.08)', border: '1px solid rgba(255,85,85,0.2)',
                borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                fontSize: '13px', color: 'var(--red)',
              }}>{error}</div>
            )}

            <Button type="submit" loading={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {mode === 'signin' ? 'Sign in' : 'Create account'} →
            </Button>

            <Divider label="or" />

            <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text2)' }}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}
                style={{
                  background: 'none', border: 'none', color: 'var(--accent2)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', color: 'var(--text3)',
            fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>← Back to home</button>
        </div>
      </div>
    </div>
  )
}
