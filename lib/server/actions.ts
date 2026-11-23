import { randomBytes } from 'node:crypto'
import { addDays, rs } from '@/lib/format'
import { CATEGORIES, CITIES, MODE_LABEL, UNITS, type DeliveryMode, type Item, type MoveType, type Order, type Org, type Role } from '@/lib/types'
import { contact, moreActions, password, supplierConfig } from './actions-more'
import { endSession, homeFor, setSessionWorkspace, startSession, workspaceFor, type Ctx } from './auth'
import {
  amountDue, audit, day, fail, image, isLinked, isPayable, issueReceipt, list, markPaid, moveStock, needManager, needRetailer,
  needSupplier, notify, now, oneOf, optional, orderFor, orgName, rupees, setStatus, text, tierPrice, whole, type Input,
} from './core'
import { db, nextId } from './db'
import { hashPassword, verifyPassword } from './hash'
import { DEMO_USERS } from './seed'

export type Handler = (ctx: Ctx, input: Input) => unknown | Promise<unknown>

const holder = globalThis as unknown as { __fsAttempts?: Map<string, number[]> }
const attempts: Map<string, number[]> = (holder.__fsAttempts ??= new Map<string, number[]>())

/** Allows `limit` tries per key in a rolling window; throws once the limit is passed. */
function throttle(key: string, limit = 8, windowMs = 5 * 60_000) {
  const cutoff = Date.now() - windowMs
  const recent = (attempts.get(key) ?? []).filter((t) => t > cutoff)
  if (recent.length >= limit) fail('Too many attempts. Wait a few minutes and try again.', undefined, 429)
  recent.push(Date.now())
  attempts.set(key, recent)
}

function ownItem(ctx: Ctx, id: unknown): Item {
  const item = db().items.find((i) => i.id === id && i.retailerId === ctx.org.id)
  if (!item) fail('Item not found.', undefined, 404)
  return item
}

function orderableProduct(ctx: Ctx, productId: unknown) {
  const p = db().products.find((x) => x.id === productId)
  if (!p || p.archived || !isLinked(ctx.org.id, p.supplierId)) fail('This product is not in your suppliers’ catalogs.', undefined, 404)
  return p
}

function payableOrder(ctx: Ctx, id: unknown): Order {
  needRetailer(ctx)
  needManager(ctx)
  const order = orderFor(ctx, id)
  if (order.status === 'pending') fail('You can pay after the supplier accepts the order.')
  if (order.payStatus === 'proof') fail('Your payment proof is with the supplier. Wait for them to confirm it.')
  if (!isPayable(order)) fail('This order has nothing left to pay.')
  return order
}

function restorePayState(o: Order) {
  o.payStatus = o.udharo && !o.udharo.settledAt ? 'udharo' : 'unpaid'
}

