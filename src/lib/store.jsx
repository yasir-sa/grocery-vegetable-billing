import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { db, newId, requestPersistence } from './db'
import { makeT } from './i18n'
import { SAMPLE_ITEMS, samplePhotoUrl } from './sampleItems'
import { round2 } from './pricing'
import { saveFile } from './saveFile'
import { valueAt } from './stock'

const ShopContext = createContext(null)

const DEFAULT_SETTINGS = {
  shopName: 'ABDHULLAH Shop',
  phone: '',
  address: '',
  qr: null, // UPI QR photo (data URL)
  theme: 'light',
  lang: 'en',
  nextBillNo: 1,
  seeded: false,
}

// Loads a photo from the app folder and stores it as a data URL (so it lives in the database).
async function urlToDataUrl(url) {
  const blob = await (await fetch(url)).blob()
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

export function ShopProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [items, setItems] = useState([])
  const [sales, setSales] = useState([])
  const [lots, setLots] = useState([])
  const [wastes, setWastes] = useState([])
  const [expenses, setExpenses] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [toasts, setToasts] = useState([])

  const toast = useCallback((text, kind = 'ok') => {
    const id = newId()
    setToasts((list) => [...list, { id, text, kind }])
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 2600)
  }, [])

  const saveSettings = useCallback(async (patch) => {
    let next
    setSettings((s) => { next = { ...s, ...patch }; return next })
    await Promise.all(Object.entries(patch).map(([key, value]) => db.put('settings', { key, value })))
    return next
  }, [])

  const loadSamples = useCallback(async () => {
    const now = Date.now()
    const list = await Promise.all(SAMPLE_ITEMS.map(async (s, i) => {
      const url = samplePhotoUrl(s.key)
      let photo = null
      if (url) { try { photo = await urlToDataUrl(url) } catch { photo = null } }
      const { key, ...rest } = s
      return { ...rest, id: newId(), photo, createdAt: now + i, updatedAt: now + i }
    }))
    await db.putMany('items', list)
    setItems((old) => [...old, ...list])
    return list.length
  }, [])

  // First start: read everything; add the sample items once.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      requestPersistence()
      const [its, sls, sets, lts, wst, exp] = await Promise.all([
        db.all('items'), db.all('sales'), db.all('settings'), db.all('lots'), db.all('wastes'), db.all('expenses'),
      ])
      if (cancelled) return
      const s = { ...DEFAULT_SETTINGS }
      sets.forEach(({ key, value }) => { s[key] = value })
      setItems(its)
      setSales(sls.sort((a, b) => b.date - a.date))
      setLots(lts)
      setWastes(wst.sort((a, b) => b.date - a.date))
      setExpenses(exp.sort((a, b) => b.date - a.date))
      setSettings(s)
      if (!s.seeded && its.length === 0) {
        await loadSamples()
        await saveSettings({ seeded: true })
      }
      setReady(true)
    })()
    return () => { cancelled = true }
  }, [loadSamples, saveSettings])

  // Theme + language on <html>.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document.documentElement.lang = settings.lang
    document.documentElement.classList.toggle('lang-ta', settings.lang === 'ta')
  }, [settings.theme, settings.lang])

  const t = useMemo(() => makeT(settings.lang), [settings.lang])

  // ---------- items (CRUD) ----------
  const saveItem = useCallback(async (item) => {
    const now = Date.now()
    const full = { ...item, id: item.id ?? newId(), createdAt: item.createdAt ?? now, updatedAt: now }
    await db.put('items', full)
    setItems((list) => (list.some((x) => x.id === full.id) ? list.map((x) => (x.id === full.id ? full : x)) : [...list, full]))
    return full
  }, [])

  const deleteItem = useCallback(async (id) => {
    await db.remove('items', id)
    setItems((list) => list.filter((x) => x.id !== id))
  }, [])

  // ---------- sales ----------
  // Bill lines keep a copy of the item name/price, so old bills stay correct after edits.
  const addSale = useCallback(async ({ lines, method }) => {
    const billNo = settings.nextBillNo
    const total = round2(lines.reduce((n, l) => n + l.amount, 0))
    const sale = {
      id: newId(),
      billNo,
      date: Date.now(),
      method,
      lines,
      total,
      byShop: {
        grocery: round2(lines.filter((l) => l.shop === 'grocery').reduce((n, l) => n + l.amount, 0)),
        vegetable: round2(lines.filter((l) => l.shop === 'vegetable').reduce((n, l) => n + l.amount, 0)),
      },
    }
    await db.put('sales', sale)
    await saveSettings({ nextBillNo: billNo + 1 })
    await moveStock(lines.filter((l) => l.lotId).map((l) => [l.lotId, -l.qty]))
    setSales((list) => [sale, ...list])
    return sale
  }, [settings.nextBillNo, saveSettings]) // eslint-disable-line react-hooks/exhaustive-deps

  // Deleting a bill puts its quantities back into the lots.
  const deleteSale = useCallback(async (id) => {
    const sale = sales.find((x) => x.id === id)
    await db.remove('sales', id)
    if (sale) await moveStock(sale.lines.filter((l) => l.lotId).map((l) => [l.lotId, l.qty]))
    setSales((list) => list.filter((x) => x.id !== id))
  }, [sales]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- stock: lots (purchases) ----------
  // changes: [[lotId, +qty | -qty], …]. Remaining never goes below 0.
  async function moveStock(changes) {
    if (!changes.length) return
    const current = await db.all('lots')
    const touched = []
    changes.forEach(([lotId, delta]) => {
      const lot = current.find((l) => l.id === lotId)
      if (!lot) return
      lot.remaining = Math.max(0, Math.round((lot.remaining + delta) * 100) / 100)
      if (!touched.includes(lot)) touched.push(lot)
    })
    await db.putMany('lots', touched)
    setLots((list) => list.map((l) => touched.find((x) => x.id === l.id) ?? l))
  }

  const saveLot = useCallback(async (lot) => {
    const full = { ...lot, id: lot.id ?? newId(), createdAt: lot.createdAt ?? Date.now() }
    await db.put('lots', full)
    setLots((list) => (list.some((x) => x.id === full.id) ? list.map((x) => (x.id === full.id ? full : x)) : [...list, full]))
    return full
  }, [])

  const deleteLot = useCallback(async (id) => {
    await db.remove('lots', id)
    setLots((list) => list.filter((x) => x.id !== id))
  }, [])

  // ---------- dustbin (wastage) ----------
  // Valued at the lot's cost price; the quantity leaves the lot.
  const addWaste = useCallback(async ({ item, lot, qty, reason, note }) => {
    const priceQty = lot?.priceQty ?? item.priceQty
    const costRate = lot?.cost ?? item.costPrice ?? 0
    const waste = {
      id: newId(), date: Date.now(), itemId: item.id, lotId: lot?.id ?? null, lotDate: lot?.date ?? null,
      nameEn: item.nameEn, nameTa: item.nameTa, shop: item.shop, unitType: item.unitType, emoji: item.emoji,
      qty, priceQty, costRate, loss: valueAt(costRate, priceQty, qty), reason, note: note ?? '',
    }
    await db.put('wastes', waste)
    if (lot) await moveStock([[lot.id, -qty]])
    setWastes((list) => [waste, ...list])
    return waste
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteWaste = useCallback(async (id) => {
    const w = wastes.find((x) => x.id === id)
    await db.remove('wastes', id)
    if (w?.lotId) await moveStock([[w.lotId, w.qty]])
    setWastes((list) => list.filter((x) => x.id !== id))
  }, [wastes]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- expenses ----------
  const addExpense = useCallback(async (exp) => {
    const full = { ...exp, id: newId(), date: exp.date ?? Date.now() }
    await db.put('expenses', full)
    setExpenses((list) => [full, ...list].sort((a, b) => b.date - a.date))
  }, [])

  const deleteExpense = useCallback(async (id) => {
    await db.remove('expenses', id)
    setExpenses((list) => list.filter((x) => x.id !== id))
  }, [])

  // ---------- backup ----------
  const exportBackup = useCallback(() => {
    const data = { app: 'abdhullah-shop', version: 2, exportedAt: Date.now(), items, sales, lots, wastes, expenses, settings }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    return saveFile(blob, `abdhullah-shop-backup-${new Date().toISOString().slice(0, 10)}.json`)
  }, [items, sales, lots, wastes, expenses, settings])

  const importBackup = useCallback(async (file) => {
    const data = JSON.parse(await file.text())
    if (data?.app !== 'abdhullah-shop' || !Array.isArray(data.items) || !Array.isArray(data.sales)) throw new Error('bad file')
    for (const store of ['items', 'sales', 'lots', 'wastes', 'expenses']) await db.clear(store)
    await db.putMany('items', data.items)
    await db.putMany('sales', data.sales)
    await db.putMany('lots', data.lots ?? [])
    await db.putMany('wastes', data.wastes ?? [])
    await db.putMany('expenses', data.expenses ?? [])
    setItems(data.items)
    setSales([...data.sales].sort((a, b) => b.date - a.date))
    setLots(data.lots ?? [])
    setWastes([...(data.wastes ?? [])].sort((a, b) => b.date - a.date))
    setExpenses([...(data.expenses ?? [])].sort((a, b) => b.date - a.date))
    if (data.settings) await saveSettings({ ...data.settings, theme: settings.theme, lang: settings.lang })
  }, [saveSettings, settings.theme, settings.lang])

  const value = useMemo(() => ({
    ready, items, sales, lots, wastes, expenses, settings, t, lang: settings.lang, toast, toasts,
    saveItem, deleteItem, loadSamples, addSale, deleteSale, saveSettings, exportBackup, importBackup,
    saveLot, deleteLot, addWaste, deleteWaste, addExpense, deleteExpense,
  }), [ready, items, sales, lots, wastes, expenses, settings, t, toast, toasts, saveItem, deleteItem, loadSamples, addSale,
    deleteSale, saveSettings, exportBackup, importBackup, saveLot, deleteLot, addWaste, deleteWaste, addExpense, deleteExpense])

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export const useShop = () => useContext(ShopContext)

