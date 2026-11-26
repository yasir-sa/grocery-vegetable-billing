import { useMemo, useRef, useState } from 'react'
import { useShop } from '../lib/store'
import { itemName } from '../lib/i18n'
import { QUICK_QTY, formatQty, formatRate, money, round2, toBase } from '../lib/pricing'
import { fmtDate, fmtTime } from '../lib/dates'
import { elementToPdf } from '../lib/pdf'
import { Icon, ItemPhoto, Modal, Segmented } from '../components/ui'
import { ageDays, ageLevel, costFor, openLots, stockOf, valueAt } from '../lib/stock'

// Little "fly into the bill" animation from the tapped item to the bill icon.
function flyToCart(fromEl) {
  const target = [...document.querySelectorAll('[data-cart-target]')].find((el) => el.offsetParent !== null)
  const img = fromEl?.querySelector('.item-photo')
  if (!target || !img || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const a = img.getBoundingClientRect()
  const b = target.getBoundingClientRect()
  const ghost = img.cloneNode(true)
  Object.assign(ghost.style, { position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, zIndex: 999, borderRadius: '16px', pointerEvents: 'none' })
  document.body.appendChild(ghost)
  ghost.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${b.left - a.left + b.width / 2 - a.width / 2}px, ${b.top - a.top + b.height / 2 - a.height / 2}px) scale(0.15)`, opacity: 0.3 },
  ], { duration: 650, easing: 'cubic-bezier(.5,-0.2,.6,1)' }).onfinish = () => {
    ghost.remove()
    target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 300 })
  }
}

// ---------- choose quantity ----------
function QtySheet({ item, line, onClose, onSave, onRemove }) {
  const { t, lang, lots } = useShop()
  // Lots with stock, oldest first (FIFO) — the oldest is picked by default.
  const live = openLots(lots, item.id)
  const [lotId, setLotId] = useState(line ? (line.lotId ?? null) : (live[0]?.id ?? null))
  const lot = live.find((l) => l.id === lotId) ?? (lotId ? lots.find((l) => l.id === lotId) : null) ?? null
  const listRate = lot ? lot.price : item.price
  const priceQty = lot ? lot.priceQty : item.priceQty
  const costRate = lot ? lot.cost : item.costPrice
  const [disc, setDisc] = useState(Boolean(line && line.rate < line.listRate))
  const [rateText, setRateText] = useState(line && line.rate < line.listRate ? String(line.rate) : '')
  const big = item.unitType === 'weight' ? 'kg' : item.unitType === 'volume' ? 'l' : 'pcs'
  const small = item.unitType === 'weight' ? 'g' : item.unitType === 'volume' ? 'ml' : 'pcs'
  const startQty = line?.qty ?? (item.unitType === 'count' ? 1 : item.priceQty)
  const [qty, setQty] = useState(startQty)
  const [typed, setTyped] = useState('')
  const [unit, setUnit] = useState(small) // shopkeepers type "750" grams most often; kg is one tap away

  const rate = disc && Number(rateText) > 0 ? Number(rateText) : listRate
  const amount = valueAt(rate, priceQty, qty)
  const discount = round2(Math.max(0, valueAt(listRate, priceQty, qty) - amount))
  const belowCost = costRate > 0 && rate < costRate
  const over = Boolean(lot) && qty > lot.remaining
  const setTypedQty = (v, u = unit) => { setTyped(v); setQty(item.unitType === 'count' ? Number(v) || 0 : toBase(v, u)) }

  return (
    <Modal open onClose={onClose} title={itemName(item, lang)} className="qty-sheet">
      <div className="qty-sheet__top">
        <ItemPhoto item={item} size="lg" />
        <div>
          <span className={`tag tag--${item.shop}`}>{t(`shop.${item.shop}`)}</span>
          <p className="qty-sheet__rate">{money(rate)} / {formatQty(priceQty, item.unitType, t)}</p>
          {live.length > 0 && <small className="muted">📦 {formatQty(stockOf(lots, item.id), item.unitType, t)}</small>}
        </div>
      </div>

      {(live.length > 0 || lot) && (
        <>
          <p className="label">{t('bill.pickLot')}</p>
          <div className="lot-pick">
            {(lot && !live.includes(lot) ? [lot, ...live] : live).map((l) => {
              const d = ageDays(l.date)
              return (
                <button key={l.id} type="button" className={lotId === l.id ? 'is-active' : ''} onClick={() => setLotId(l.id)}>
                  <span className={`age-dot age-dot--${ageLevel(d)}`}></span>
                  <b>{fmtDate(l.date, lang, { day: '2-digit', month: 'short' })}</b>
                  <small>{formatQty(l.remaining, item.unitType, t)} {t('stock.left')}</small>
                  <em>{money(l.price)}</em>
                </button>
              )
            })}
            <button type="button" className={lotId === null ? 'is-active' : ''} onClick={() => setLotId(null)}>
              <b>{t('bill.noLot')}</b>
              <em>{money(item.price)}</em>
            </button>
          </div>
        </>
      )}

      <p className="label">{t('bill.qty')}</p>
      {item.unitType === 'count' ? (
        <div className="stepper">
          <button type="button" onClick={() => { setQty((q) => Math.max(1, q - 1)); setTyped('') }} aria-label="-"><Icon name="minus" /></button>
          <output>{qty}</output>
          <button type="button" onClick={() => { setQty((q) => q + 1); setTyped('') }} aria-label="+"><Icon name="plus" /></button>
        </div>
      ) : null}
      <div className="quick">
        {QUICK_QTY[item.unitType].map((q) => (
          <button key={q} type="button" className={qty === q && !typed ? 'is-active' : ''} onClick={() => { setQty(q); setTyped('') }}>
            {formatQty(q, item.unitType, t)}
          </button>
        ))}
      </div>
      <label className="field">
        <span>{t('bill.customQty')}</span>
        <div className="qty-input">
          <input type="number" inputMode="decimal" min="0" step="any" value={typed} placeholder={item.unitType === 'count' ? '4' : unit === big ? '1.5' : '750'}
            onChange={(e) => setTypedQty(e.target.value)} />
          {item.unitType !== 'count' ? (
            <select value={unit} onChange={(e) => { setUnit(e.target.value); if (typed) setTypedQty(typed, e.target.value) }}>
              <option value={small}>{t(`unit.${small}`)}</option>
              <option value={big}>{t(`unit.${big}`)}</option>
            </select>
          ) : <span className="qty-input__unit">{t('unit.pcs')}</span>}
        </div>
      </label>

      {over && <p className="warn">⚠️ {t('bill.overStock').replace('{left}', formatQty(lot.remaining, item.unitType, t))}</p>}

      <button type="button" className={`disc-toggle${disc ? ' is-on' : ''}`} onClick={() => { setDisc((v) => !v); if (disc) setRateText('') }}>
        🏷️ {t('bill.discount')}
      </button>
      {disc && (
        <div className="disc-box">
          <div className="chips">
            {[0.9, 0.8, 0.7, 0.5].map((f, i) => {
              const r = Math.round(listRate * f)
              return <button key={f} type="button" className={Number(rateText) === r ? 'is-active' : ''} onClick={() => setRateText(String(r))}>{money(r)} / {formatQty(priceQty, item.unitType, t)} <small>−{[10, 20, 30, 50][i]}%</small></button>
            })}
          </div>
          <label className="field">
            <span>{t('bill.rate')} / {formatQty(priceQty, item.unitType, t)} ({t('bill.normal')} {money(listRate)})</span>
            <input type="number" inputMode="decimal" min="0" step="0.5" value={rateText} onChange={(e) => setRateText(e.target.value)} placeholder={String(listRate)} />
          </label>
        </div>
      )}
      {belowCost && <p className="warn warn--bad">📉 {t('bill.belowCost')} ({t('stock.costPrice')} {money(costRate)})</p>}

      <div className="qty-sheet__amount">
        <span>{qty > 0 ? formatQty(qty, item.unitType, t) : '—'}{discount > 0 && <small className="disc-note">{t('bill.youGive')} −{money(discount)}</small>}</span>
        <strong key={amount} className="pop">{money(amount)}</strong>
      </div>

      <div className="modal__actions">
        {line && <button type="button" className="btn btn-ghost-danger" onClick={onRemove}><Icon name="trash" size={18} /> {t('bill.remove')}</button>}
        <button type="button" className="btn btn-primary btn-lg grow" disabled={!(qty > 0)} onClick={() => onSave({ qty, lot, rate, listRate, priceQty, costRate })}>
          <Icon name={line ? 'check' : 'plus'} /> {line ? t('bill.update') : t('bill.add')}
        </button>
      </div>
    </Modal>
  )
}

// ---------- the bill (cart) ----------
function CartPanel({ lines, onEdit, onClear, onCheckout, compact = false }) {
  const { t, lang } = useShop()
  const total = round2(lines.reduce((n, l) => n + l.amount, 0))
  const sub = (shop) => round2(lines.filter((l) => l.shop === shop).reduce((n, l) => n + l.amount, 0))
  return (
    <div className={`cart ${compact ? 'cart--sheet' : ''}`}>
      {!compact && (
        <div className="cart__head">
          <h2><span data-cart-target><Icon name="bill" /></span> {t('bill.cart')}</h2>
          {lines.length > 0 && <button type="button" className="link-btn" onClick={onClear}>{t('bill.clear')}</button>}
        </div>
      )}
      {lines.length === 0 ? (
        <div className="cart__empty"><span>🧾</span><p>{t('bill.empty')}</p></div>
      ) : (
        <ul className="cart__lines">
          {lines.map((l) => (
            <li key={l.id} className="cart-line">
              <button type="button" onClick={() => onEdit(l)}>
                <ItemPhoto item={l} size="xs" />
                <span className="cart-line__name">
                  <b>{itemName(l, lang)}</b>
                  <small>{formatQty(l.qty, l.unitType, t)} × {formatRate(l, t)}{l.discount > 0 && <em className="disc-tag"> −{money(l.discount)}</em>}</small>
                </span>
                <span className="cart-line__amt">{money(l.amount)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {lines.length > 0 && (
        <div className="cart__foot">
          {sub('grocery') > 0 && sub('vegetable') > 0 && (
            <div className="cart__subs">
              <span>🛒 {t('shop.grocery')} <b>{money(sub('grocery'))}</b></span>
              <span>🥬 {t('shop.vegetable')} <b>{money(sub('vegetable'))}</b></span>
            </div>
          )}
          <div className="cart__total"><span>{t('common.total')}</span><strong key={total} className="pop">{money(total)}</strong></div>
          {compact && <button type="button" className="link-btn" onClick={onClear}>{t('bill.clear')}</button>}
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={onCheckout}>
            <Icon name="check" /> {t('bill.checkout')}
          </button>
        </div>
      )}
    </div>
  )
}

// ---------- receipt (for the bill PDF) ----------
function Receipt({ sale, refEl }) {
  const { t, lang, settings } = useShop()
  return (
    <div className="receipt" ref={refEl}>
      <h3>{settings.shopName}</h3>
      {settings.address && <p>{settings.address}</p>}
      {settings.phone && <p>☎ {settings.phone}</p>}
      <div className="receipt__meta">
        <span>{t('pay.billNo')} #{sale.billNo}</span>
        <span>{fmtDate(sale.date, lang)} {fmtTime(sale.date, lang)}</span>
      </div>
      <table>
        <tbody>
          {sale.lines.map((l) => (
            <tr key={l.id}>
              <td>{itemName(l, lang)}<br /><small>{formatQty(l.qty, l.unitType, t)} × {formatRate(l, t)}</small></td>
              <td className="num">{money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sale.byShop.grocery > 0 && sale.byShop.vegetable > 0 && (
        <div className="receipt__subs">
          <span>{t('shop.grocery')}: {money(sale.byShop.grocery)}</span>
          <span>{t('shop.vegetable')}: {money(sale.byShop.vegetable)}</span>
        </div>
      )}
      <div className="receipt__total"><span>{t('common.total')}</span><b>{money(sale.total)}</b></div>
      <p>{t('pay.method')}: {sale.method === 'upi' ? t('pay.upi') : t('pay.cash')}</p>
      <p className="receipt__thanks">{lang === 'ta' ? 'நன்றி! மீண்டும் வருக 🙏' : 'Thank you! Visit again 🙏'}</p>
    </div>
  )
}

// ---------- payment + success ----------
function PayModal({ lines, onClose, onDone }) {
  const { t, settings, addSale } = useShop()
  const [sale, setSale] = useState(null)
  const [busy, setBusy] = useState(false)
  const receiptRef = useRef(null)
  const total = round2(lines.reduce((n, l) => n + l.amount, 0))

  const pay = async (method) => {
    setBusy(true)
    const saved = await addSale({ lines: lines.map(({ photo, ...l }) => l), method })
    setSale(saved)
    setBusy(false)
  }

  if (sale) {
    return (
      <Modal open onClose={() => onDone()} className="pay pay--done">
        <div className="success">
          <svg className="success__tick" viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r="24" />
            <path d="M15 27l7 7 15-16" />
          </svg>
          <h2>{t('pay.success')}</h2>
          <p className="muted">{t('pay.billNo')} #{sale.billNo} · {sale.method === 'upi' ? t('pay.upi') : t('pay.cash')}</p>
          <p className="success__amt">{money(sale.total)}</p>
        </div>
        <div className="receipt-preview"><Receipt sale={sale} refEl={receiptRef} /></div>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={() => elementToPdf(receiptRef.current, `bill-${sale.billNo}.pdf`, { format: 'receipt' })}>
            <Icon name="download" size={18} /> {t('pay.download')}
          </button>
          <button type="button" className="btn btn-primary grow" onClick={() => onDone()}><Icon name="plus" /> {t('pay.newBill')}</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title={t('pay.title')} className="pay">
      <div className="pay__total"><span>{t('common.total')}</span><strong>{money(total)}</strong></div>
      {settings.qr ? (
        <div className="pay__qr">
          <img src={settings.qr} alt="UPI QR" />
          <p><b>{t('pay.scan')}</b></p>
          <p className="hint">⚠️ {t('pay.confirmNote')}</p>
        </div>
      ) : (
        <p className="hint pay__noqr">ℹ️ {t('pay.noQr')}</p>
      )}
      <div className="pay__buttons">
        {settings.qr && (
          <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => pay('upi')}>
            <Icon name="qr" /> {t('pay.upiDone')}
          </button>
        )}
        <button type="button" className={`btn btn-lg ${settings.qr ? '' : 'btn-primary'}`} disabled={busy} onClick={() => pay('cash')}>
          <Icon name="cash" /> {t('pay.cashDone')}
        </button>
      </div>
    </Modal>
  )
}

export default function Billing({ goTo }) {
  const { items, lots, t, lang } = useShop()
  const [shop, setShop] = useState('all')
  const [q, setQ] = useState('')
  const [lines, setLines] = useState([])
  const [picking, setPicking] = useState(null) // { item, line }
  const [paying, setPaying] = useState(false)
  const [sheet, setSheet] = useState(false)
  const lastTap = useRef(null)

  const list = useMemo(() => items
    .filter((i) => shop === 'all' || i.shop === shop)
    .filter((i) => !q.trim() || `${i.nameEn} ${i.nameTa}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => itemName(a, lang).localeCompare(itemName(b, lang))), [items, shop, q, lang])

  const total = round2(lines.reduce((n, l) => n + l.amount, 0))

  // A bill line keeps the lot, the rate actually charged, the normal rate and the cost,
  // so profit, discounts and losses can be worked out later.
  const save = ({ qty, lot, rate, listRate, priceQty, costRate }) => {
    const { item, line } = picking
    const amount = valueAt(rate, priceQty, qty)
    const pricing = {
      qty, amount, price: rate, priceQty, rate, listRate,
      lotId: lot?.id ?? null, lotDate: lot?.date ?? null,
      costRate: costRate > 0 ? costRate : null,
      cost: costFor({ lot, item, qty }),
      discount: round2(Math.max(0, valueAt(listRate, priceQty, qty) - amount)),
    }
    if (line) {
      setLines((ls) => ls.map((l) => (l.id === line.id ? { ...l, ...pricing } : l)))
    } else {
      const { id, createdAt, updatedAt, price, costPrice, ...rest } = item
      setLines((ls) => [...ls, { ...rest, ...pricing, id: `${id}-${Date.now()}`, itemId: id }])
      flyToCart(lastTap.current)
    }
    setPicking(null)
  }

  const editLine = (line) => {
    const item = items.find((i) => i.id === line.itemId) ?? line
    setPicking({ item, line })
  }

  if (items.length === 0) {
    return (
      <section className="page">
        <div className="empty">
          <div className="empty__art">🧺</div>
          <p>{t('bill.noItems')}</p>
          <button type="button" className="btn btn-primary" onClick={() => goTo('items')}>{t('bill.goItems')}</button>
        </div>
      </section>
    )
  }

  return (
    <section className="page page--billing">
      <div className="billing">
        <div className="billing__items">
          <div className="toolbar toolbar--sticky">
            <label className="search">
              <Icon name="search" size={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} />
            </label>
            <Segmented value={shop} onChange={setShop} options={[
              { value: 'all', label: t('shop.all') },
              { value: 'grocery', label: t('shop.grocery'), icon: '🛒' },
              { value: 'vegetable', label: t('shop.vegetable'), icon: '🥬' },
            ]} />
          </div>
          <div className="grid">
            {list.map((item, i) => {
              const inCart = lines.filter((l) => l.itemId === item.id)
              return (
                <button key={item.id} type="button" className={`tile${inCart.length ? ' is-in' : ''}`} style={{ animationDelay: `${Math.min(i, 24) * 22}ms` }}
                  onClick={(e) => {
                    lastTap.current = e.currentTarget
                    // Items with lots: always add (another lot may be chosen); others: edit the line.
                    setPicking({ item, line: openLots(lots, item.id).length ? null : (inCart[0] ?? null) })
                  }}>
                  <ItemPhoto item={item} />
                  {inCart.length > 0 && <span className="tile__badge">{formatQty(inCart.reduce((n, l) => n + l.qty, 0), item.unitType, t)}</span>}
                  {(() => {
                    const live = openLots(lots, item.id)
                    if (!live.length) return null
                    return <span className={`tile__stock tile__stock--${ageLevel(ageDays(live[0].date))}`}>📦 {formatQty(stockOf(lots, item.id), item.unitType, t)}</span>
                  })()}
                  <span className="tile__name">{itemName(item, lang)}</span>
                  <span className="tile__rate">{formatRate(item, t)}</span>
                  <span className={`tile__shop tile__shop--${item.shop}`} aria-hidden="true"></span>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="billing__cart">
          <CartPanel lines={lines} onEdit={editLine} onClear={() => setLines([])} onCheckout={() => setPaying(true)} />
        </aside>
      </div>

      {/* Phone: total bar at the bottom opens the bill as a sheet */}
      <button type="button" className={`cartbar${lines.length ? ' is-on' : ''}`} onClick={() => setSheet(true)}>
        <span className="cartbar__icon" data-cart-target><Icon name="cart" /><b>{lines.length}</b></span>
        <span className="cartbar__total"><small>{t('common.total')}</small><strong key={total} className="pop">{money(total)}</strong></span>
        <span className="cartbar__go">{t('bill.view')} <Icon name="plus" size={16} /></span>
      </button>
      <Modal open={sheet} onClose={() => setSheet(false)} title={t('bill.cart')} className="sheet">
        <CartPanel compact lines={lines} onEdit={(l) => { setSheet(false); editLine(l) }} onClear={() => { setLines([]); setSheet(false) }}
          onCheckout={() => { setSheet(false); setPaying(true) }} />
      </Modal>

      {picking && (
        <QtySheet key={picking.item.id + (picking.line?.id ?? '')} item={picking.item} line={picking.line}
          onClose={() => setPicking(null)} onSave={save}
          onRemove={() => { setLines((ls) => ls.filter((l) => l.id !== picking.line.id)); setPicking(null) }} />
      )}
      {paying && <PayModal lines={lines} onClose={() => setPaying(false)} onDone={() => { setPaying(false); setLines([]) }} />}
    </section>
  )
}