export const publicActions: Record<string, (input: Input) => Promise<unknown>> = {
  async 'auth.login'(input) {
    const id = text(input.id, 'Email or mobile number', { field: 'id' }).toLowerCase().replace(/\s/g, '')
    const pass = typeof input.password === 'string' ? input.password : ''
    throttle(`login:${id}`)
    const user = db().users.find((u) => u.email.toLowerCase() === id || u.phone === id)
    if (!user || !verifyPassword(pass, user.passHash)) fail('That email or mobile number and password do not match.')
    if (!user.active) fail('This login has been switched off. Ask the owner of your business to turn it back on.')
    const org = db().orgs.find((o) => o.id === user.orgId) as Org
    const ws = workspaceFor(org)
    await startSession(user.id, ws)
    return { home: homeFor(ws) }
  },

  async 'auth.demo'(input) {
    const role = oneOf(input.role, ['retailer', 'supplier', 'both'] as const, 'demo account')
    throttle('demo', 60, 60_000)
    const user = db().users.find((u) => u.id === DEMO_USERS[role])
    if (!user) fail('The demo account is not available right now.')
    const ws = role === 'supplier' ? 'supplier' : 'retailer'
    await startSession(user.id, ws)
    return { home: homeFor(ws) }
  },

  async 'auth.register'(input) {
    throttle('register', 20, 10 * 60_000)
    const store = db()
    if (store.orgs.length >= 300) fail('New sign-ups are paused on this demo. Try one of the demo accounts.')
    const role = oneOf(input.role, ['retailer', 'supplier', 'both'] as const, 'role') as Role
    const ownerName = text(input.ownerName, 'Your full name', { min: 2, max: 80, field: 'ownerName' })
    const name = text(input.name, 'Business name', { min: 2, max: 80, field: 'name' })
    const pan = text(input.pan, 'PAN / VAT number', { field: 'pan' })
    if (!/^\d{9}$/.test(pan)) fail('PAN / VAT number must be exactly 9 digits.', 'pan')
    if (store.orgs.some((o) => o.pan === pan)) fail('A business with this PAN / VAT number is already registered.', 'pan')
    const city = oneOf(input.city, CITIES, 'city')
    const address = text(input.address, 'Address', { min: 3, max: 120, field: 'address' })
    const { email, phone } = contact(input)
    const pass = password(input.password)
    const supplier = role === 'retailer' ? undefined : supplierConfig(input)

    const org: Org = { id: nextId('o'), name, role, pan, city, address, phone, email, createdAt: now(), supplier: supplier?.config }
    store.orgs.push(org)
    if (supplier?.qr) store.files[`qr:${org.id}`] = supplier.qr
    const user = { id: nextId('u'), orgId: org.id, name: ownerName, email, phone, role: 'owner' as const, active: true, passHash: hashPassword(pass), createdAt: now() }
    store.users.push(user)
    const ws = workspaceFor(org)
    notify(org.id, ws, ws === 'retailer' ? 'Welcome to FeriStock. Add your stock, then link your suppliers.' : 'Welcome to FeriStock. Add your products so shops can order from you.', ws === 'retailer' ? '/retailer/inventory' : '/supplier/catalog')
    await startSession(user.id, ws)
    return { home: homeFor(ws) }
  },
}

