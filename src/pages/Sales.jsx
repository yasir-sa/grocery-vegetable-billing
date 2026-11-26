import { useMemo, useRef, useState } from 'react'
import { useShop } from '../lib/store'
import { itemName } from '../lib/i18n'
import { formatQty, formatRate, money } from '../lib/pricing'
import { fmtDate, fmtTime, monthName, periodRange } from '../lib/dates'
import { linesFor, summarize } from '../lib/report'
import { EXPENSE_TYPES } from '../lib/stock'
import { elementToPdf } from '../lib/pdf'
import { BarChart, Confirm, CountUp, Icon, ItemPhoto, Modal, Segmented } from '../components/ui'

const signed = (n) => (n < 0 ? `−${money(-n)}` : money(n))

// ---------- printable report (rendered off-screen, turned into a PDF) ----------
function Report({ data, kind, range, shop, refEl }) {
  const { t, lang, settings } = useShop()
  const p = data.profit
  const periodLabel = kind === 'year' ? String(range.start.getFullYear())
    : kind === 'month' ? `${monthName(range.start.getMonth(), lang)} ${range.start.getFullYear()}`
      : kind === 'today' ? fmtDate(range.start.getTime(), lang)
        : `${fmtDate(range.start.getTime(), lang)} – ${fmtDate(range.end.getTime() - 1, lang)}`
  const lossRows = [
    ...data.losses.waste.map((r) => ({ ...r, kind: t('profit.wasteBy') })),
    ...data.losses.discount.map((r) => ({ ...r, kind: t('profit.discountBy') })),
    ...data.losses.belowCost.map((r) => ({ ...r, kind: t('profit.belowCost') })),
  ]
  return (
    <div className="report" ref={refEl}>
      <header className="report__head">
        <div>
          <h1>{settings.shopName}</h1>
          <p>{t('report.title')} · {t(`shop.${shop}`)}</p>
        </div>
        <div className="report__period">
          <b>{periodLabel}</b>
          <small>{t('report.generated')}: {fmtDate(Date.now(), lang)}</small>
        </div>
      </header>

      <h2>{t('profit.title')}</h2>
      <table className="report__pl">
        <tbody>
          <tr><td>{t('profit.sales')}</td><td className="num">{money(p.sales)}</td></tr>
          <tr><td>− {t('profit.cost')}</td><td className="num">{money(p.cost)}</td></tr>
          <tr className="report__sub"><td>= {t('profit.gross')}</td><td className="num">{signed(p.gross)}</td></tr>
          <tr><td>− {t('profit.waste')}</td><td className="num">{money(p.wasteLoss)}</td></tr>
          {shop === 'all' && <tr><td>− {t('profit.expenses')}</td><td className="num">{money(p.expenseTotal)}</td></tr>}
          <tr className="report__sum"><td>= {p.net < 0 ? t('profit.netLoss') : t('profit.net')}</td><td className="num">{signed(p.net)}</td></tr>
          <tr><td className="muted">{t('profit.discount')}</td><td className="num muted">{money(p.discount)}</td></tr>
          {p.unknownSales > 0 && <tr><td className="muted">{t('profit.unknown')}</td><td className="num muted">{money(p.unknownSales)}</td></tr>}
        </tbody>
      </table>

      <h2>{t('report.summary')}</h2>
      <div className="report__cards">
        <div><small>{t('sales.billsCount')}</small><b>{data.bills}</b></div>
        <div><small>{t('sales.avgBill')}</small><b>{money(data.avg)}</b></div>
        <div><small>{t('pay.upi')} / {t('pay.cash')}</small><b>{money(data.byMethod.upi)} / {money(data.byMethod.cash)}</b></div>
        {shop === 'all' && <div><small>{t('shop.grocery')}</small><b>{money(data.byShop.grocery)}</b></div>}
        {shop === 'all' && <div><small>{t('shop.vegetable')}</small><b>{money(data.byShop.vegetable)}</b></div>}
      </div>

      <h2>{t('report.breakdown')}</h2>
      <table>
        <thead><tr><th>{kind === 'year' ? t('report.month') : t('report.date')}</th><th className="num">{t('sales.billsCount')}</th><th className="num">{t('sales.revenue')}</th><th className="num">{t('profit.chartProfit')}</th></tr></thead>
        <tbody>
          {data.chart.filter((b) => (kind === 'year' || kind === 'week') || b.bills > 0 || b.profit !== 0).map((b) => (
            <tr key={b.key}>
              <td>{kind === 'year' ? monthName(b.month, lang) : kind === 'today' ? `${String(b.hour).padStart(2, '0')}:00` : fmtDate(b.day.getTime(), lang, { day: '2-digit', month: 'short', weekday: 'short' })}</td>
              <td className="num">{b.bills}</td>
              <td className="num">{money(b.total)}</td>
              <td className="num">{signed(b.profit)}</td>
            </tr>
          ))}
          <tr className="report__sum"><td>{t('common.total')}</td><td className="num">{data.bills}</td><td className="num">{money(data.total)}</td><td className="num">{signed(p.net)}</td></tr>
        </tbody>
      </table>

      {lossRows.length > 0 && (
        <>
          <h2>{t('profit.where')}</h2>
          <table>
            <thead><tr><th>{t('report.item')}</th><th>{t('waste.reason')}</th><th className="num">{t('sales.qty')}</th><th className="num">{t('waste.loss')}</th></tr></thead>
            <tbody>
              {lossRows.map((r, i) => (
                <tr key={r.key + '-' + i}><td>{itemName(r, lang)}</td><td>{r.kind}</td><td className="num">{formatQty(r.qty, r.unitType, t)}</td><td className="num">−{money(r.loss)}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>{t('report.items')}</h2>
      <table>
        <thead><tr><th>{t('report.item')}</th><th>{t('items.shop')}</th><th className="num">{t('sales.qty')}</th><th className="num">{t('sales.revenue')}</th><th className="num">{t('profit.chartProfit')}</th></tr></thead>
        <tbody>
          {data.itemsSold.map((r) => (
            <tr key={r.key}>
              <td>{itemName(r, lang)}</td>
              <td>{t(`shop.${r.shop}`)}</td>
              <td className="num">{formatQty(r.qty, r.unitType, t)}</td>
              <td className="num">{money(r.amount)}</td>
              <td className="num">{r.profitKnown ? signed(r.profit) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {shop === 'all' && data.expenses.length > 0 && (
        <>
          <h2>{t('exp.title')}</h2>
          <table>
            <tbody>
              {data.expenses.map((e) => (
                <tr key={e.id}><td>{fmtDate(e.date, lang)}</td><td>{t(`exp.t.${e.type}`)}{e.note ? ` · ${e.note}` : ''}</td><td className="num">{money(e.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

// ---------- add an expense ----------
function ExpenseSheet({ onClose }) {
  const { t, addExpense, toast } = useShop()
  const [type, setType] = useState('rent')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const icons = { rent: '🏠', electricity: '💡', transport: '🛺', salary: '👷', bags: '🛍️', other: '🧾' }
  return (
    <Modal open onClose={onClose} title={`🧾 ${t('exp.add')}`}>
      <form className="form-grid" onSubmit={async (e) => {
        e.preventDefault()
        if (!(Number(amount) > 0)) return
        await addExpense({ type, amount: Number(amount), note: note.trim() })
        toast(t('exp.saved'))
        onClose()
      }}>
        <p className="label">{t('exp.type')}</p>
        <div className="chips">
          {EXPENSE_TYPES.map((x) => <button key={x} type="button" className={type === x ? 'is-active' : ''} onClick={() => setType(x)}>{icons[x]} {t(`exp.t.${x}`)}</button>)}
        </div>
        <label className="field"><span>{t('exp.amount')}</span>
          <input type="number" inputMode="decimal" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </label>
        <label className="field"><span>{t('exp.note')}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary grow" disabled={!(Number(amount) > 0)}><Icon name="check" size={18} /> {t('common.save')}</button>
        </div>
      </form>
    </Modal>
  )
}

// ---------- profit & loss, written so a shopkeeper can read it like a sum ----------
//   Sales (cost known)  − cost of those items = profit from selling
//   − dustbin − expenses = money left in hand
// Sales with no cost price are shown separately (yellow box), never mixed into the sum.
function ProfitCard({ p, shop, kind, goTo }) {
  const { t } = useShop()
  const period = t(`pl.p.${kind}`)
  const good = p.net >= 0
  const noData = !p.hasCostData && p.sales > 0
  const hasUnknown = p.unknownSales > 0

  const Row = ({ icon, title, help, value, tone = '', sign = '' }) => (
    <li className={`pl2-row ${tone}`}>
      <span className="pl2-row__icon" aria-hidden="true">{icon}</span>
      <span className="pl2-row__text"><b>{title}</b><small>{help}</small></span>
      <span className="pl2-row__value">{sign}{money(Math.abs(value))}</span>
    </li>
  )

  return (
    <div className={`card pl2 ${noData ? 'is-unknown' : good ? 'is-good' : 'is-bad'}`}>
      <p className="pl2__sentence">{t('pl.sold').replace('{period}', period).replace('{amount}', money(p.sales))}</p>

      {noData ? (
        <div className="pl2__hero">
          <span className="pl2__hero-icon" aria-hidden="true">❔</span>
          <div>
            <strong className="pl2__hero-value pl2__hero-value--muted">{t('pl.unknownAll')}</strong>
            <small>{t('pl.unknownAllBody')}</small>
          </div>
        </div>
      ) : (
        <div className="pl2__hero">
          <span className="pl2__hero-icon" aria-hidden="true">{good ? '💰' : '📉'}</span>
          <div>
            <small>{good ? t('pl.kept') : t('pl.lost')}</small>
            <strong className="pl2__hero-value"><CountUp value={Math.abs(p.net)} /></strong>
          </div>
        </div>
      )}

      {hasUnknown && (
        <div className="pl2__unknown">
          <b>ℹ️ {t('pl.unknownTitle').replace('{amount}', money(p.unknownSales))}</b>
          <p>{t('pl.unknownBody')}</p>
          {goTo && <button type="button" className="btn btn-sm" onClick={() => goTo('stock')}>📦 {t('pl.goStock')}</button>}
        </div>
      )}

      {!noData && (
        <ul className="pl2-sum">
          <Row icon="💵" title={hasUnknown ? t('pl.r.salesKnown') : t('pl.r.sales')} help={t('pl.r.salesHelp')} value={p.knownSales} />
          <Row icon="🛒" title={t('pl.r.cost')} help={t('pl.r.costHelp')} value={p.cost} tone="is-cost" sign="− " />
          <li className="pl2-line" aria-hidden="true"></li>
          <Row icon="📈" title={t('pl.r.gross')} help="" value={p.gross} tone={p.gross < 0 ? 'is-loss is-strong' : 'is-strong'} sign={p.gross < 0 ? '− ' : '= '} />
          <Row icon="🗑️" title={t('pl.r.waste')} help={t('pl.r.wasteHelp')} value={p.wasteLoss} tone={p.wasteLoss ? 'is-loss' : ''} sign="− " />
          {shop === 'all' && <Row icon="🧾" title={t('pl.r.exp')} help={t('pl.r.expHelp')} value={p.expenseTotal} tone={p.expenseTotal ? 'is-exp' : ''} sign="− " />}
          <li className="pl2-line pl2-line--double" aria-hidden="true"></li>
          <Row icon={good ? '✅' : '🔴'} title={good ? t('pl.r.net') : t('pl.r.netLoss')} help="" value={p.net} tone={`is-total ${good ? 'is-good' : 'is-loss'}`} sign={good ? '= ' : '= − '} />
        </ul>
      )}

      {p.discount > 0 && <p className="pl2__note">🏷️ {t('pl.discountNote').replace('{amount}', money(p.discount))}</p>}
    </div>
  )
}

function LossList({ title, rows, icon, totalLabel, totalHelp }) {
  const { t, lang } = useShop()
  if (!rows.length) return null
  const total = rows.reduce((n, r) => n + r.loss, 0)
  return (
    <div className="loss-group">
      <h3>{icon} {title}</h3>
      <ul>
        {rows.slice(0, 8).map((r) => (
          <li key={r.key}>
            <ItemPhoto item={r} size="xs" />
            <span className="grow">{itemName(r, lang)} <small className="muted">{formatQty(r.qty, r.unitType, t)}</small></span>
            <b className="bad">−{money(r.loss)}</b>
          </li>
        ))}
      </ul>
      <div className="loss-group__total">
        <span>{totalLabel}{totalHelp && <small>{totalHelp}</small>}</span>
        <b>−{money(total)}</b>
      </div>
    </div>
  )
}

export default function Sales({ goTo }) {
  const { sales, wastes, expenses, t, lang, deleteSale, deleteExpense, toast } = useShop()
  const now = new Date()
  const [kind, setKind] = useState('today')
  const [shop, setShop] = useState('all')
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [chartField, setChartField] = useState('total')
  const [open, setOpen] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [addingExp, setAddingExp] = useState(false)
  const [making, setMaking] = useState(false)
  const reportRef = useRef(null)

  const years = useMemo(() => {
    const first = sales.length ? new Date(Math.min(...sales.map((s) => s.date))).getFullYear() : now.getFullYear()
    const list = []
    for (let y = now.getFullYear(); y >= first; y--) list.push(y)
    return list
  }, [sales]) // eslint-disable-line react-hooks/exhaustive-deps

  const range = useMemo(() => periodRange(kind, new Date(), { year, month }), [kind, year, month])
  const data = useMemo(() => summarize(sales, { kind, range, shop }, { wastes, expenses }), [sales, wastes, expenses, kind, range, shop])
  const p = data.profit
  const anyLoss = data.losses.waste.length + data.losses.discount.length + data.losses.belowCost.length > 0

  const labelOf = (b, long) => (kind === 'year'
    ? monthName(b.month, lang, long ? 'long' : 'short')
    : kind === 'today' ? `${String(b.hour).padStart(2, '0')}${long ? ':00' : ''}`
      : kind === 'week' ? b.day.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', { weekday: long ? 'long' : 'short' })
        : String(b.day.getDate()))

  const downloadPdf = async () => {
    setMaking(true)
    try {
      const name = kind === 'year' ? `${year}` : kind === 'month' ? `${year}-${String(month + 1).padStart(2, '0')}`
        : kind === 'today' ? now.toISOString().slice(0, 10) : 'last-7-days'
      await elementToPdf(reportRef.current, `report-${shop}-${name}.pdf`)
    } catch {
      toast('PDF failed', 'error')
    }
    setMaking(false)
  }

  return (
    <section className="page">
      <header className="page__head">
        <div>
          <h1>{t('sales.title')} & {t('profit.chartProfit')}</h1>
          <p className="muted">{t(`shop.${shop}`)}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={downloadPdf} disabled={making}>
          <Icon name="download" size={18} /> {making ? t('sales.pdfMaking') : t('sales.pdf')}
        </button>
      </header>

      <div className="toolbar toolbar--wrap">
        <Segmented value={kind} onChange={setKind} options={[
          { value: 'today', label: t('profit.today') },
          { value: 'week', label: t('sales.week') },
          { value: 'month', label: t('sales.month') },
          { value: 'year', label: t('sales.year') },
        ]} />
        {kind === 'month' && (
          <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label={t('sales.month')}>
            {Array.from({ length: 12 }, (_, m) => <option key={m} value={m}>{monthName(m, lang)}</option>)}
          </select>
        )}
        {(kind === 'month' || kind === 'year') && (
          <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label={t('sales.year')}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {kind === 'week' && <span className="muted">{t('sales.last7')}</span>}
        <Segmented className="seg--push" value={shop} onChange={setShop} options={[
          { value: 'all', label: t('shop.all') },
          { value: 'grocery', label: t('shop.grocery'), icon: '🛒' },
          { value: 'vegetable', label: t('shop.vegetable'), icon: '🥬' },
        ]} />
      </div>

      <div className="pl-layout">
        <ProfitCard p={p} shop={shop} kind={kind} goTo={goTo} />
        <div className="stats stats--2">
          <div className="stat stat--main">
            <small>{t('sales.revenue')}</small>
            <strong><CountUp value={data.total} /></strong>
            <div className="stat__split"><span>{t('pay.upi')} {money(data.byMethod.upi)}</span><span>{t('pay.cash')} {money(data.byMethod.cash)}</span></div>
          </div>
          <div className="stat"><small>{t('sales.billsCount')}</small><strong><CountUp value={data.bills} format={(n) => Math.round(n)} /></strong></div>
          <div className="stat"><small>{t('sales.avgBill')}</small><strong><CountUp value={data.avg} /></strong></div>
          {shop === 'all' && (
            <div className="stat stat--shops">
              <small>{t('sales.byShop')}</small>
              <div className="shopbar">
                <span className="shopbar__g" style={{ flexGrow: data.byShop.grocery || 0.0001 }}></span>
                <span className="shopbar__v" style={{ flexGrow: data.byShop.vegetable || 0.0001 }}></span>
              </div>
              <div className="stat__split"><span>🛒 {money(data.byShop.grocery)}</span><span>🥬 {money(data.byShop.vegetable)}</span></div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card__row">
          <h2 className="card__title">{chartField === 'total' ? t('profit.chartSales') : t('profit.chartProfit')}</h2>
          <Segmented value={chartField} onChange={setChartField} options={[
            { value: 'total', label: t('profit.chartSales') },
            { value: 'profit', label: t('profit.chartProfit') },
          ]} />
        </div>
        <BarChart key={`${kind}-${shop}-${year}-${month}-${chartField}`} data={data.chart} labelOf={labelOf} field={chartField} />
      </div>

      <div className="two-col">
        <div className="card">
          <h2 className="card__title">🔍 {t('profit.where')}</h2>
          {!anyLoss ? <p className="muted">{t('profit.noLoss')}</p> : (
            <>
              <LossList title={t('profit.wasteBy')} rows={data.losses.waste} icon="🗑️" totalLabel={t('pl.wasteTotal')} />
              <LossList title={t('profit.belowCost')} rows={data.losses.belowCost} icon="📉" totalLabel={t('pl.belowTotal')} />
              <LossList title={t('profit.discountBy')} rows={data.losses.discount} icon="🏷️" totalLabel={t('pl.discTotal')} totalHelp={t('pl.discTotalHelp')} />
            </>
          )}
        </div>

        <div className="card">
          <h2 className="card__title">🏆 {data.topProfit.length ? t('profit.topProfit') : t('sales.top')}</h2>
          {data.itemsSold.length === 0 ? <p className="muted">{t('sales.none')}</p> : (
            <ol className="top-items">
              {(data.topProfit.length ? data.topProfit : data.itemsSold).slice(0, 8).map((r, i, arr) => {
                const v = data.topProfit.length ? r.profit : r.amount
                const top = Math.max(1, Math.abs(data.topProfit.length ? arr[0].profit : arr[0].amount))
                return (
                  <li key={r.key}>
                    <span className="rank">{i + 1}</span>
                    <span className="grow">{itemName(r, lang)} <small className="muted">{formatQty(r.qty, r.unitType, t)}</small></span>
                    <b className={v < 0 ? 'bad' : ''}>{signed(v)}</b>
                    <span className="top-items__bar" style={{ width: `${Math.max(0, (v / top) * 100)}%` }}></span>
                  </li>
                )
              })}
            </ol>
          )}
          {data.topProfit.length > 0 && (
            <div className="top-total">
              <div><span>{t('pl.topTotal')}</span><b>{signed(p.gross)}</b></div>
              <small>{t('pl.topNet').replace('{amount}', signed(p.net))}</small>
            </div>
          )}
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card__row">
            <h2 className="card__title">🧾 {t('exp.title')}</h2>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setAddingExp(true)}><Icon name="plus" size={16} /> {t('exp.add')}</button>
          </div>
          {shop !== 'all' && <p className="hint">{t('exp.shopNote')}</p>}
          {data.expenses.length === 0 && shop === 'all' ? <p className="muted">{t('exp.none')}</p> : (
            <ul className="bills">
              {data.expenses.map((e) => (
                <li key={e.id}>
                  <div className="bills__row">
                    <span className="grow">{t(`exp.t.${e.type}`)} <small className="muted">{fmtDate(e.date, lang, { day: '2-digit', month: 'short' })}{e.note ? ` · ${e.note}` : ''}</small></span>
                    <b>{money(e.amount)}</b>
                    <button type="button" className="icon-btn" aria-label={t('common.delete')} onClick={() => setRemoving({ kind: 'exp', exp: e })}><Icon name="x" size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="card__title">{t('sales.recent')} <span className="muted">({data.bills})</span></h2>
          {data.list.length === 0 ? <p className="muted">{t('sales.none')}</p> : (
            <ul className="bills">
              {data.list.slice(0, 60).map((s) => (
                <li key={s.id} className={open === s.id ? 'is-open' : ''}>
                  <button type="button" className="bills__row" onClick={() => setOpen(open === s.id ? null : s.id)}>
                    <span className="bills__no">#{s.billNo}</span>
                    <span className="grow">{fmtDate(s.date, lang, { day: '2-digit', month: 'short' })} · {fmtTime(s.date, lang)}</span>
                    <span className={`tag tag--${s.method}`}>{s.method === 'upi' ? t('pay.upi') : t('pay.cash')}</span>
                    <b>{money(data.amountOf(s))}</b>
                  </button>
                  {open === s.id && (
                    <div className="bills__detail">
                      {linesFor(s, shop).map((l) => (
                        <div key={l.id} className="bills__line">
                          <ItemPhoto item={l} size="xs" />
                          <span className="grow">{itemName(l, lang)} <small className="muted">{formatQty(l.qty, l.unitType, t)} × {formatRate(l, t)}{l.lotDate ? ` · ${t('stock.lot')} ${fmtDate(l.lotDate, lang, { day: '2-digit', month: 'short' })}` : ''}</small></span>
                          <span>{money(l.amount)}{typeof l.cost === 'number' && <small className={l.amount - l.cost < 0 ? 'bad' : 'good'}> ({signed(l.amount - l.cost)})</small>}</span>
                        </div>
                      ))}
                      <button type="button" className="btn btn-sm btn-ghost-danger" onClick={() => setRemoving({ kind: 'bill', sale: s })}>
                        <Icon name="trash" size={16} /> {t('common.delete')}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="offscreen" aria-hidden="true">
        <Report data={data} kind={kind} range={range} shop={shop} refEl={reportRef} />
      </div>

      {addingExp && <ExpenseSheet onClose={() => setAddingExp(false)} />}
      <Confirm open={!!removing} text={removing?.kind === 'exp' ? t('exp.deleteAsk') : t('sales.deleteBill')} onNo={() => setRemoving(null)}
        onYes={async () => {
          if (removing.kind === 'exp') await deleteExpense(removing.exp.id)
          else { await deleteSale(removing.sale.id); setOpen(null); toast(t('sales.billDeleted')) }
          setRemoving(null)
        }} />
    </section>
  )
}
