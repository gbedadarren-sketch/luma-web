import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Home from './pages/Home'
import ClassRoom from './pages/ClassRoom'

function ProtectedRoute({ children, user }) {
  if (!user) return <Navigate to="/auth" replace />
    return children
    }

    export default function App() {
      const [user, setUser] = useState(null)
        const [loading, setLoading] = useState(true)

          useEffect(() => {
              supabase.auth.getSession().then(({ data: { session } }) => {
                    setUser(session?.user ?? null)
                          setLoading(false)
                              })
                                  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                                        setUser(session?.user ?? null)
                                            })
                                                return () => subscription.unsubscribe()
                                                  }, [])

                                                    if (loading) {
                                                        return (
                                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080810', color: '#6b7280', fontFamily: 'system-ui, sans-serif' }}>
                                                                      Loading...
                                                                            </div>
                                                                                )
                                                                                  }

                                                                                    return (
                                                                                        <BrowserRouter>
                                                                                              <Routes>
                                                                                                      <Route path="/" element={<Landing />} />
                                                                                                              <Route path="/auth" element={user ? <Navigate to="/home" replace /> : <Auth />} />
                                                                                                                      <Route path="/home" element={<ProtectedRoute user={user}><Home user={user} /></ProtectedRoute>} />
                                                                                                                              <Route path="/class/:id" element={<ProtectedRoute user={user}><ClassRoom user={user} /></ProtectedRoute>} />
                                                                                                                                      <Route path="/dashboard" element={<Navigate to="/home" replace />} />
                                                                                                                                              <Route path="*" element={<Navigate to="/" replace />} />
                                                                                                                                                    </Routes>
                                                                                                                                                        </BrowserRouter>
                                                                                                                                                          )
                                                                                                                                                          }
                                                                                                                                                          