export const actions: Record<string, Handler> = {
  async 'auth.logout'() {
    await endSession()
    return { home: '/login' }
  },

  'auth.password'(ctx, input) {
    throttle(`pw:${ctx.user.id}`)
    if (typeof input.current !== 'string' || !verifyPassword(input.current, ctx.user.passHash)) fail('Your current password is not correct.', 'current')
    ctx.user.passHash = hashPassword(password(input.next, 'New password'))
    audit(ctx, 'Changed their password')
  },

  async 'ws.switch'(ctx, input) {
    if (ctx.org.role !== 'both') fail('This business has only one workspace.')
    const ws = oneOf(input.ws, ['retailer', 'supplier'] as const, 'workspace')
    await setSessionWorkspace(ws)
    return { home: homeFor(ws) }
  },

  'item.save'(ctx, input) {
    needRetailer(ctx)
    const store = db()
    const existing = input.id ? ownItem(ctx, input.id) : null
    const name = text(input.name, 'Item name', { min: 2, max: 80, field: 'name' })
    const skuInput = optional(input.sku, 'SKU', 30).toUpperCase()
    const sku = skuInput || existing?.sku || `IT-${String(store.seq.id + 1).padStart(4, '0')}`
    if (store.items.some((i) => i.retailerId === ctx.org.id && i.id !== existing?.id && i.sku.toUpperCase() === sku)) fail('Another item already uses this SKU.', 'sku')
    const category = oneOf(input.category, CATEGORIES, 'category')
    const unit = oneOf(input.unit, UNITS, 'unit')
    const threshold = whole(input.threshold, 'Reorder level', { max: 10_000, field: 'threshold' })
    const cost = rupees(input.cost, 'Cost per unit', { field: 'cost' })
    const expiry = day(input.expiry, 'Expiry date')
    let supplierId: string | undefined
    let productId: string | undefined
    if (input.productId) {
      const p = orderableProduct(ctx, input.productId)
      productId = p.id
      supplierId = p.supplierId
    } else if (input.supplierId) {
      if (!isLinked(ctx.org.id, String(input.supplierId))) fail('Link this supplier before choosing them for an item.', 'supplierId')
      supplierId = String(input.supplierId)
    }
    const fields = { name, sku, category, unit, threshold, cost, expiry, supplierId, productId, alert: input.alert !== false }

    if (existing) {
      Object.assign(existing, fields, { updatedAt: now() })
      audit(ctx, `Edited item ${name}`)
      return { id: existing.id }
    }
    if (store.items.filter((i) => i.retailerId === ctx.org.id).length >= 1000) fail('This shop has reached the 1,000 item limit.')
    const opening = whole(input.qty ?? 0, 'Quantity in stock', { field: 'qty' })
    const item: Item = { id: nextId('i'), retailerId: ctx.org.id, qty: 0, updatedAt: now(), ...fields }
    store.items.push(item)
    if (opening > 0) moveStock(item, 'added', opening, ctx.user.name, 'Opening stock')
    audit(ctx, `Added item ${name}`)
    return { id: item.id }
  },

  'item.remove'(ctx, input) {
    needRetailer(ctx)
    needManager(ctx)
    const item = ownItem(ctx, input.id)
    const store = db()
    store.items = store.items.filter((i) => i.id !== item.id)
    audit(ctx, `Removed item ${item.name}`)
  },

  'item.set'(ctx, input) {
    needRetailer(ctx)
    const item = ownItem(ctx, input.id)
    const qty = whole(input.qty, 'Quantity')
    const delta = qty - item.qty
    if (delta === 0) return
    const type: MoveType = delta === -1 ? 'sold' : delta === 1 ? 'added' : 'counted'
    moveStock(item, type, delta, ctx.user.name)
    audit(ctx, type === 'counted' ? `Set ${item.name} to ${qty} ${item.unit}` : `Recorded 1 ${item.unit} ${type}: ${item.name}`)
  },

  'item.adjust'(ctx, input) {
    needRetailer(ctx)
    const item = ownItem(ctx, input.id)
    const type = oneOf(input.type, ['sold', 'added', 'damaged', 'expired', 'removed', 'counted'] as const, 'change type')
    const qty = whole(input.qty, 'Quantity', { min: type === 'counted' ? 0 : 1 })
    const note = optional(input.note, 'Note', 160)
    if (type !== 'counted' && type !== 'added' && qty > item.qty) fail(`Only ${item.qty} ${item.unit} in stock.`, 'qty')
    const delta = type === 'counted' ? qty - item.qty : type === 'added' ? qty : -qty
    moveStock(item, type, delta, ctx.user.name, note || undefined)
    audit(ctx, type === 'counted' ? `Counted ${item.name}: ${qty} ${item.unit}` : `Recorded ${qty} ${item.unit} ${type}: ${item.name}`)
  },

  'item.alert'(ctx, input) {
    needRetailer(ctx)
    ownItem(ctx, input.id).alert = input.on === true
  },

  'item.import'(ctx, input) {
    needRetailer(ctx)
    needManager(ctx)
    const store = db()
    // Validate every row before touching anything, so one bad row cannot leave a half-import.
    const rows = list(input.rows, 'Import rows', 500).map((row, index) => {
      const at = `Row ${index + 2}`
      const name = text(row.name, `${at}: name`, { min: 2, max: 80 })
      return {
        name,
        sku: optional(row.sku, `${at}: SKU`, 30).toUpperCase(),
        category: CATEGORIES.includes(row.category as never) ? (row.category as string) : 'Other',
        unit: UNITS.includes(row.unit as never) ? (row.unit as string) : 'piece',
        qty: whole(row.qty ?? 0, `${at}: quantity`),
        threshold: whole(row.threshold ?? 0, `${at}: reorder level`, { max: 10_000 }),
        cost: rupees(row.cost ?? 0, `${at}: cost`),
      }
    })
    if (rows.length === 0) fail('The file has no rows to import.')
    let added = 0
    let updated = 0
    for (const row of rows) {
      const match = row.sku ? store.items.find((i) => i.retailerId === ctx.org.id && i.sku.toUpperCase() === row.sku) : undefined
      if (match) {
        Object.assign(match, { name: row.name, category: row.category, unit: row.unit, threshold: row.threshold, cost: row.cost })
        if (row.qty !== match.qty) moveStock(match, 'counted', row.qty - match.qty, ctx.user.name, 'CSV import')
        updated += 1
      } else {
        const item: Item = { id: nextId('i'), retailerId: ctx.org.id, name: row.name, sku: row.sku || `IT-${String(store.seq.id).padStart(4, '0')}`, category: row.category, unit: row.unit, qty: 0, threshold: row.threshold, cost: row.cost, alert: true, updatedAt: now() }
        store.items.push(item)
        if (row.qty > 0) moveStock(item, 'added', row.qty, ctx.user.name, 'CSV import')
        added += 1
      }
    }
    audit(ctx, `Imported stock from CSV: ${added} added, ${updated} updated`)
    return { added, updated }
  },

  'cart.set'(ctx, input) {
    needRetailer(ctx)
    const p = orderableProduct(ctx, input.productId)
    const qty = whole(input.qty, 'Quantity', { max: 10_000 })
    const store = db()
    const cart = (store.carts[ctx.org.id] ??= [])
    const line = cart.find((l) => l.productId === p.id)
    if (qty === 0) store.carts[ctx.org.id] = cart.filter((l) => l.productId !== p.id)
    else if (!p.available) fail(`${p.name} is not available from ${orgName(p.supplierId)} right now.`)
    else if (line) line.qty = qty
    else cart.push({ productId: p.id, qty })
  },

  'cart.add'(ctx, input) {
    needRetailer(ctx)
    const store = db()
    const cart = (store.carts[ctx.org.id] ??= [])
    let added = 0
    for (const row of list(input.lines, 'Cart lines', 100)) {
      const p = store.products.find((x) => x.id === row.productId)
      if (!p || p.archived || !p.available || !isLinked(ctx.org.id, p.supplierId)) continue
      const qty = whole(row.qty, 'Quantity', { min: 1, max: 10_000 })
      const line = cart.find((l) => l.productId === p.id)
      if (line) line.qty = Math.max(line.qty, qty)
      else cart.push({ productId: p.id, qty: Math.max(qty, p.moq) })
      added += 1
    }
    if (added === 0) fail('None of these items can be ordered from your linked suppliers right now.')
    return { added }
  },

  'cart.clear'(ctx) {
    needRetailer(ctx)
    db().carts[ctx.org.id] = []
  },

  'order.place'(ctx, input) {
    needRetailer(ctx)
    needManager(ctx)
    const store = db()
    const cart = store.carts[ctx.org.id] ?? []
    const only = Array.isArray(input.supplierIds) ? new Set(input.supplierIds.map(String)) : null
    const notes = (input.notes && typeof input.notes === 'object' ? input.notes : {}) as Record<string, unknown>
    const bySupplier = new Map<string, Order['lines']>()
    for (const line of cart) {
      const p = store.products.find((x) => x.id === line.productId)
      if (!p || (only && !only.has(p.supplierId))) continue
      if (p.archived || !p.available) fail(`${p.name} is no longer available. Remove it from the cart.`)
      if (!isLinked(ctx.org.id, p.supplierId)) fail(`${orgName(p.supplierId)} is no longer one of your suppliers.`)
      if (line.qty < p.moq) fail(`${p.name}: the minimum order is ${p.moq} ${p.unit}.`)
      const price = tierPrice(p, line.qty)
      const lines = bySupplier.get(p.supplierId) ?? []
      lines.push({ productId: p.id, name: p.name, sku: p.sku, unit: p.unit, qty: line.qty, price, amount: price * line.qty })
      bySupplier.set(p.supplierId, lines)
    }
    if (bySupplier.size === 0) fail('Your reorder cart is empty.')
    const placed: { id: string; no: string }[] = []
    for (const [supplierId, lines] of bySupplier) {
      const no = store.seq.order++
      const order: Order = {
        id: `o_${no}`, no: `FS-${no}`, retailerId: ctx.org.id, supplierId, lines, total: lines.reduce((sum, l) => sum + l.amount, 0),
        note: optional(notes[supplierId], 'Note', 200), status: 'pending', history: [{ status: 'pending', at: now(), by: ctx.org.name }],
        payStatus: 'unpaid', createdAt: now(),
      }
      store.orders.unshift(order)
      placed.push({ id: order.id, no: order.no })
      notify(supplierId, 'supplier', `New order ${order.no} from ${ctx.org.name}.`, `/supplier/orders/${order.id}`)
      audit(ctx, `Placed order ${order.no} with ${orgName(supplierId)}`)
    }
    const ordered = new Set([...bySupplier.values()].flat().map((l) => l.productId))
    store.carts[ctx.org.id] = cart.filter((l) => !ordered.has(l.productId))
    return { placed }
  },

  'order.cancel'(ctx, input) {
    needRetailer(ctx)
    needManager(ctx)
    const order = orderFor(ctx, input.id)
    if (order.status !== 'pending') fail('Only an order the supplier has not accepted yet can be cancelled.')
    setStatus(order, 'cancelled', ctx.org.name)
    notify(order.supplierId, 'supplier', `${ctx.org.name} cancelled ${order.no}.`, `/supplier/orders/${order.id}`)
    audit(ctx, `Cancelled order ${order.no}`)
  },

  'order.again'(ctx, input) {
    needRetailer(ctx)
    const order = orderFor(ctx, input.id)
    const lines = order.lines.filter((l) => l.productId).map((l) => ({ productId: l.productId, qty: l.qty }))
    if (lines.length === 0) fail('This order came from a quote, so it cannot be reordered from the catalog.')
    return actions['cart.add'](ctx, { lines })
  },

  'order.accept'(ctx, input) {
    needSupplier(ctx)
    const order = orderFor(ctx, input.id)
    if (order.status !== 'pending') fail('This order has already been handled.')
    let changed = false
    if (Array.isArray(input.qtys)) {
      const store = db()
      const lines = order.lines.flatMap((line, i) => {
        const qty = whole((input.qtys as unknown[])[i] ?? line.qty, `Quantity for ${line.name}`, { max: line.qty })
        if (qty !== line.qty) changed = true
        if (qty === 0) return []
        const p = store.products.find((x) => x.id === line.productId)
        const price = p ? tierPrice(p, qty) : line.price
        return [{ ...line, qty, price, amount: price * qty }]
      })
      if (lines.length === 0) fail('Every item is set to zero. Reject the order instead.')
      order.lines = lines
      order.total = lines.reduce((sum, l) => sum + l.amount, 0)
    }
    setStatus(order, 'accepted', ctx.org.name)
    notify(order.retailerId, 'retailer', changed ? `${ctx.org.name} accepted ${order.no} with changed quantities. New total ${rs(order.total)}.` : `${ctx.org.name} accepted ${order.no}. You can pay now.`, `/retailer/orders/${order.id}`)
    audit(ctx, `Accepted order ${order.no} from ${orgName(order.retailerId)}${changed ? ' with changed quantities' : ''}`)
  },

  'order.reject'(ctx, input) {
    needSupplier(ctx)
    const order = orderFor(ctx, input.id)
    if (order.status !== 'pending') fail('This order has already been handled.')
    order.rejectReason = text(input.reason, 'Reason', { min: 3, max: 200, field: 'reason' })
    setStatus(order, 'rejected', ctx.org.name)
    notify(order.retailerId, 'retailer', `${ctx.org.name} could not take ${order.no}: ${order.rejectReason}`, `/retailer/orders/${order.id}`)
    audit(ctx, `Rejected order ${order.no} from ${orgName(order.retailerId)}`)
  },

  'order.pack'(ctx, input) {
    needSupplier(ctx)
    const order = orderFor(ctx, input.id)
    if (order.status !== 'accepted') fail('Only an accepted order can be marked packed.')
    setStatus(order, 'packed', ctx.org.name)
    notify(order.retailerId, 'retailer', `${order.no} is packed at ${ctx.org.name}.`, `/retailer/orders/${order.id}`)
    audit(ctx, `Packed order ${order.no}`)
  },

  'order.dispatch'(ctx, input) {
    needSupplier(ctx)
    const order = orderFor(ctx, input.id)
    if (order.status !== 'packed') fail('Mark the order packed before dispatching it.')
    const modes = ctx.org.supplier?.modes ?? []
    const mode = oneOf(input.mode, modes, 'delivery mode') as DeliveryMode
    const carrier = mode === 'pickup' ? optional(input.carrier, 'Collected by', 80) : text(input.carrier, mode === 'van' ? 'Driver’s name' : 'Transport company', { min: 2, max: 80, field: 'carrier' })
    const ref = mode === 'bilti' ? text(input.ref, 'Bilti number', { min: 2, max: 40, field: 'ref' }) : optional(input.ref, 'Vehicle number', 40)
    const photo = image(input.photo, 'Photo')
    const store = db()
    const id = nextId('s')
    if (photo) store.files[`bilti:${id}`] = photo
    store.shipments.unshift({ id, orderId: order.id, mode, carrier, ref, note: optional(input.note, 'Note', 200), photoUrl: photo ? `/api/files/bilti/${id}` : undefined, dispatchedAt: now() })
    setStatus(order, 'dispatched', ctx.org.name)
    const how = mode === 'van' ? `by own van with ${carrier}` : mode === 'bilti' ? `by ${carrier}, bilti ${ref}` : 'and ready for pickup'
    notify(order.retailerId, 'retailer', `${order.no} is dispatched ${how}.`, `/retailer/orders/${order.id}`)
    audit(ctx, `Dispatched ${order.no} (${MODE_LABEL[mode]})`)
  },

  'order.deliver'(ctx, input) {
    needRetailer(ctx)
    const order = orderFor(ctx, input.id)
    if (order.status !== 'dispatched') fail('Delivery can be confirmed once the supplier has dispatched the order.')
    const store = db()
    order.lines.forEach((line, index) => {
      // Quote lines have no catalog product, so each one gets its own SKU instead of colliding.
      const sku = line.productId ? line.sku : `${order.no}-${index + 1}`
      let item = store.items.find((i) => i.retailerId === ctx.org.id && (line.productId ? i.productId === line.productId || i.sku === sku : i.sku === sku))
      if (!item) {
        const p = store.products.find((x) => x.id === line.productId)
        item = { id: nextId('i'), retailerId: ctx.org.id, name: line.name, sku, category: p?.category ?? 'Other', unit: line.unit, qty: 0, threshold: Math.max(1, Math.round(line.qty / 2)), cost: line.price, supplierId: order.supplierId, productId: line.productId, alert: true, updatedAt: now() }
        store.items.push(item)
      }
      item.cost = line.price
      moveStock(item, 'received', line.qty, ctx.user.name, `${order.no} delivered`)
    })
    const shipment = store.shipments.find((s) => s.orderId === order.id)
    if (shipment) shipment.deliveredAt = now()
    setStatus(order, 'delivered', ctx.org.name)
    const receipt = issueReceipt(order, 'delivery')
    notify(order.supplierId, 'supplier', `${ctx.org.name} confirmed delivery of ${order.no}.`, `/supplier/orders/${order.id}`)
    audit(ctx, `Confirmed delivery of ${order.no}. Stock updated.`)
    return { receiptId: receipt.id }
  },

  'pay.start'(ctx, input) {
    const order = payableOrder(ctx, input.orderId)
    const method = oneOf(input.method, ['esewa', 'khalti'] as const, 'wallet')
    const supplier = db().orgs.find((o) => o.id === order.supplierId)
    const merchant = method === 'esewa' ? supplier?.supplier?.esewaId : supplier?.supplier?.khaltiId
    if (!merchant) fail(`${orgName(order.supplierId)} has not set up ${method === 'esewa' ? 'eSewa' : 'Khalti'} yet.`)
    const store = db()
    for (const p of store.payments) if (p.orderId === order.id && p.status === 'initiated') p.status = 'cancelled'
    const ref = `${method === 'esewa' ? 'ESW' : 'KHL'}-${randomBytes(5).toString('hex').toUpperCase()}`
    const payment = { id: nextId('pay'), orderId: order.id, method, amount: amountDue(order), ref, status: 'initiated' as const, createdAt: now() }
    store.payments.unshift(payment)
    return { paymentId: payment.id, ref, amount: payment.amount, merchant: orgName(order.supplierId) }
  },

  /** Stands in for the wallet's own page: the demo gateway records what the payer did there. */
  'pay.gateway'(ctx, input) {
    needRetailer(ctx)
    const payment = db().payments.find((p) => p.id === input.paymentId)
    if (!payment || payment.status !== 'initiated') fail('This payment session has ended. Start again.')
    orderFor(ctx, payment.orderId)
    payment.status = input.outcome === 'complete' ? 'complete' : 'cancelled'
  },

  /** The only place a wallet payment becomes Paid: status and exact amount are checked here. */
  'pay.verify'(ctx, input) {
    needRetailer(ctx)
    const payment = db().payments.find((p) => p.id === input.paymentId)
    if (!payment) fail('Payment not found.', undefined, 404)
    const order = orderFor(ctx, payment.orderId)
    if (payment.status === 'verified') return { state: 'paid', receiptId: db().receipts.find((r) => r.orderId === order.id && r.ref === payment.ref)?.id }
    if (payment.status === 'cancelled') return { state: 'cancelled' }
    if (payment.status !== 'complete') return { state: 'pending' }
    if (!isPayable(order) || payment.amount !== amountDue(order)) {
      payment.status = 'rejected'
      payment.reason = 'Amount did not match the order.'
      return { state: 'mismatch' }
    }
    payment.status = 'verified'
    payment.verifiedAt = now()
    const receipt = markPaid(order, payment.method as 'esewa' | 'khalti', payment.ref)
    audit(ctx, `Paid ${order.no} by ${payment.method === 'esewa' ? 'eSewa' : 'Khalti'}`)
    return { state: 'paid', receiptId: receipt.id }
  },

  'pay.proof'(ctx, input) {
    const order = payableOrder(ctx, input.orderId)
    const ref = text(input.ref, 'Transaction ID', { min: 3, max: 60, field: 'ref' })
    const proof = image(input.image, 'Payment proof')
    if (!proof) fail('Attach a screenshot or photo of the transfer.', 'image')
    const store = db()
    const id = nextId('pay')
    store.files[`proof:${id}`] = proof
    store.payments.unshift({ id, orderId: order.id, method: 'qr', amount: amountDue(order), ref, status: 'submitted', note: optional(input.note, 'Note', 200) || undefined, proofUrl: `/api/files/proof/${id}`, createdAt: now() })
    order.payStatus = 'proof'
    notify(order.supplierId, 'supplier', `Payment proof for ${order.no} is waiting for you to check.`, '/supplier/payments')
    audit(ctx, `Sent payment proof for ${order.no}`)
  },

  'pay.udharo'(ctx, input) {
    const order = payableOrder(ctx, input.orderId)
    if (order.payStatus === 'udharo') fail('This order is already on udharo.')
    const days = db().orgs.find((o) => o.id === order.supplierId)?.supplier?.creditDays ?? 0
    if (days <= 0) fail(`${orgName(order.supplierId)} does not give udharo. Pay before dispatch.`)
    order.udharo = { amount: order.total, due: addDays(Date.now(), days) }
    order.payStatus = 'udharo'
    notify(order.supplierId, 'supplier', `${ctx.org.name} took ${order.no} on udharo for ${days} days.`, '/supplier/udharo')
    audit(ctx, `Took ${order.no} on udharo for ${days} days`)
  },

  'pay.review'(ctx, input) {
    needSupplier(ctx)
    needManager(ctx)
    const payment = db().payments.find((p) => p.id === input.paymentId)
    if (!payment || payment.status !== 'submitted') fail('This payment proof has already been checked.')
    const order = orderFor(ctx, payment.orderId)
    if (input.ok === true) {
      payment.status = 'verified'
      payment.verifiedAt = now()
      markPaid(order, 'qr', payment.ref)
      audit(ctx, `Confirmed payment of ${rs(payment.amount)} for ${order.no}`)
      return
    }
    payment.reason = text(input.reason, 'Reason', { min: 3, max: 200, field: 'reason' })
    payment.status = 'rejected'
    restorePayState(order)
    notify(order.retailerId, 'retailer', `${ctx.org.name} could not confirm your payment for ${order.no}: ${payment.reason}`, `/retailer/orders/${order.id}/pay`)
    audit(ctx, `Rejected payment proof for ${order.no}`)
  },

  'udharo.settle'(ctx, input) {
    needSupplier(ctx)
    needManager(ctx)
    const order = orderFor(ctx, input.orderId)
    if (order.payStatus !== 'udharo' || !order.udharo) fail('This order has no open udharo.')
    const ref = `CASH-${order.no.slice(3)}`
    db().payments.unshift({ id: nextId('pay'), orderId: order.id, method: 'cash', amount: amountDue(order), ref, status: 'verified', note: optional(input.note, 'Note', 200) || undefined, createdAt: now(), verifiedAt: now() })
    markPaid(order, 'cash', ref)
    audit(ctx, `Marked udharo for ${order.no} as settled`)
  },

  ...moreActions,
}
