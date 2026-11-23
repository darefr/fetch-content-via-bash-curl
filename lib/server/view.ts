import type { AppState, Org, Partner, TeamMember, User } from '@/lib/types'
import type { Ctx } from './auth'
import { db } from './db'
import { DEMO_ORG_IDS } from './seed'

const OPEN_PAYMENT = new Set(['submitted', 'verified', 'rejected'])

function member(u: User): TeamMember {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, active: u.active, createdAt: u.createdAt }
}

/** Contact details, PAN and bank details are shared only between businesses that trade. */
function partner(org: Org, trusted: boolean, linked: boolean, hasQr: boolean): Partner {
  const s = org.supplier
  return {
    id: org.id, name: org.name, role: org.role, city: org.city, linked,
    address: trusted ? org.address : '', pan: trusted ? org.pan : '', phone: trusted ? org.phone : '', email: trusted ? org.email : '',
    modes: s?.modes ?? [], creditDays: s?.creditDays ?? 0, deliveryNote: s?.deliveryNote ?? '',
    hasEsewa: Boolean(s?.esewaId), hasKhalti: Boolean(s?.khaltiId), hasQr, bank: trusted ? s?.bank ?? '' : '',
  }
}

/** Everything the signed-in workspace may see. All scoping to the caller's business happens here. */
export function buildState(ctx: Ctx): AppState {
  const store = db()
  const me = ctx.org.id
  const retail = ctx.ws === 'retailer'
  const staff = ctx.user.role === 'staff'

  const orders = store.orders
    .filter((o) => (retail ? o.retailerId : o.supplierId) === me)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const orderIds = new Set(orders.map((o) => o.id))
  const linkedIds = new Set(store.links.filter((l) => (retail ? l.retailerId : l.supplierId) === me).map((l) => (retail ? l.supplierId : l.retailerId)))
  const tradedIds = new Set(orders.map((o) => (retail ? o.supplierId : o.retailerId)))
  const partnerIds = new Set([...linkedIds, ...tradedIds])
  const hasQr = (id: string) => Boolean(store.files[`qr:${id}`])

  const partners = store.orgs.filter((o) => partnerIds.has(o.id)).map((o) => partner(o, true, linkedIds.has(o.id), hasQr(o.id)))
  const directory = retail
    ? store.orgs.filter((o) => o.role !== 'retailer' && o.id !== me && !linkedIds.has(o.id)).map((o) => partner(o, false, false, hasQr(o.id)))
    : []
  const products = store.products.filter((p) => (retail ? linkedIds.has(p.supplierId) && !p.archived : p.supplierId === me))
  const orderable = new Set(products.filter((p) => p.available).map((p) => p.id))

  const org = { ...ctx.org, hasQr: hasQr(me) }
  if (staff && org.supplier) org.supplier = { ...org.supplier, esewaId: '', khaltiId: '', bank: '' }

  return {
    ws: ctx.ws,
    // To the minute: a background refresh that finds nothing new then matches what is on
    // screen exactly, and the browser has nothing to redraw.
    now: new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString(),
    demo: true,
    canSwitch: ctx.org.role === 'both',
    canReset: DEMO_ORG_IDS.includes(me) && ctx.user.role === 'owner',
    user: member(ctx.user),
    org,
    partners,
    directory,
    products,
    items: retail ? store.items.filter((i) => i.retailerId === me) : [],
    movements: retail ? store.movements.filter((m) => m.retailerId === me).slice(0, 300) : [],
    cart: retail ? (store.carts[me] ?? []).filter((l) => orderable.has(l.productId)) : [],
    schedules: retail ? store.schedules.filter((s) => s.retailerId === me) : [],
    orders,
    shipments: store.shipments.filter((s) => orderIds.has(s.orderId)),
    // Wallet attempts that were started and abandoned are never shown to either side.
    payments: store.payments.filter((p) => orderIds.has(p.orderId) && OPEN_PAYMENT.has(p.status)),
    receipts: store.receipts.filter((r) => orderIds.has(r.orderId)).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    quotes: store.quotes.filter((q) => (retail ? q.retailerId : q.supplierId) === me),
    returns: store.returns.filter((r) => (retail ? r.retailerId : r.supplierId) === me),
    team: staff ? [member(ctx.user)] : store.users.filter((u) => u.orgId === me).map(member),
    notices: store.notices.filter((n) => n.orgId === me && n.ws === ctx.ws).slice(0, 30),
    audit: staff ? [] : store.audit.filter((a) => a.orgId === me && a.ws === ctx.ws).slice(0, 300),
  }
}
