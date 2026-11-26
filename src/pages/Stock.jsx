import { useMemo, useState } from 'react'
import { useShop } from '../lib/store'
import { itemName } from '../lib/i18n'
import { formatQty, money, round2, toBase } from '../lib/pricing'
import { fmtDate } from '../lib/dates'
import { ageDays, ageLevel, openLots, stockOf, valueAt } from '../lib/stock'
import { Confirm, CountUp, Icon, ItemPhoto, Modal, Segmented } from '../components/ui'
import { WasteSheet, playDustbin } from '../components/Dustbin'

const todayInput = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const unitsOf = (item) => (item.unitType === 'weight' ? ['kg', 'g'] : item.unitType === 'volume' ? ['l', 'ml'] : ['pcs'])
const noRupee = (label) => label.replace(/\s*\(₹\)/, '')
const rateLabel = (item, t) => formatQty(item.priceQty, item.unitType, t)

function AgeBadge({ ts }) {
  const { t } = useShop()
  const d = ageDays(ts)
  return (
    <span className={`age age--${ageLevel(d)}`}>
      {d <= 0 ? t('stock.fresh') : `${d} ${d === 1 ? t('stock.dayOld') : t('stock.daysOld')}`}
    </span>
  )
}

// ---------- add a purchase (new lot) ----------
function PurchaseSheet({ item, onClose }) {
  const { t, lang, saveLot, toast } = useShop()
  const units = unitsOf(item)
  const [date, setDate] = useState(todayInput())
  const [qtyValue, setQtyValue] = useState('')
  const [qtyUnit, setQtyUnit] = useState(units[0])
  const [cost, setCost] = useState(item.costPrice ? String(item.costPrice) : '')
  const [price, setPrice] = useState(String(item.price))
  const qty = item.unitType === 'count' ? Number(qtyValue) || 0 : toBase(qtyValue, qtyUnit)
  const unitMargin = round2(Number(price) - Number(cost))
  const totalCost = valueAt(Number(cost), item.priceQty, qty)

  const submit = async (e) => {
    e.preventDefault()
    if (!(qty > 0) || !(Number(cost) > 0) || !(Number(price) > 0)) return
    const [y, m, d] = date.split('-').map(Number)
    const now = new Date()
    const ts = new Date(y, m - 1, d, now.getHours(), now.getMinutes()).getTime()
    await saveLot({ itemId: item.id, date: ts, qty, remaining: qty, priceQty: item.priceQty, cost: Number(cost), price: Number(price) })
    toast(t('stock.saved'))
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`📦 ${t('stock.addPurchase')}`}>
      <form className="form-grid" onSubmit={submit}>
        <div className="qty-sheet__top">
          <ItemPhoto item={item} size="sm" />
          <strong>{itemName(item, lang)}</strong>
        </div>
        <label className="field"><span>{t('stock.date')}</span>
          <input type="date" value={date} max={todayInput()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field"><span>{t('stock.qtyBought')}</span>
          <div className="qty-input">
            <input type="number" inputMode="decimal" min="0" step="any" value={qtyValue} onChange={(e) => setQtyValue(e.target.value)} placeholder="20" autoFocus />
            {units.length > 1 ? (
              <select value={qtyUnit} onChange={(e) => setQtyUnit(e.target.value)}>
                {units.map((u) => <option key={u} value={u}>{t(`unit.${u}`)}</option>)}
              </select>
            ) : <span className="qty-input__unit">{t('unit.pcs')}</span>}
          </div>
        </label>
        <div className="two-fields">
          <label className="field"><span>{t('stock.costPrice')} / {rateLabel(item, t)}</span>
            <input type="number" inputMode="decimal" min="0" step="0.5" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="30" />
          </label>
          <label className="field"><span>{t('stock.sellPrice')} / {rateLabel(item, t)}</span>
            <input type="number" inputMode="decimal" min="0" step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
        </div>
        {Number(cost) > 0 && Number(price) > 0 && (
          <p className={`hint ${unitMargin < 0 ? 'hint--bad' : 'hint--good'}`}>
            {unitMargin >= 0 ? '📈' : '📉'} {unitMargin >= 0 ? t('stock.margin') : t('stock.marginLoss')}: <b>{money(Math.abs(unitMargin))}</b> / {rateLabel(item, t)}
            {qty > 0 && <> · {t('stock.bought')}: <b>{formatQty(qty, item.unitType, t)}</b> = {money(totalCost)}</>}
          </p>
        )}
        <p className="hint">{t('stock.costHint')}</p>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary grow" disabled={!(qty > 0) || !(Number(cost) > 0)}><Icon name="check" size={18} /> {t('common.save')}</button>
        </div>
      </form>
    </Modal>
  )
}

