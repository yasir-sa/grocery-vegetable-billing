import { buckets, inRange } from './dates'
import { round2 } from './pricing'

// Lines of a bill that belong to the chosen shop ('all' = every line).
export const linesFor = (sale, shop) => (shop === 'all' ? sale.lines : sale.lines.filter((l) => l.shop === shop))

const sum = (list, f) => round2(list.reduce((n, x) => n + (f(x) || 0), 0))
const hasCost = (l) => typeof l.cost === 'number'

// Everything the Sales screen and the PDF report need for one period + shop:
// sales, profit and loss (cost of goods, dustbin, discounts, expenses) and where losses came from.
//   net profit = (sales of lines with a known cost − their cost) − dustbin loss − expenses
// Discounts are already inside the sale amounts; they are shown so the owner sees what was given away.
// Expenses belong to the whole shop, so they are counted only in the "both shops" view.
export function summarize(sales, { kind, range, shop }, extra = {}) {
  const wastesAll = extra.wastes ?? []
  const expensesAll = extra.expenses ?? []

  const inPeriod = sales.filter((s) => inRange(s.date, range) && linesFor(s, shop).length > 0)
  const amountOf = (s) => sum(linesFor(s, shop), (l) => l.amount)
  const lines = inPeriod.flatMap((s) => linesFor(s, shop))
  const wastes = wastesAll.filter((w) => inRange(w.date, range) && (shop === 'all' || w.shop === shop))
  const expenses = shop === 'all' ? expensesAll.filter((e) => inRange(e.date, range)) : []

  const total = sum(inPeriod, amountOf)
  const bills = inPeriod.length
  const byShop = {
    grocery: sum(inPeriod, (s) => (shop === 'vegetable' ? 0 : s.byShop.grocery)),
    vegetable: sum(inPeriod, (s) => (shop === 'grocery' ? 0 : s.byShop.vegetable)),
  }
  const byMethod = { upi: 0, cash: 0 }
  inPeriod.forEach((s) => { byMethod[s.method] = round2((byMethod[s.method] ?? 0) + amountOf(s)) })

  // ---- profit & loss ----
  const known = lines.filter(hasCost)
  const knownSales = sum(known, (l) => l.amount)
  const cost = sum(known, (l) => l.cost)
  const gross = round2(knownSales - cost)
  const unknownSales = round2(total - knownSales)
  const discount = sum(lines, (l) => l.discount)
  const wasteLoss = sum(wastes, (w) => w.loss)
  const expenseTotal = sum(expenses, (e) => e.amount)
  const net = round2(gross - wasteLoss - expenseTotal)
  // knownSales − cost = gross, so the card can be read as simple subtraction.
  const profit = { sales: total, knownSales, cost, gross, unknownSales, discount, wasteLoss, expenseTotal, net, hasCostData: known.length > 0 }

  // ---- chart: sales and profit per day / month / hour ----
  const chart = buckets(kind, range).map((b) => {
    const inB = (ts) => ts >= b.start.getTime() && ts < b.end.getTime()
    const list = inPeriod.filter((s) => inB(s.date))
    const bl = list.flatMap((s) => linesFor(s, shop))
    const bProfit = round2(sum(bl.filter(hasCost), (l) => l.amount - l.cost)
      - sum(wastes.filter((w) => inB(w.date)), (w) => w.loss)
      - sum(expenses.filter((e) => inB(e.date)), (e) => e.amount))
    return { ...b, total: sum(list, amountOf), profit: bProfit, bills: list.length }
  })

  // ---- item-wise (sold qty, sales, profit) ----
  const group = (map, key, base, add) => {
    const row = map.get(key) ?? { ...base }
    add(row)
    map.set(key, row)
  }
  const keyOf = (x) => x.itemId ?? x.nameEn
  const base = (x) => ({ key: keyOf(x), nameEn: x.nameEn, nameTa: x.nameTa, unitType: x.unitType, shop: x.shop, emoji: x.emoji, qty: 0, amount: 0, profit: 0, profitKnown: false })
  const itemMap = new Map()
  lines.forEach((l) => group(itemMap, keyOf(l), base(l), (r) => {
    r.qty = round2(r.qty + l.qty)
    r.amount = round2(r.amount + l.amount)
    if (hasCost(l)) { r.profit = round2(r.profit + l.amount - l.cost); r.profitKnown = true }
  }))
  const itemsSold = [...itemMap.values()].sort((a, b) => b.amount - a.amount)
  const topProfit = itemsSold.filter((r) => r.profitKnown).sort((a, b) => b.profit - a.profit)

  // ---- where did the loss come from? ----
  const wasteMap = new Map()
  wastes.forEach((w) => group(wasteMap, keyOf(w), { ...base(w), loss: 0, count: 0 }, (r) => {
    r.qty = round2(r.qty + w.qty); r.loss = round2(r.loss + w.loss); r.count += 1
  }))
  const discMap = new Map()
  lines.filter((l) => l.discount > 0).forEach((l) => group(discMap, keyOf(l), { ...base(l), loss: 0 }, (r) => {
    r.qty = round2(r.qty + l.qty); r.loss = round2(r.loss + l.discount)
  }))
  const belowMap = new Map()
  known.filter((l) => l.amount < l.cost).forEach((l) => group(belowMap, keyOf(l), { ...base(l), loss: 0 }, (r) => {
    r.qty = round2(r.qty + l.qty); r.loss = round2(r.loss + (l.cost - l.amount))
  }))
  const byLoss = (m) => [...m.values()].sort((a, b) => b.loss - a.loss)
  const losses = { waste: byLoss(wasteMap), discount: byLoss(discMap), belowCost: byLoss(belowMap) }

  return {
    list: inPeriod, total, bills, avg: bills ? round2(total / bills) : 0, byShop, byMethod, chart,
    itemsSold, topProfit, profit, losses, wastes, expenses, amountOf,
  }
}
