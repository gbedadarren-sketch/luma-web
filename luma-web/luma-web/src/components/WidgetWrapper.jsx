import { useState, useRef, useEffect } from 'react'

// Modes: 'full' = full page dashboard, 'widget' = floating draggable panel
export default function WidgetWrapper({ children, mode = 'full' }) {
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [widgetMode, setWidgetMode] = useState(mode)
  const [pos, setPos] = useState({ x: null, y: null }) // null = use CSS default
  const [size, setSize] = useState({ w: 400, h: 600 })
  const dragging = useRef(false)
  const resizing = useRef(false)
  const dragStart = useRef({})
  const panelRef = useRef(null)

  // Listen for keyboard shortcut Ctrl+Shift+L to toggle widget
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        setWidgetMode(m => m === 'full' ? 'widget' : 'full')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (widgetMode === 'full') {
    return (
      <div style={{ position: 'relative' }}>
        {/* Toggle to widget mode button */}
        <button
          onClick={() => setWidgetMode('widget')}
          title="Switch to widget mode (Ctrl+Shift+L)"
          style={{
            position: 'fixed', bottom: '20px', right: '20px',
            width: '40px', height: '40px',
            background: 'rgba(124,111,255,0.15)', border: '1px solid rgba(124,111,255,0.3)',
            borderRadius: '50%', cursor: 'pointer', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent2)', fontSize: '16px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,111,255,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,111,255,0.15)'}
        >
          ⊞
        </button>
        {children}
      </div>
    )
  }

  // Widget mode — floating panel
  const panelStyle = {
    position: 'fixed',
    width: size.w + 'px',
    height: size.h + 'px',
    zIndex: 2147483647,
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
    display: widgetOpen ? 'flex' : 'none',
    flexDirection: 'column',
    transition: 'box-shadow 0.2s',
    userSelect: dragging.current ? 'none' : 'auto',
  }

  // Position: use dragged position or default bottom-right
  if (pos.x !== null) {
    panelStyle.left = pos.x + 'px'
    panelStyle.top = pos.y + 'px'
  } else {
    panelStyle.bottom = '80px'
    panelStyle.right = '20px'
  }

  function onDragStart(e) {
    if (e.target.closest('[data-no-drag]')) return
    dragging.current = true
    const rect = panelRef.current.getBoundingClientRect()
    dragStart.current = {
      mouseX: e.clientX, mouseY: e.clientY,
      panelX: rect.left, panelY: rect.top,
    }
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
    e.preventDefault()
  }

  function onDragMove(e) {
    if (!dragging.current) return
    const dx = e.clientX - dragStart.current.mouseX
    const dy = e.clientY - dragStart.current.mouseY
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - size.w, dragStart.current.panelX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - size.h, dragStart.current.panelY + dy)),
    })
  }

  function onDragEnd() {
    dragging.current = false
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
  }

  function onResizeStart(e) {
    resizing.current = true
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, w: size.w, h: size.h }
    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeEnd)
    e.preventDefault()
    e.stopPropagation()
  }

  function onResizeMove(e) {
    if (!resizing.current) return
    const dx = e.clientX - dragStart.current.mouseX
    const dy = e.clientY - dragStart.current.mouseY
    setSize({
      w: Math.max(320, Math.min(800, dragStart.current.w + dx)),
      h: Math.max(400, Math.min(900, dragStart.current.h + dy)),
    })
  }

  function onResizeEnd() {
    resizing.current = false
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
  }

  return (
    <>
      {/* Floating FAB button */}
      <button
        onClick={() => setWidgetOpen(o => !o)}
        style={{
          position: 'fixed', bottom: '20px', right: '20px',
          width: '52px', height: '52px', borderRadius: '50%',
          background: widgetOpen ? '#1a1a2e' : 'var(--accent)',
          border: widgetOpen ? '1px solid var(--border2)' : 'none',
          cursor: 'pointer', zIndex: 2147483647,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(124,111,255,0.4)',
          transition: 'all 0.2s',
          color: '#fff', fontSize: widgetOpen ? '20px' : '14px',
          fontFamily: 'var(--font-display)', fontWeight: 800,
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {widgetOpen ? '×' : 'L'}
      </button>

      {/* Floating panel */}
      <div ref={panelRef} style={panelStyle}>
        {/* Drag handle bar */}
        <div
          onMouseDown={onDragStart}
          style={{
            height: '28px', background: '#0a0a14',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            cursor: 'grab', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px',
          }}
        >
          <div style={{ display: 'flex', gap: '5px' }}>
            {['#ff5f57','#febc2e','#28c840'].map((c, i) => (
              <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.8 }} />
            ))}
          </div>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', userSelect: 'none' }}>
            drag to move
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} data-no-drag="true">
            {/* Expand to full page */}
            <button
              onClick={() => setWidgetMode('full')}
              title="Open full page"
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                cursor: 'pointer', fontSize: '12px', padding: '2px 4px',
                lineHeight: 1,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >
              ⤢
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>

        {/* Resize handle (bottom-right corner) */}
        <div
          onMouseDown={onResizeStart}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: '18px', height: '18px', cursor: 'nwse-resize',
            zIndex: 10,
          }}
        >
          <svg viewBox="0 0 10 10" style={{ position: 'absolute', bottom: '4px', right: '4px', opacity: 0.3 }}>
            <path d="M2 8 L8 2 M5 8 L8 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </>
  )
}