// ---------- change a lot's selling price (e.g. old tomatoes cheaper) ----------
function PriceSheet({ item, lot, onClose }) {
  const { t, saveLot, toast } = useShop()
  const [price, setPrice] = useState(String(lot.price))
  const p = Number(price)
  const below = p > 0 && p < lot.cost
  const quick = [0.9, 0.8, 0.7, 0.5].map((f) => Math.round(lot.price * f))
  return (
    <Modal open onClose={onClose} title={`🏷️ ${t('stock.changePrice')}`}>
      <p className="label">{t('stock.newPrice')} ({rateLabel(item, t)})</p>
      <div className="chips">
        {quick.map((q, i) => <button key={q + '-' + i} type="button" className={p === q ? 'is-active' : ''} onClick={() => setPrice(String(q))}>{money(q)} <small>−{[10, 20, 30, 50][i]}%</small></button>)}
      </div>
      <div className="field"><input type="number" inputMode="decimal" min="0" step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
      <p className={`hint ${below ? 'hint--bad' : 'hint--good'}`}>
        {t('stock.costPrice')}: {money(lot.cost)} · {below ? `📉 ${t('bill.belowCost')}` : `📈 ${t('stock.margin')} ${money(round2(p - lot.cost))}`}
      </p>
      <div className="modal__actions">
        <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className="btn btn-primary grow" disabled={!(p > 0)} onClick={async () => { await saveLot({ ...lot, price: p }); toast(t('stock.priceSaved')); onClose() }}>
          <Icon name="check" size={18} /> {t('common.save')}
        </button>
      </div>
    </Modal>
  )
}

// ---------- count what is really left; the difference goes to the dustbin ----------
function CountSheet({ item, lot, onClose }) {
  const { t, addWaste, toast } = useShop()
  const units = unitsOf(item)
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState(units[units.length - 1])
  const actual = value === '' ? null : item.unitType === 'count' ? Number(value) : toBase(value, unit) || 0
  const diff = actual === null ? 0 : round2(lot.remaining - actual)
  const loss = valueAt(lot.cost, lot.priceQty, Math.max(0, diff))
  return (
    <Modal open onClose={onClose} title={`🔢 ${t('stock.count')}`}>
      <p className="hint">{t('stock.countHelp')}</p>
      <p className="label">{t('stock.actualLeft')} ({t('stock.left')} {formatQty(lot.remaining, item.unitType, t)})</p>
      <div className="qty-input">
        <input type="number" inputMode="decimal" min="0" step="any" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        {units.length > 1 ? (
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {units.map((u) => <option key={u} value={u}>{t(`unit.${u}`)}</option>)}
          </select>
        ) : <span className="qty-input__unit">{t('unit.pcs')}</span>}
      </div>
      {diff > 0 && (
        <div className="loss-box"><span>🗑️ {formatQty(diff, item.unitType, t)}</span><strong>−{money(loss)}</strong></div>
      )}
      <div className="modal__actions">
        <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className="btn btn-primary grow" disabled={!(diff > 0)}
          onClick={async () => {
            await addWaste({ item, lot, qty: diff, reason: 'count' })
            playDustbin({ photo: item.photo, emoji: item.emoji, lossText: `−${money(loss)}` })
            toast(t('waste.saved'))
            onClose()
          }}>
          <Icon name="check" size={18} /> {t('common.save')}
        </button>
      </div>
    </Modal>
  )
}

