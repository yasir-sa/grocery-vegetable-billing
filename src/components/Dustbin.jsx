import { useState } from 'react'
import { useShop } from '../lib/store'
import { itemName } from '../lib/i18n'
import { QUICK_QTY, formatQty, money, toBase } from '../lib/pricing'
import { WASTE_REASONS, ageDays, openLots, valueAt } from '../lib/stock'
import { fmtDate } from '../lib/dates'
import { Icon, ItemPhoto, Modal } from './ui'

// ---------- "drop it in the dustbin" animation (plain DOM, plays over everything) ----------
export function playDustbin({ photo, emoji, lossText }) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const wrap = document.createElement('div')
  wrap.className = 'binfx'
  wrap.innerHTML = `
    <div class="binfx__item">${photo ? `<img src="${photo}" alt="">` : `<span>${emoji || '🥬'}</span>`}</div>
    <svg class="binfx__bin" viewBox="0 0 120 140" aria-hidden="true">
      <g class="binfx__lid"><rect x="8" y="22" width="104" height="12" rx="6"/><rect x="46" y="10" width="28" height="14" rx="5"/></g>
      <path class="binfx__body" d="M18 40h84l-8 92a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8z"/>
      <path class="binfx__lines" d="M44 58v66M60 58v66M76 58v66"/>
    </svg>
    <div class="binfx__loss">${lossText}</div>`
  document.body.appendChild(wrap)
  setTimeout(() => wrap.classList.add('is-closing'), 1100)
  setTimeout(() => wrap.remove(), 2300)
}

// ---------- Throw (part of) a lot in the dustbin ----------
export function WasteSheet({ item, lot: startLot, onClose }) {
  const { t, lang, lots, addWaste, toast } = useShop()
  const open = openLots(lots, item.id)
  const [lotId, setLotId] = useState(startLot?.id ?? open[0]?.id ?? null)
  const lot = open.find((l) => l.id === lotId) ?? null
  const small = item.unitType === 'weight' ? 'g' : item.unitType === 'volume' ? 'ml' : 'pcs'
  const big = item.unitType === 'weight' ? 'kg' : item.unitType === 'volume' ? 'l' : 'pcs'
  const [qty, setQty] = useState(0)
  const [typed, setTyped] = useState('')
  const [unit, setUnit] = useState(small)
  const [reason, setReason] = useState('rotten')
  const [busy, setBusy] = useState(false)

  const priceQty = lot?.priceQty ?? item.priceQty
  const costRate = lot?.cost ?? item.costPrice ?? 0
  const loss = valueAt(costRate, priceQty, qty)
  const quick = QUICK_QTY[item.unitType].filter((q) => !lot || q <= lot.remaining)

  const submit = async () => {
    if (!(qty > 0)) return
    setBusy(true)
    await addWaste({ item, lot, qty: lot ? Math.min(qty, lot.remaining) : qty, reason })
    playDustbin({ photo: item.photo, emoji: item.emoji, lossText: `−${money(loss)}` })
    toast(t('waste.saved'))
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`🗑️ ${t('waste.title')}`} className="waste-sheet">
      <div className="qty-sheet__top">
        <ItemPhoto item={item} size="sm" />
        <strong>{itemName(item, lang)}</strong>
      </div>

      {open.length > 0 && (
        <>
          <p className="label">{t('stock.lot')}</p>
          <div className="lot-pick">
            {open.map((l) => {
              const d = ageDays(l.date)
              return (
                <button key={l.id} type="button" className={lotId === l.id ? 'is-active' : ''} onClick={() => setLotId(l.id)}>
                  <span className={`age-dot age-dot--${d <= 0 ? 'fresh' : d <= 2 ? 'aging' : 'old'}`}></span>
                  <b>{fmtDate(l.date, lang, { day: '2-digit', month: 'short' })}</b>
                  <small>{formatQty(l.remaining, item.unitType, t)} {t('stock.left')}</small>
                </button>
              )
            })}
          </div>
        </>
      )}

      <p className="label">{t('waste.qty')}</p>
      <div className="quick">
        {quick.map((q) => (
          <button key={q} type="button" className={qty === q && !typed ? 'is-active' : ''} onClick={() => { setQty(q); setTyped('') }}>
            {formatQty(q, item.unitType, t)}
          </button>
        ))}
        {lot && (
          <button type="button" className={qty === lot.remaining && !typed ? 'is-active' : ''} onClick={() => { setQty(lot.remaining); setTyped('') }}>
            {t('stock.filterAll')} ({formatQty(lot.remaining, item.unitType, t)})
          </button>
        )}
      </div>
      <div className="qty-input">
        <input type="number" inputMode="decimal" min="0" step="any" value={typed} placeholder={item.unitType === 'count' ? '2' : '500'}
          onChange={(e) => { setTyped(e.target.value); setQty(item.unitType === 'count' ? Number(e.target.value) || 0 : toBase(e.target.value, unit)) }} />
        {item.unitType !== 'count' ? (
          <select value={unit} onChange={(e) => { setUnit(e.target.value); if (typed) setQty(toBase(typed, e.target.value)) }}>
            <option value={small}>{t(`unit.${small}`)}</option>
            <option value={big}>{t(`unit.${big}`)}</option>
          </select>
        ) : <span className="qty-input__unit">{t('unit.pcs')}</span>}
      </div>
      {lot && qty > lot.remaining && <p className="warn">⚠️ {t('bill.overStock').replace('{left}', formatQty(lot.remaining, item.unitType, t))}</p>}

      <p className="label">{t('waste.reason')}</p>
      <div className="chips">
        {WASTE_REASONS.filter((r) => r !== 'count').map((r) => (
          <button key={r} type="button" className={reason === r ? 'is-active' : ''} onClick={() => setReason(r)}>{t(`waste.r.${r}`)}</button>
        ))}
      </div>

      <div className="loss-box">
        <span>{t('waste.loss')}</span>
        <strong key={loss} className="pop">−{money(loss)}</strong>
        {!costRate && <small>{t('stock.noCostItem')}</small>}
      </div>

      <div className="modal__actions">
        <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className="btn btn-danger grow" disabled={!(qty > 0) || busy} onClick={submit}>
          <Icon name="trash" size={18} /> {t('waste.confirm')}
        </button>
      </div>
    </Modal>
  )
}
