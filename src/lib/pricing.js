// How an item is priced and how a bill line is calculated.
//   weight: "500 g = ₹50"   -> customer buys 750 g  -> ₹75
//   volume: "1 L = ₹180"    -> customer buys 500 ml -> ₹90
//   count:  "1 piece = ₹20" -> customer buys 3      -> ₹60
// Quantities are stored in base units: grams, millilitres or pieces.

export const UNIT_TYPES = ['weight', 'volume', 'count']
export const SHOPS = ['grocery', 'vegetable']

export const BASE_UNIT = { weight: 'g', volume: 'ml', count: 'pcs' }

// Quick quantity buttons on the billing screen.
export const QUICK_QTY = {
  weight: [100, 250, 500, 1000, 2000],
  volume: [100, 250, 500, 1000, 2000],
  count: [1, 2, 3, 5, 10],
}

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

// Price of `qty` (base units) of the item.
export function lineAmount(item, qty) {
  if (!item || !(qty > 0) || !(item.priceQty > 0)) return 0
  return round2((qty / item.priceQty) * item.price)
}

// "750 g", "1.5 kg", "500 ml", "2 L", "3 pcs"
export function formatQty(qty, unitType, t) {
  if (unitType === 'weight') return qty >= 1000 ? `${trim(qty / 1000)} ${t('unit.kg')}` : `${trim(qty)} ${t('unit.g')}`
  if (unitType === 'volume') return qty >= 1000 ? `${trim(qty / 1000)} ${t('unit.l')}` : `${trim(qty)} ${t('unit.ml')}`
  return `${trim(qty)} ${t('unit.pcs')}`
}

// "₹50 / 500 g"
export function formatRate(item, t) {
  return `${money(item.price)} / ${formatQty(item.priceQty, item.unitType, t)}`
}

const trim = (n) => String(round2(n))

// ₹120 for whole rupees, ₹7,272.50 when there are paise.
const inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const money = (n) => {
  const v = round2(n || 0)
  return `₹${Number.isInteger(v) ? inr0.format(v) : inr2.format(v)}`
}

// Turns what the shopkeeper types ("1.5" + "kg") into base units (1500 g).
export function toBase(value, unit) {
  const v = Number(value)
  if (!(v > 0)) return 0
  if (unit === 'kg' || unit === 'l') return round2(v * 1000)
  return round2(v)
}
