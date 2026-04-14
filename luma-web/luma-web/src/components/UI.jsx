import { useState } from 'react'

// ── BUTTON ────────────────────────────────────────────────────
const variants = {
  primary: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text2)',
    border: '1px solid var(--border2)',
  },
  danger: {
    background: 'transparent',
    color: 'var(--red)',
    border: '1px solid rgba(255,85,85,0.3)',
  },
  subtle: {
    background: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  },
}

export function Button({ children, variant = 'primary', size = 'md', loading, disabled, onClick, style, className, type = 'button' }) {
  const v = variants[variant] || variants.primary
  const pad = size === 'sm' ? '6px 12px' : size === 'lg' ? '12px 24px' : '9px 18px'
  const fontSize = size === 'sm' ? '12px' : size === 'lg' ? '15px' : '13px'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      style={{
        ...v,
        padding: pad,
        fontSize,
        fontWeight: 500,
        borderRadius: 'var(--radius-sm)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        opacity: (disabled || loading) ? 0.5 : 1,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-body)',
        transition: 'all 0.15s',
        ...style,
      }}
      onMouseEnter={e => { if (!disabled && !loading) e.currentTarget.style.filter = 'brightness(1.12)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}

// ── SPINNER ───────────────────────────────────────────────────
export function Spinner({ size = 20, color = 'currentColor' }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

// ── CARD ──────────────────────────────────────────────────────
export function Card({ children, style, onClick, hoverable }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px',
        transition: hoverable ? 'border-color 0.15s, transform 0.15s' : undefined,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={e => { if (hoverable) { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { if (hoverable) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' } }}
    >
      {children}
    </div>
  )
}

// ── BADGE ─────────────────────────────────────────────────────
export function Badge({ children, color = 'accent' }) {
  const colors = {
    accent: { bg: 'rgba(124,111,255,0.12)', text: 'var(--accent2)', border: 'rgba(124,111,255,0.2)' },
    green:  { bg: 'rgba(62,207,142,0.1)',   text: 'var(--green)',   border: 'rgba(62,207,142,0.2)' },
    red:    { bg: 'rgba(255,85,85,0.1)',     text: 'var(--red)',     border: 'rgba(255,85,85,0.2)' },
    amber:  { bg: 'rgba(240,160,48,0.1)',    text: 'var(--amber)',   border: 'rgba(240,160,48,0.2)' },
    gray:   { bg: 'rgba(255,255,255,0.05)', text: 'var(--text3)',   border: 'var(--border)' },
  }
  const c = colors[color] || colors.accent
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      padding: '3px 9px', borderRadius: '99px',
      fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

// ── INPUT ─────────────────────────────────────────────────────
export function Input({ label, error, hint, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text2)', letterSpacing: '0.02em' }}>{label}</label>}
      <input {...props} style={{ ...props.style }} />
      {error && <span style={{ fontSize: '11px', color: 'var(--red)' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{hint}</span>}
    </div>
  )
}

// ── TEXTAREA ──────────────────────────────────────────────────
export function Textarea({ label, error, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text2)' }}>{label}</label>}
      <textarea {...props} style={{ resize: 'vertical', minHeight: '100px', ...props.style }} />
      {error && <span style={{ fontSize: '11px', color: 'var(--red)' }}>{error}</span>}
    </div>
  )
}

// ── DIVIDER ───────────────────────────────────────────────────
export function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      {label && <span style={{ fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
    </div>
  )
}

// ── MODAL ─────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '16px',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-lg)',
          width: '100%', maxWidth: width,
          padding: '28px',
          animation: 'fadeUp 0.2s ease',
        }}
      >
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700 }}>{title}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '20px', lineHeight: 1, padding: '4px', cursor: 'pointer' }}>×</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ── TOOLTIP ───────────────────────────────────────────────────
export function Tooltip({ children, text }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && text && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: '6px', padding: '5px 10px',
          fontSize: '11px', color: 'var(--text2)', whiteSpace: 'nowrap',
          zIndex: 100, pointerEvents: 'none',
          animation: 'fadeIn 0.1s ease',
        }}>{text}</div>
      )}
    </div>
  )
}
