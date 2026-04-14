import { useState } from 'react'
import { Button, Badge } from '../components/UI'

const features = [
  {
    icon: '⬡',
    title: 'Knowledge Base',
    desc: 'Upload PDFs or paste notes. Luma reads everything and answers from your exact materials.',
  },
  {
    icon: '◎',
    title: 'Live Transcription',
    desc: 'Records your lecture in real time. Ask questions about what was just said.',
  },
  {
    icon: '◈',
    title: 'Instant Answers',
    desc: 'Ask anything — concepts, examples, definitions — and get an answer in under 2 seconds.',
  },
  {
    icon: '◇',
    title: 'Anonymous Escalation',
    desc: 'Confused? Send an anonymous question to your professor without raising your hand.',
  },
  {
    icon: '⬠',
    title: 'Session Memory',
    desc: 'Every chat session is saved. Review your questions and answers after class.',
  },
  {
    icon: '◉',
    title: 'Export Notes',
    desc: 'Generate a clean study doc from your transcript and questions with one click.',
  },
]

export default function Landing({ onGetStarted }) {
  const [hoveredFeature, setHoveredFeature] = useState(null)

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(124,111,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(124,111,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* Glow orbs */}
      <div style={{
        position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '500px',
        background: 'radial-gradient(ellipse, rgba(124,111,255,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 48px',
        background: 'rgba(8,8,15,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px',
            background: 'var(--accent)', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '14px', color: '#fff',
          }}>L</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', letterSpacing: '-0.3px' }}>Luma</span>
          <Badge color="accent">Beta</Badge>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" onClick={onGetStarted}>Log in</Button>
          <Button onClick={onGetStarted}>Get started free →</Button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        position: 'relative', zIndex: 1,
        paddingTop: '160px', paddingBottom: '120px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '160px 24px 100px',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(124,111,255,0.1)', border: '1px solid rgba(124,111,255,0.2)',
          borderRadius: '99px', padding: '6px 14px', marginBottom: '32px',
          fontSize: '12px', color: 'var(--accent2)', fontWeight: 500,
          animation: 'fadeUp 0.5s ease both',
        }}>
          <span style={{ width: '6px', height: '6px', background: 'var(--accent)', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
          Built for IU students · Powered by Claude AI
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(42px, 8vw, 80px)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-2px',
          maxWidth: '800px',
          marginBottom: '24px',
          animation: 'fadeUp 0.5s 0.1s ease both',
        }}>
          Your AI study
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #a99fff 0%, #7c6fff 50%, #5c4fff 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            partner in class
          </span>
        </h1>

        <p style={{
          fontSize: '18px', color: 'var(--text2)', maxWidth: '520px',
          lineHeight: 1.65, marginBottom: '40px',
          animation: 'fadeUp 0.5s 0.2s ease both',
          fontWeight: 300,
        }}>
          Upload your slides, record the lecture, and ask questions in real time.
          Luma reads your materials and answers instantly — like NotebookLM, built for live class.
        </p>

        <div style={{
          display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center',
          animation: 'fadeUp 0.5s 0.3s ease both',
        }}>
          <Button size="lg" onClick={onGetStarted} style={{ fontSize: '15px', padding: '13px 28px' }}>
            Start for free →
          </Button>
          <Button size="lg" variant="ghost" onClick={onGetStarted} style={{ fontSize: '15px' }}>
            See how it works
          </Button>
        </div>

        <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text3)', animation: 'fadeUp 0.5s 0.4s ease both' }}>
          No credit card required · Works with Canvas · IU email recommended
        </p>
      </section>

      {/* FEATURES */}
      <section style={{
        position: 'relative', zIndex: 1,
        maxWidth: '1100px', margin: '0 auto', padding: '0 24px 100px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700,
            letterSpacing: '-1px', marginBottom: '12px',
          }}>Everything you need to follow along</h2>
          <p style={{ color: 'var(--text2)', fontSize: '16px', fontWeight: 300 }}>
            Built around how students actually learn — not how apps think they do.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {features.map((f, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{
                background: hoveredFeature === i ? 'var(--bg3)' : 'var(--bg2)',
                border: `1px solid ${hoveredFeature === i ? 'var(--border2)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '28px',
                transition: 'all 0.2s',
                transform: hoveredFeature === i ? 'translateY(-3px)' : 'none',
                cursor: 'default',
                animation: `fadeUp 0.5s ${0.1 * i}s ease both`,
              }}
            >
              <div style={{
                fontSize: '24px', marginBottom: '14px', color: 'var(--accent)',
                lineHeight: 1,
              }}>{f.icon}</div>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700,
                marginBottom: '8px', letterSpacing: '-0.3px',
              }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        position: 'relative', zIndex: 1,
        textAlign: 'center', padding: '60px 24px 120px',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '300px',
          background: 'radial-gradient(ellipse, rgba(124,111,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: 800,
          letterSpacing: '-1.5px', marginBottom: '16px', position: 'relative',
        }}>Ready to actually understand your lectures?</h2>
        <p style={{ color: 'var(--text2)', fontSize: '16px', marginBottom: '32px', fontWeight: 300 }}>
          Join hundreds of IU students using Luma every day.
        </p>
        <Button size="lg" onClick={onGetStarted} style={{ fontSize: '15px', padding: '14px 32px' }}>
          Create free account →
        </Button>
      </section>
    </div>
  )
}
