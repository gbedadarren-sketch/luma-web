import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Landing from './pages/Landing'
import AuthPage from './pages/Auth'
import Dashboard from './pages/Dashboard'
import WidgetWrapper from './components/WidgetWrapper'

function AppContent() {
  const { user, loading } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  // Check if opened as widget (e.g. via ?widget=1 in URL)
  const isWidget = new URLSearchParams(window.location.search).get('widget') === '1'

  if (loading) return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '16px',
    }}>
      <div style={{
        width: '36px', height: '36px', background: 'var(--accent)', borderRadius: '9px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '16px', color: '#fff',
      }}>L</div>
      <div style={{ width: '20px', height: '20px', border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (user) return (
    <WidgetWrapper mode={isWidget ? 'widget' : 'full'}>
      <Dashboard />
    </WidgetWrapper>
  )

  if (showAuth) return <AuthPage onBack={() => setShowAuth(false)} />

  return <Landing onGetStarted={() => setShowAuth(true)} />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
