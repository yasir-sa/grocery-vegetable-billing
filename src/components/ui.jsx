import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useShop } from '../lib/store'
import { money } from '../lib/pricing'

// ---------- Icons (inline SVG, no icon font needed offline) ----------
const PATHS = {
  bill: 'M6 2h12v20l-3-2-3 2-3-2-3 2V2zm3 5h6M9 11h6M9 15h4',
  box: 'M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm9 3l-4.3-4.3',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
  check: 'M5 12l5 5L20 7',
  download: 'M12 3v12m0 0l-5-5m5 5l5-5M4 21h16',
  upload: 'M12 21V9m0 0l-5 5m5-5l5 5M4 3h16',
  camera: 'M4 7h3l2-3h6l2 3h3v13H4V7zm8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  qr: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h3v3h-3v-3zm4 4h3v3h-3v-3zm-4 3v-1m7-7v1',
  cash: 'M2 6h20v12H2V6zm10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9v.01M18 15v.01',
  cart: 'M3 4h2l3 12h11l2-8H7M9 20a1 1 0 1 0 0-.01M18 20a1 1 0 1 0 0-.01',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20',
  leaf: 'M5 21c0-9 5-15 15-17-1 10-7 15-15 15M5 21l7-7',
  basket: 'M3 10h18l-2 10H5L3 10zm4 0l5-6 5 6',
}
export function Icon({ name, size = 20, stroke = 2, className = '' }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}

// ---------- Item photo (or an emoji tile when there is no photo) ----------
export function ItemPhoto({ item, size = 'md' }) {
  if (item?.photo) return <img className={`item-photo item-photo--${size}`} src={item.photo} alt="" loading="lazy" />
  return (
    <span className={`item-photo item-photo--${size} item-photo--emoji item-photo--${item?.shop ?? 'grocery'}`} aria-hidden="true">
      {item?.emoji || (item?.shop === 'vegetable' ? '🥬' : '🛒')}
    </span>
  )
}

// ---------- Modal / bottom sheet ----------
export function Modal({ open, onClose, title, children, wide = false, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    setTimeout(() => ref.current?.querySelector('input, button.btn-primary')?.focus(), 60)
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll') }
  }, [open, onClose])
  if (!open) return null
  // Rendered on <body> so page animations/sticky headers can never cover it.
  return createPortal(
    <div className="modal-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div ref={ref} className={`modal ${wide ? 'modal--wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        {title && (
          <div className="modal__head">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function Confirm({ open, text, onYes, onNo }) {
  const { t } = useShop()
  return (
    <Modal open={open} onClose={onNo} className="modal--confirm">
      <p className="confirm__text">{text}</p>
      <div className="modal__actions">
        <button type="button" className="btn" onClick={onNo}>{t('common.no')}</button>
        <button type="button" className="btn btn-danger" onClick={onYes}>{t('common.yes')}</button>
      </div>
    </Modal>
  )
}

export function Toasts() {
  const { toasts } = useShop()
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((x) => (
        <div key={x.id} className={`toast toast--${x.kind}`}>
          <Icon name={x.kind === 'error' ? 'x' : 'check'} size={18} /> {x.text}
        </div>
      ))}
    </div>
  )
}

// ---------- Segmented buttons (shop filter, period) ----------
export function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div className={`seg ${className}`} role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value}
          className={value === o.value ? 'is-active' : ''} onClick={() => onChange(o.value)}>
          {o.icon && <span className="seg__icon">{o.icon}</span>}{o.label}
        </button>
      ))}
    </div>
  )
}

// ---------- Animated number ----------
export function CountUp({ value, format = money }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    const b = value
    let raf = 0
    const step = (now) => {
      const p = Math.min(1, (now - start) / 600)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(a + (b - a) * eased)
      if (p < 1) raf = requestAnimationFrame(step)
      else from.current = b
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{format(shown)}</>
}

// ---------- Bar chart (SVG, animated bars, tap a bar to see its value) ----------
export function BarChart({ data, labelOf, field = 'total' }) {
  const [active, setActive] = useState(null)
  const values = data.map((d) => d[field] || 0)
  const maxPos = Math.max(0, ...values)
  const maxNeg = Math.max(0, ...values.map((v) => -v))
  const range = Math.max(1, maxPos + maxNeg)
  const zero = (maxNeg / range) * 100 // % from the bottom where 0 sits (losses go below it)
  const W = 100 / data.length
  return (
    <div className="chart">
      <div className="chart__bars">
        {maxNeg > 0 && <span className="chart__zero" style={{ bottom: `${zero}%` }}></span>}
        {data.map((d, i) => {
          const v = values[i]
          const h = (Math.abs(v) / range) * 100
          return (
            <button key={d.key} type="button" className={`chart__col${active === i ? ' is-active' : ''}`}
              style={{ width: `${W}%` }} onClick={() => setActive(active === i ? null : i)}
              title={`${labelOf(d, true)}: ${money(v)}`} aria-label={`${labelOf(d, true)}: ${money(v)}`}>
              {active === i && <span className="chart__tip" style={{ bottom: `${zero + (v > 0 ? h : 0)}%` }}>{money(v)}</span>}
              <span className={`chart__bar${v < 0 ? ' chart__bar--neg' : ''}`}
                style={{ height: `${h}%`, bottom: v < 0 ? `${zero - h}%` : `${zero}%`, animationDelay: `${i * 18}ms` }}></span>
            </button>
          )
        })}
      </div>
      <div className="chart__labels">
        {data.map((d, i) => (
          <span key={d.key} style={{ width: `${W}%` }}>
            {data.length > 12 ? (i % Math.ceil(data.length / 10) === 0 ? labelOf(d) : '') : labelOf(d)}
          </span>
        ))}
      </div>
    </div>
  )
}
