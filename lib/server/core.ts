import { rs } from '@/lib/format'
import type { Item, MoveType, Order, PayMethod, Product, Receipt, Workspace } from '@/lib/types'
import type { Ctx } from './auth'
import { db, nextId } from './db'

export class ActionError extends Error {
  constructor(message: string, public status = 400, public field?: string) {
    super(message)
  }
}

export function fail(message: string, field?: string, status = 400): never {
  throw new ActionError(message, status, field)
}

export type Input = Record<string, unknown>

export function text(v: unknown, label: string, opts: { min?: number; max?: number; field?: string } = {}) {
  const { min = 1, max = 120 } = opts
  const s = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : ''
  if (s.length < min) fail(min <= 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`, opts.field)
  if (s.length > max) fail(`${label} must be ${max} characters or fewer.`, opts.field)
  return s
}

export function optional(v: unknown, label: string, max = 240) {
  return text(v ?? '', label, { min: 0, max })
}

/** Multi-line text such as bank details: keeps line breaks, trims the rest. */
export function block(v: unknown, label: string, max = 300) {
  const s = typeof v === 'string' ? v.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean).join('\n') : ''
  if (s.length > max) fail(`${label} must be ${max} characters or fewer.`)
  return s
}

export function whole(v: unknown, label: string, opts: { min?: number; max?: number; field?: string } = {}) {
  const { min = 0, max = 100_000 } = opts
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  if (!Number.isInteger(n)) fail(`${label} must be a whole number.`, opts.field)
  if (n < min) fail(`${label} must be at least ${min}.`, opts.field)
  if (n > max) fail(`${label} is too large.`, opts.field)
  return n
}

export function rupees(v: unknown, label: string, opts: { min?: number; field?: string } = {}) {
  return whole(v, label, { min: opts.min ?? 0, max: 50_000_000, field: opts.field })
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], label: string): T {
  if (typeof v !== 'string' || !allowed.includes(v as T)) fail(`Choose a valid ${label}.`)
  return v as T
}

export function day(v: unknown, label: string) {
  if (v === undefined || v === null || v === '') return undefined
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) fail(`${label} is not a valid date.`)
  return v as string
}

const IMAGE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
export function image(v: unknown, label: string) {
  if (v === undefined || v === null || v === '') return undefined
  if (typeof v !== 'string' || !IMAGE.test(v)) fail(`${label} must be a PNG, JPG or WebP image.`)
  if ((v as string).length > 1_400_000) fail(`${label} is too large. Use an image under 1 MB.`)
  return v as string
}

export function list(v: unknown, label: string, max = 200): Input[] {
  if (!Array.isArray(v)) fail(`${label} is missing.`)
  if ((v as unknown[]).length > max) fail(`${label} has too many rows (limit ${max}).`)
  return (v as unknown[]).map((row) => (row && typeof row === 'object' ? (row as Input) : {}))
}

export function needRetailer(ctx: Ctx) {
  if (ctx.ws !== 'retailer') fail('This action belongs to the retailer workspace.', undefined, 403)
}

export function needSupplier(ctx: Ctx) {
  if (ctx.ws !== 'supplier') fail('This action belongs to the supplier workspace.', undefined, 403)
}

/** Money and partner decisions: owners and managers only. */
export function needManager(ctx: Ctx) {
  if (ctx.user.role === 'staff') fail('Only the owner or a manager can do this.', undefined, 403)
}

export function needOwner(ctx: Ctx) {
  if (ctx.user.role !== 'owner') fail('Only the owner can do this.', undefined, 403)
}

export const now = () => new Date().toISOString()

export function notify(orgId: string, ws: Workspace, message: string, href: string) {
  const store = db()
  store.notices.unshift({ id: nextId('n'), orgId, ws, text: message, href, read: false, at: now() })
  const mine = store.notices.filter((n) => n.orgId === orgId)
  if (mine.length > 60) {
    const drop = new Set(mine.slice(60).map((n) => n.id))
    store.notices = store.notices.filter((n) => !drop.has(n.id))
  }
}

export function audit(ctx: Ctx, message: string) {
  const store = db()
  store.audit.unshift({ id: nextId('a'), orgId: ctx.org.id, ws: ctx.ws, by: ctx.user.name, text: message, at: now() })
  if (store.audit.length > 1500) store.audit.length = 1500
}

export function orgName(id: string) {
  return db().orgs.find((o) => o.id === id)?.name ?? 'Unknown business'
}

export function isLinked(retailerId: string, supplierId: string) {
  return db().links.some((l) => l.retailerId === retailerId && l.supplierId === supplierId)
}

export function tierPrice(p: Product, qty: number) {
  return p.tiers.reduce((price, t) => (qty >= t.min ? t.price : price), p.price)
}

/** The order must exist and belong to the caller's business on the side they are working in. */
export function orderFor(ctx: Ctx, id: unknown): Order {
  const order = db().orders.find((o) => o.id === id)
  const mine = order && (ctx.ws === 'retailer' ? order.retailerId === ctx.org.id : order.supplierId === ctx.org.id)
  if (!order || !mine) fail('Order not found.', undefined, 404)
  return order
}

/** What the retailer still owes on an order: the open udharo balance, or the full total. */
export function amountDue(o: Order) {
  if (o.payStatus === 'paid') return 0
  if (o.udharo && !o.udharo.settledAt) return o.udharo.amount
  return o.total
}

export function isPayable(o: Order) {
  const open = o.status === 'accepted' || o.status === 'packed' || o.status === 'dispatched' || o.status === 'delivered'
  return open && (o.payStatus === 'unpaid' || o.payStatus === 'udharo') && amountDue(o) > 0
}

export function setStatus(o: Order, status: Order['status'], by: string) {
  o.status = status
  o.history.push({ status, at: now(), by })
}

export function issueReceipt(o: Order, kind: Receipt['kind'], pay?: { method: PayMethod; ref: string }): Receipt {
  const store = db()
  // A delivery adds a receipt only when the order has none yet; a payment always gets its own.
  const existing = store.receipts.find((r) => r.orderId === o.id)
  if (kind === 'delivery' && existing) return existing
  const no = store.seq.receipt++
  const receipt: Receipt = {
    id: `r_${no}`, no: `RC-${no}`, orderId: o.id, kind, amount: kind === 'payment' ? amountDue(o) : o.total,
    paid: kind === 'payment', method: pay?.method ?? (o.payStatus === 'udharo' ? 'udharo' : undefined), ref: pay?.ref, issuedAt: now(),
  }
  store.receipts.unshift(receipt)
  return receipt
}

/** Marks an order paid. The receipt is issued first so it records the amount that was open. */
export function markPaid(o: Order, method: PayMethod, ref: string) {
  const receipt = issueReceipt(o, 'payment', { method, ref })
  o.payStatus = 'paid'
  o.payMethod = method
  if (o.udharo && !o.udharo.settledAt) o.udharo.settledAt = now()
  notify(o.supplierId, 'supplier', `${orgName(o.retailerId)} paid ${rs(receipt.amount)} for ${o.no}.`, `/supplier/orders/${o.id}`)
  notify(o.retailerId, 'retailer', `Payment for ${o.no} is confirmed. Receipt ${receipt.no} is ready.`, `/retailer/receipts/${receipt.id}`)
  return receipt
}

/** Applies a stock change, logs it with the running balance and warns when the item runs low. */
export function moveStock(item: Item, type: MoveType, delta: number, by: string, note?: string) {
  const store = db()
  const before = item.qty
  item.qty = Math.max(0, before + delta)
  item.updatedAt = now()
  const applied = item.qty - before
  if (applied !== 0 || type === 'counted') {
    store.movements.unshift({ id: nextId('m'), retailerId: item.retailerId, itemId: item.id, name: item.name, type, delta: applied, balance: item.qty, note, by, at: now() })
    const mine = store.movements.filter((m) => m.retailerId === item.retailerId)
    if (mine.length > 400) {
      const drop = new Set(mine.slice(400).map((m) => m.id))
      store.movements = store.movements.filter((m) => !drop.has(m.id))
    }
  }
  if (item.alert && before > item.threshold && item.qty <= item.threshold) {
    notify(item.retailerId, 'retailer', item.qty === 0 ? `${item.name} is out of stock.` : `${item.name} is low: ${item.qty} ${item.unit} left.`, '/retailer/inventory?filter=low')
  }
}