// ---------- one item's stock card ----------
function StockCard({ item, index, onAction }) {
  const { t, lang, lots } = useShop()
  const [openCard, setOpenCard] = useState(false)
  const all = lots.filter((l) => l.itemId === item.id).sort((a, b) => b.date - a.date)
  const live = openLots(lots, item.id)
  const left = stockOf(lots, item.id)
  const oldest = live[0]
  const level = oldest ? ageLevel(ageDays(oldest.date)) : null
  const bought = live.reduce((n, l) => n + l.qty, 0)
  return (
    <article className={`stock-card${level === 'old' ? ' is-old' : ''}`} style={{ animationDelay: `${Math.min(index, 20) * 25}ms` }}>
      <button type="button" className="stock-card__main" onClick={() => setOpenCard((v) => !v)} aria-expanded={openCard}>
        <ItemPhoto item={item} size="sm" />
        <span className="stock-card__name">
          <b>{itemName(item, lang)}</b>
          <small className="muted">{live.length} {t('stock.lots')}{oldest && <> · <AgeBadge ts={oldest.date} /></>}</small>
        </span>
        <span className="stock-card__left">
          <strong className={left > 0 ? '' : 'muted'}>{left > 0 ? formatQty(left, item.unitType, t) : t('stock.empty')}</strong>
          {bought > 0 && <span className="meter"><span style={{ width: `${Math.min(100, (left / bought) * 100)}%` }}></span></span>}
        </span>
      </button>
      {level === 'old' && <p className="stock-card__alert">⏰ {t('stock.oldAlert')}</p>}
      <div className="stock-card__actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={() => onAction('purchase', item)}><Icon name="plus" size={16} /> {t('stock.purchase')}</button>
        <button type="button" className="btn btn-sm btn-ghost-danger" onClick={() => onAction('waste', item)}><Icon name="trash" size={16} /> {t('waste.btn')}</button>
      </div>
      {openCard && (
        <ul className="lots">
          {all.length === 0 && <li className="muted">{t('stock.noLots')}</li>}
          {all.map((l) => (
            <li key={l.id} className={l.remaining > 0 ? '' : 'is-empty'}>
              <div className="lots__top">
                <b>{fmtDate(l.date, lang, { day: '2-digit', month: 'short' })}</b>
                {l.remaining > 0 && <AgeBadge ts={l.date} />}
                <span className="grow"></span>
                <span>{formatQty(l.remaining, item.unitType, t)} / {formatQty(l.qty, item.unitType, t)}</span>
              </div>
              <span className="meter"><span style={{ width: `${(l.remaining / l.qty) * 100}%` }}></span></span>
              <div className="lots__prices">
                <span>{noRupee(t('stock.costPrice'))}: <b>{money(l.cost)}</b></span>
                <span>{noRupee(t('stock.sellPrice'))}: <b className={l.price < l.cost ? 'bad' : ''}>{money(l.price)}</b> / {formatQty(l.priceQty, item.unitType, t)}</span>
              </div>
              {l.remaining > 0 && (
                <div className="lots__actions">
                  <button type="button" className="btn btn-sm" onClick={() => onAction('price', item, l)}>🏷️ {t('stock.changePrice')}</button>
                  <button type="button" className="btn btn-sm" onClick={() => onAction('count', item, l)}>🔢 {t('stock.count')}</button>
                  <button type="button" className="btn btn-sm btn-ghost-danger" onClick={() => onAction('waste', item, l)}>🗑️ {t('waste.btn')}</button>
                  <button type="button" className="icon-btn icon-btn--danger" aria-label={t('common.delete')} title={t('common.delete')} onClick={() => onAction('deleteLot', item, l)}><Icon name="x" size={16} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export default function Stock() {
  const { t, lang, items, lots, wastes, deleteLot, deleteWaste, toast } = useShop()
  const [shop, setShop] = useState('all')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [action, setAction] = useState(null) // { kind, item, lot }
  const [undo, setUndo] = useState(null)

  const value = useMemo(() => round2(lots.filter((l) => l.remaining > 0).reduce((n, l) => n + valueAt(l.cost, l.priceQty, l.remaining), 0)), [lots])
  const oldCount = useMemo(() => lots.filter((l) => l.remaining > 0 && ageLevel(ageDays(l.date)) === 'old').length, [lots])
  const todayLoss = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    return round2(wastes.filter((w) => w.date >= start.getTime()).reduce((n, w) => n + w.loss, 0))
  }, [wastes])

  const list = useMemo(() => items
    .filter((i) => shop === 'all' || i.shop === shop)
    .filter((i) => !q.trim() || `${i.nameEn} ${i.nameTa}`.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((i) => {
      if (filter === 'old') return openLots(lots, i.id).some((l) => ageLevel(ageDays(l.date)) === 'old')
      if (filter === 'low') {
        // Empty (no stock at all — including items never purchased) or under 25% of what was bought.
        const live = openLots(lots, i.id)
        const bought = live.reduce((n, l) => n + l.qty, 0)
        return live.length === 0 || stockOf(lots, i.id) / bought < 0.25
      }
      return true
    })
    // items with stock first, oldest stock first
    .sort((a, b) => (openLots(lots, a.id)[0]?.date ?? Infinity) - (openLots(lots, b.id)[0]?.date ?? Infinity) ||
      itemName(a, lang).localeCompare(itemName(b, lang))), [items, lots, shop, q, filter, lang])

  const onAction = (kind, item, lot) => (kind === 'deleteLot' ? setUndo({ kind: 'lot', lot }) : setAction({ kind, item, lot }))
  const close = () => setAction(null)

  return (
    <section className="page">
      <header className="page__head">
        <div>
          <h1>{t('stock.title')}</h1>
          <p className="muted">{t('stock.sub')}</p>
        </div>
      </header>

      <div className="stats stats--3">
        <div className="stat stat--main"><small>{t('stock.value')}</small><strong><CountUp value={value} /></strong></div>
        <div className={`stat${oldCount ? ' stat--warn' : ''}`}><small>⏰ {t('stock.filterOld')}</small><strong><CountUp value={oldCount} format={(n) => Math.round(n)} /></strong></div>
        <div className={`stat${todayLoss ? ' stat--bad' : ''}`}><small>🗑️ {t('profit.today')} · {t('profit.waste')}</small><strong><CountUp value={todayLoss} /></strong></div>
      </div>

      <div className="toolbar toolbar--wrap">
        <label className="search">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} />
        </label>
        <Segmented value={filter} onChange={setFilter} options={[
          { value: 'all', label: t('stock.filterAll') },
          { value: 'old', label: t('stock.filterOld'), icon: '⏰' },
          { value: 'low', label: t('stock.filterLow'), icon: '📉' },
        ]} />
        <Segmented value={shop} onChange={setShop} options={[
          { value: 'all', label: t('shop.all') },
          { value: 'grocery', label: t('shop.grocery'), icon: '🛒' },
          { value: 'vegetable', label: t('shop.vegetable'), icon: '🥬' },
        ]} />
      </div>

      {list.length === 0 ? (
        <p className="card muted">{filter === 'old' ? t('stock.noneOld') : t('stock.noneMatch')}</p>
      ) : (
        <div className="stock-grid">
          {list.map((item, i) => <StockCard key={item.id} item={item} index={i} onAction={onAction} />)}
        </div>
      )}

      <div className="card dustbin-log">
        <h2 className="card__title">🗑️ {t('stock.history')}</h2>
        {wastes.length === 0 ? <p className="muted">{t('stock.noWaste')}</p> : (
          <ul className="bills">
            {wastes.slice(0, 40).map((w) => (
              <li key={w.id}>
                <div className="bills__row">
                  <ItemPhoto item={w} size="xs" />
                  <span className="grow">
                    {itemName(w, lang)} <small className="muted">{formatQty(w.qty, w.unitType, t)} · {t(`waste.r.${w.reason}`)} · {fmtDate(w.date, lang, { day: '2-digit', month: 'short' })}</small>
                  </span>
                  <b className="bad">−{money(w.loss)}</b>
                  <button type="button" className="icon-btn" aria-label={t('common.delete')} title={t('common.delete')} onClick={() => setUndo({ kind: 'waste', waste: w })}><Icon name="x" size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {action?.kind === 'purchase' && <PurchaseSheet item={action.item} onClose={close} />}
      {action?.kind === 'waste' && <WasteSheet item={action.item} lot={action.lot} onClose={close} />}
      {action?.kind === 'price' && <PriceSheet item={action.item} lot={action.lot} onClose={close} />}
      {action?.kind === 'count' && <CountSheet item={action.item} lot={action.lot} onClose={close} />}
      <Confirm open={!!undo} text={undo?.kind === 'lot' ? t('stock.deleteLot') : t('waste.deleteAsk')} onNo={() => setUndo(null)}
        onYes={async () => {
          if (undo.kind === 'lot') { await deleteLot(undo.lot.id); toast(t('stock.lotDeleted')) }
          else { await deleteWaste(undo.waste.id); toast(t('waste.undone')) }
          setUndo(null)
        }} />
    </section>
  )
}
