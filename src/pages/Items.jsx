import { useMemo, useRef, useState } from 'react'
import { useShop } from '../lib/store'
import { compressImage } from '../lib/db'
import { itemName } from '../lib/i18n'
import { BASE_UNIT, formatQty, formatRate, lineAmount, money, toBase } from '../lib/pricing'
import { Confirm, Icon, ItemPhoto, Modal, Segmented } from '../components/ui'

const EMPTY = { nameEn: '', nameTa: '', shop: 'grocery', unitType: 'weight', price: '', costPrice: '', qtyValue: '1', qtyUnit: 'kg', photo: null }

// Price quantity as the shopkeeper thinks of it: "1 kg", "500 g", "1 L", "1 piece".
function toForm(item) {
  if (!item) return EMPTY
  const big = item.unitType !== 'count' && item.priceQty >= 1000 && item.priceQty % 1000 === 0
  return {
    ...item,
    price: String(item.price),
    costPrice: item.costPrice ? String(item.costPrice) : '',
    qtyValue: String(big ? item.priceQty / 1000 : item.priceQty),
    qtyUnit: item.unitType === 'weight' ? (big ? 'kg' : 'g') : item.unitType === 'volume' ? (big ? 'l' : 'ml') : 'pcs',
  }
}

function ItemForm({ open, item, onClose }) {
  const { t, saveItem, toast } = useShop()
  const [f, setF] = useState(() => toForm(item))
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const set = (patch) => setF((x) => ({ ...x, ...patch }))

  const unitOptions = f.unitType === 'weight' ? ['g', 'kg'] : f.unitType === 'volume' ? ['ml', 'l'] : ['pcs']
  const priceQty = f.unitType === 'count' ? Number(f.qtyValue) : toBase(f.qtyValue, f.qtyUnit)
  const preview = { ...f, price: Number(f.price), priceQty }
  const exampleQty = f.unitType === 'count' ? 3 : 750

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { set({ photo: await compressImage(file) }) } catch { toast('Photo could not be read', 'error') }
    e.target.value = ''
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!f.nameEn.trim() && !f.nameTa.trim()) { toast(t('items.needName'), 'error'); return }
    if (!(Number(f.price) > 0) || !(priceQty > 0)) { toast(t('items.needPrice'), 'error'); return }
    setBusy(true)
    const { qtyValue, qtyUnit, ...rest } = f
    await saveItem({ ...rest, nameEn: f.nameEn.trim(), nameTa: f.nameTa.trim(), price: Number(f.price), costPrice: Number(f.costPrice) > 0 ? Number(f.costPrice) : null, priceQty })
    setBusy(false)
    toast(t('items.saved'))
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? t('items.edit') : t('items.add')} wide>
      <form className="item-form" onSubmit={submit}>
        <div className="item-form__photo">
          <button type="button" className="photo-pick" onClick={() => fileRef.current?.click()}>
            {f.photo ? <img src={f.photo} alt="" /> : <span><Icon name="camera" size={34} /><br />{t('items.photoAdd')}</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
          {f.photo && (
            <div className="photo-pick__actions">
              <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>{t('items.photoChange')}</button>
              <button type="button" className="btn btn-sm btn-ghost-danger" onClick={() => set({ photo: null })}>{t('items.photoRemove')}</button>
            </div>
          )}
        </div>

        <div className="item-form__fields">
          <label className="field">
            <span>{t('items.nameEn')}</span>
            <input value={f.nameEn} onChange={(e) => set({ nameEn: e.target.value })} placeholder="Toor dal" />
          </label>
          <label className="field">
            <span>{t('items.nameTa')}</span>
            <input value={f.nameTa} onChange={(e) => set({ nameTa: e.target.value })} placeholder="துவரம் பருப்பு" lang="ta" />
          </label>

          <div className="field">
            <span>{t('items.shop')}</span>
            <Segmented value={f.shop} onChange={(shop) => set({ shop })} options={[
              { value: 'grocery', label: t('shop.grocery'), icon: '🛒' },
              { value: 'vegetable', label: t('shop.vegetable'), icon: '🥬' },
            ]} />
          </div>

          <div className="field">
            <span>{t('items.priceType')}</span>
            <div className="type-pick">
              {['weight', 'volume', 'count'].map((u) => (
                <button key={u} type="button" className={f.unitType === u ? 'is-active' : ''}
                  onClick={() => set({ unitType: u, qtyUnit: u === 'weight' ? 'kg' : u === 'volume' ? 'l' : 'pcs', qtyValue: '1' })}>
                  <b>{u === 'weight' ? '⚖️' : u === 'volume' ? '🫗' : '🔢'}</b>{t(`type.${u}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="price-row">
            <label className="field">
              <span>{t('items.price')}</span>
              <input type="number" inputMode="decimal" min="0" step="0.5" value={f.price} onChange={(e) => set({ price: e.target.value })} placeholder="50" />
            </label>
            <span className="price-row__for">{t('items.for')}</span>
            <label className="field">
              <span>&nbsp;</span>
              <div className="qty-input">
                <input type="number" inputMode="decimal" min="0" step="any" value={f.qtyValue} onChange={(e) => set({ qtyValue: e.target.value })} />
                {unitOptions.length > 1 ? (
                  <select value={f.qtyUnit} onChange={(e) => set({ qtyUnit: e.target.value })}>
                    {unitOptions.map((u) => <option key={u} value={u}>{t(`unit.${u}`)}</option>)}
                  </select>
                ) : <span className="qty-input__unit">{t('unit.pcs')}</span>}
              </div>
            </label>
          </div>
          <label className="field">
            <span>{t('items.costPrice')} {priceQty > 0 ? `/ ${formatQty(priceQty, f.unitType, t)}` : ''}</span>
            <input type="number" inputMode="decimal" min="0" step="0.5" value={f.costPrice} onChange={(e) => set({ costPrice: e.target.value })} placeholder="30" />
            <small className="muted">{t('items.costHelp')}</small>
          </label>
          <p className="hint">
            {Number(f.price) > 0 && priceQty > 0
              ? <>✅ {formatRate(preview, t)} → {f.unitType === 'count' ? `${exampleQty} ${t('unit.pcs')}` : `${exampleQty} ${t(`unit.${BASE_UNIT[f.unitType] === 'g' ? 'g' : 'ml'}`)}`} = <b>{money(lineAmount(preview, exampleQty))}</b></>
              : t('items.rateHint')}
          </p>
        </div>

        <div className="modal__actions item-form__actions">
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}><Icon name="check" size={18} /> {t('common.save')}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Items() {
  const { items, t, lang, deleteItem, loadSamples, toast } = useShop()
  const [shop, setShop] = useState('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(undefined) // undefined = closed, null = new, item = edit
  const [removing, setRemoving] = useState(null)

  const list = useMemo(() => items
    .filter((i) => shop === 'all' || i.shop === shop)
    .filter((i) => !q.trim() || `${i.nameEn} ${i.nameTa}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => itemName(a, lang).localeCompare(itemName(b, lang))), [items, shop, q, lang])

  return (
    <section className="page">
      <header className="page__head">
        <div>
          <h1>{t('items.title')}</h1>
          <p className="muted">{items.length} {t('items.count')}</p>
        </div>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setEditing(null)}>
          <Icon name="plus" /> {t('items.add')}
        </button>
      </header>

      <div className="toolbar">
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

      {items.length === 0 ? (
        <div className="empty">
          <div className="empty__art">🧺</div>
          <p>{t('items.empty')}</p>
          <button type="button" className="btn" onClick={async () => { await loadSamples(); toast(t('items.saved')) }}>{t('items.sample')}</button>
        </div>
      ) : (
        <div className="item-table">
          {list.map((item, i) => (
            <article key={item.id} className="item-row" style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}>
              <ItemPhoto item={item} size="sm" />
              <div className="item-row__name">
                <strong>{itemName(item, lang)}</strong>
                <small className="muted">{lang === 'ta' ? item.nameEn : item.nameTa}</small>
              </div>
              <span className={`tag tag--${item.shop}`}>{t(`shop.${item.shop}`)}</span>
              <span className="item-row__rate">{formatRate(item, t)}</span>
              <div className="item-row__actions">
                <button type="button" className="icon-btn" onClick={() => setEditing(item)} aria-label={t('common.edit')} title={t('common.edit')}><Icon name="edit" size={18} /></button>
                <button type="button" className="icon-btn icon-btn--danger" onClick={() => setRemoving(item)} aria-label={t('common.delete')} title={t('common.delete')}><Icon name="trash" size={18} /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing !== undefined && <ItemForm open item={editing} onClose={() => setEditing(undefined)} />}
      <Confirm open={!!removing} text={t('items.deleteAsk')} onNo={() => setRemoving(null)}
        onYes={async () => { await deleteItem(removing.id); setRemoving(null); toast(t('items.deleted')) }} />
    </section>
  )
}
