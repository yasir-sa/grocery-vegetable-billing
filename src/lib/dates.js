// Period helpers for the sales screens and PDF reports (local time).

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

// Week = the 7 days ending today (simplest for a shopkeeper: "last 7 days").
export function periodRange(kind, ref = new Date(), opts = {}) {
  if (kind === 'today') {
    const start = startOfDay(ref)
    return { start, end: addDays(start, 1) }
  }
  if (kind === 'week') {
    const end = addDays(startOfDay(ref), 1)
    return { start: addDays(end, -7), end }
  }
  if (kind === 'month') {
    const y = opts.year ?? ref.getFullYear()
    const m = opts.month ?? ref.getMonth()
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) }
  }
  const y = opts.year ?? ref.getFullYear()
  return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) }
}

// Buckets for the chart: days for week/month, months for year.
export function buckets(kind, range) {
  const out = []
  if (kind === 'today') {
    for (let h = 0; h < 24; h++) {
      const st = new Date(range.start.getTime() + h * 3600000)
      out.push({ start: st, end: new Date(st.getTime() + 3600000), key: `h${h}`, hour: h })
    }
    return out
  }
  if (kind === 'year') {
    for (let m = 0; m < 12; m++) {
      const s = new Date(range.start.getFullYear(), m, 1)
      out.push({ start: s, end: new Date(s.getFullYear(), m + 1, 1), key: `m${m}`, month: m })
    }
    return out
  }
  for (let d = range.start; d < range.end; d = addDays(d, 1)) {
    out.push({ start: d, end: addDays(d, 1), key: d.toISOString().slice(0, 10), day: d })
  }
  return out
}

export const inRange = (ts, range) => ts >= range.start.getTime() && ts < range.end.getTime()

export function fmtDate(ts, lang, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  return new Date(ts).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', opts)
}
export function fmtTime(ts, lang) {
  return new Date(ts).toLocaleTimeString(lang === 'ta' ? 'ta-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' })
}
export function monthName(m, lang, style = 'long') {
  return new Date(2024, m, 1).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', { month: style })
}
