// Nepal runs on a fixed UTC+5:45 with no daylight saving, so every date is formatted by
// shifting the timestamp instead of relying on Intl. That keeps the server and the browser
// byte-identical, whatever locale data each one ships.
const NPT_OFFSET_MS = (5 * 60 + 45) * 60_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_MS = 86_400_000

function npt(iso: string | number | Date) {
  return new Date(new Date(iso).getTime() + NPT_OFFSET_MS)
}

/** 124500 -> "1,24,500" (Nepali grouping: thousands, then lakhs in pairs). */
export function group(n: number) {
  const value = Math.round(n)
  const digits = String(Math.abs(value))
  const sign = value < 0 ? '-' : ''
  if (digits.length <= 3) return sign + digits
  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${sign}${head},${digits.slice(-3)}`
}

export function rs(n: number) {
  return `Rs ${group(n)}`
}

/** Chart axis labels: 160000 -> "1.6L", 80000 -> "80K". */
export function compact(n: number) {
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

export function fmtDate(iso: string) {
  const d = npt(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function fmtTime(iso: string) {
  const d = npt(iso)
  const h = d.getUTCHours()
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

export function fmtDateTime(iso: string) {
  const d = npt(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${fmtTime(iso)}`
}

/** Kathmandu calendar day, "2026-11-23". */
export function dayKey(iso: string | number | Date) {
  return npt(iso).toISOString().slice(0, 10)
}

/** Kathmandu calendar month, "2026-11". */
export function monthKey(iso: string | number | Date) {
  return dayKey(iso).slice(0, 7)
}

export function monthLabel(key: string) {
  return MONTHS[Number(key.slice(5, 7)) - 1]
}

/** The last `count` month keys ending with the month of `now`, oldest first. */
export function lastMonths(count: number, now: string) {
  const [year, month] = monthKey(now).split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1))
    return d.toISOString().slice(0, 7)
  })
}

/** "2026-12-05" -> "5 Dec 2026". */
export function fmtDay(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** Whole days from today (Kathmandu) until a calendar day; negative when it has passed. */
export function daysUntil(day: string, now: string) {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${dayKey(now)}T00:00:00Z`)) / DAY_MS)
}

export function addDays(now: string | number, days: number) {
  return dayKey(new Date(now).getTime() + days * DAY_MS)
}

export function ago(iso: string, now: string) {
  const mins = Math.max(0, Math.floor((Date.parse(now) - Date.parse(iso)) / 60_000))
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`
  const days = Math.floor(mins / (60 * 24))
  return days < 30 ? `${days}d ago` : fmtDate(iso)
}

export function dueLabel(day: string, now: string) {
  const days = daysUntil(day, now)
  if (days < 0) return `${-days} ${days === -1 ? 'day' : 'days'} overdue`
  if (days === 0) return 'due today'
  return `due in ${days} ${days === 1 ? 'day' : 'days'}`
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** Reads CSV text into rows of cells, honouring quoted cells, escaped quotes and line breaks. */
export function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const source = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i += 1 }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(cell.trim()); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i += 1
      row.push(cell.trim()); cell = ''
      if (row.some((c) => c !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell.trim())
  if (row.some((c) => c !== '')) rows.push(row)
  return rows
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${group(n)} ${n === 1 ? one : many}`
}

export function toCsv(rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v)
    // Lead with an apostrophe when a cell could be read as a spreadsheet formula.
    const safe = /^[=+\-@\t\r]/.test(s) && typeof v !== 'number' ? `'${s}` : s
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  return rows.map((r) => r.map(cell).join(',')).join('\n')
}
