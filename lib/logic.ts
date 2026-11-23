import { dayKey, daysUntil } from '@/lib/format'
import type { AppState, Item, MoveType, Order, OrderStatus, Payment, Product, Schedule } from '@/lib/types'

export type Tone = 'green' | 'amber' | 'red' | 'teal' | 'blue' | 'grey'

export const FLOW: OrderStatus[] = ['pending', 'accepted', 'packed', 'dispatched', 'delivered']

export const ORDER_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending', accepted: 'Accepted', packed: 'Packed', dispatched: 'Dispatched', delivered: 'Delivered',
  rejected: 'Rejected', cancelled: 'Cancelled',
}

export const ORDER_TONE: Record<OrderStatus, Tone> = {
  pending: 'grey', accepted: 'teal', packed: 'amber', dispatched: 'blue', delivered: 'green', rejected: 'red', cancelled: 'grey',
}

export const MOVE_LABEL: Record<MoveType, string> = {
  sold: 'Sold', added: 'Added', received: 'Received from supplier', damaged: 'Damaged', expired: 'Expired',
  removed: 'Removed', counted: 'Stock count', returned: 'Returned to supplier',
}

export function stockStatus(item: Pick<Item, 'qty' | 'threshold'>): { key: 'ok' | 'low' | 'out'; label: string; tone: Tone } {
  if (item.qty <= 0) return { key: 'out', label: 'Out of Stock', tone: 'red' }
  if (item.qty <= item.threshold) return { key: 'low', label: 'Low Stock', tone: 'amber' }
  return { key: 'ok', label: 'OK', tone: 'green' }
}

export function isOpen(o: Order) {
  return o.status !== 'delivered' && o.status !== 'rejected' && o.status !== 'cancelled'
}

export function amountDue(o: Order) {
  if (o.payStatus === 'paid') return 0
  if (o.udharo && !o.udharo.settledAt) return o.udharo.amount
  return o.total
}

export function isPayable(o: Order) {
  return (o.status === 'accepted' || o.status === 'packed' || o.status === 'dispatched' || o.status === 'delivered')
    && (o.payStatus === 'unpaid' || o.payStatus === 'udharo') && amountDue(o) > 0
}

export function payBadge(o: Order): { label: string; tone: Tone } | null {
  if (o.status === 'rejected' || o.status === 'cancelled') return null
  if (o.payStatus === 'paid') return { label: 'Paid', tone: 'green' }
  if (o.payStatus === 'proof') return { label: 'Proof submitted', tone: 'amber' }
  if (o.payStatus === 'udharo') return { label: 'Udharo', tone: 'blue' }
  return { label: 'Unpaid', tone: 'grey' }
}

export function paymentBadge(p: Payment): { label: string; tone: Tone } {
  if (p.status === 'verified') return { label: 'Verified', tone: 'green' }
  if (p.status === 'rejected') return { label: 'Rejected', tone: 'red' }
  return { label: 'Waiting for supplier', tone: 'amber' }
}

export function tierPrice(p: Product, qty: number) {
  return p.tiers.reduce((price, t) => (qty >= t.min ? t.price : price), p.price)
}

/** Enough to bring an item back to twice its reorder level, never under the supplier's minimum. */
export function suggestQty(item: Item, product?: Product) {
  return Math.max(product?.moq ?? 1, item.threshold * 2 - item.qty, 1)
}

/** The catalog product an item is restocked from, if its supplier still lists it. */
export function productFor(s: AppState, item: Item) {
  const p = s.products.find((x) => x.id === item.productId)
  return p && p.available ? p : undefined
}

export function partnerName(s: AppState, id?: string) {
  return s.partners.find((p) => p.id === id)?.name ?? s.directory.find((p) => p.id === id)?.name ?? 'Unknown business'
}

export function cartCount(s: AppState) {
  return s.cart.length
}

export type ExpiryState = { days: number; tone: Tone; label: string }

export function expiryState(item: Item, now: string): ExpiryState | null {
  if (!item.expiry) return null
  const days = daysUntil(item.expiry, now)
  if (days < 0) return { days, tone: 'red', label: `${-days} ${days === -1 ? 'day' : 'days'} ago` }
  if (days === 0) return { days, tone: 'red', label: 'Today' }
  return { days, tone: days <= 30 ? 'amber' : 'grey', label: `${days} ${days === 1 ? 'day' : 'days'} left` }
}

/** The next calendar day a recurring order falls on, starting tomorrow if it already ran today. */
export function nextRun(schedule: Schedule, now: string) {
  const today = dayKey(now)
  const start = schedule.lastRun && dayKey(schedule.lastRun) === today ? 1 : 0
  for (let offset = start; offset < 62; offset += 1) {
    const date = new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86_400_000)
    const hit = schedule.freq === 'weekly' ? date.getUTCDay() === schedule.day : date.getUTCDate() === schedule.day
    if (hit) return date.toISOString().slice(0, 10)
  }
  return today
}

export function sumBy<T>(rows: T[], value: (row: T) => number) {
  return rows.reduce((total, row) => total + value(row), 0)
}

/** Totals per key, largest first. */
export function rank<T>(rows: T[], key: (row: T) => string, value: (row: T) => number, limit = 6) {
  const totals = new Map<string, number>()
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + value(row))
  return [...totals].map(([label, total]) => ({ label, value: total })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value).slice(0, limit)
}
