// Stock = lots (each purchase of an item). Quantities are in base units (g / ml / pcs) and
// prices are "per lot.priceQty" like items ("₹30 per 1000 g").
import { round2 } from './pricing'
import { startOfDay } from './dates'

const DAY = 86400000

// Whole days since the lot was bought (0 = today).
export const ageDays = (ts, now = Date.now()) =>
  Math.max(0, Math.round((startOfDay(new Date(now)).getTime() - startOfDay(new Date(ts)).getTime()) / DAY))

// 🟢 today · 🟡 1–2 days · 🔴 3+ days
export const ageLevel = (days) => (days <= 0 ? 'fresh' : days <= 2 ? 'aging' : 'old')

// Lots with stock left, oldest first (sell old stock first).
export const openLots = (lots, itemId) =>
  lots.filter((l) => l.itemId === itemId && l.remaining > 0).sort((a, b) => a.date - b.date)

export const stockOf = (lots, itemId) => round2(openLots(lots, itemId).reduce((n, l) => n + l.remaining, 0))

// Money value of `qty` at a rate given "per priceQty".
export const valueAt = (rate, priceQty, qty) => (rate > 0 && priceQty > 0 && qty > 0 ? round2((qty / priceQty) * rate) : 0)

// Cost of selling `qty` from a lot (or from the item's default cost when there is no lot).
export function costFor({ lot, item, qty }) {
  if (lot) return valueAt(lot.cost, lot.priceQty, qty)
  if (item?.costPrice > 0) return valueAt(item.costPrice, item.priceQty, qty)
  return null // cost unknown — profit for this line can't be worked out
}

export const WASTE_REASONS = ['rotten', 'damaged', 'expired', 'count', 'other']
export const EXPENSE_TYPES = ['rent', 'electricity', 'transport', 'salary', 'bags', 'other']
