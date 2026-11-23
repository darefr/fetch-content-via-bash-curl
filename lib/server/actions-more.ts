import { rs } from '@/lib/format'
import { CATEGORIES, CITIES, UNITS, type Order, type Product, type Quote, type ReturnReq, type Schedule, type SupplierConfig, type Tier } from '@/lib/types'
import type { Handler } from './actions'
import { endSessionsFor, type Ctx } from './auth'
import {
  audit, block, fail, image, isLinked, list, moveStock, needManager, needOwner, needRetailer, needSupplier, notify, now, oneOf,
  optional, orderFor, orgName, rupees, text, whole, type Input,
} from './core'
import { db, nextId, resetDb } from './db'
import { hashPassword } from './hash'
import { DEMO_ORG_IDS } from './seed'

const PHONE = /^9[678]\d{8}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MERCHANT_ID = /^[A-Za-z0-9_-]{0,40}$/

function phoneNumber(v: unknown) {
  const phone = text(v, 'Mobile number', { field: 'phone' }).replace(/[\s-]/g, '')
  if (!PHONE.test(phone)) fail('Enter a 10-digit Nepali mobile number starting with 98, 97 or 96.', 'phone')
  return phone
}

function emailAddress(v: unknown) {
  const email = text(v, 'Email', { max: 120, field: 'email' }).toLowerCase()
  if (!EMAIL.test(email)) fail('Enter a valid email address.', 'email')
  return email
}

/** A login's email and mobile number, each unique across every business. */
export function contact(input: Input, ignoreUserId?: string) {
  const email = emailAddress(input.email)
  const phone = phoneNumber(input.phone)
  const others = db().users.filter((u) => u.id !== ignoreUserId)
  if (others.some((u) => u.email.toLowerCase() === email)) fail('An account with this email already exists.', 'email')
  if (others.some((u) => u.phone === phone)) fail('An account with this mobile number already exists.', 'phone')
  return { email, phone }
}

export function password(v: unknown, label = 'Password') {
  if (typeof v !== 'string' || v.length < 8) fail(`${label} must be at least 8 characters.`, 'password')
  if (v.length > 100) fail(`${label} is too long.`, 'password')
  return v
}

/** Reads the supplier payment and delivery setup. `qr` is undefined when the image is unchanged. */
export function supplierConfig(input: Input, hasQr = false) {
  const esewaId = optional(input.esewaId, 'eSewa merchant ID', 40)
  const khaltiId = optional(input.khaltiId, 'Khalti merchant ID', 40)
  if (!MERCHANT_ID.test(esewaId)) fail('eSewa merchant ID can use letters, numbers, dashes and underscores only.', 'esewaId')
  if (!MERCHANT_ID.test(khaltiId)) fail('Khalti merchant ID can use letters, numbers, dashes and underscores only.', 'khaltiId')
  const bank = block(input.bank, 'Bank details')
  const picked = Array.isArray(input.modes) ? input.modes : []
  const modes = (['van', 'bilti', 'pickup'] as const).filter((m) => picked.includes(m))
  if (modes.length === 0) fail('Choose at least one delivery mode.', 'modes')
  const creditDays = whole(input.creditDays ?? 0, 'Udharo days', { max: 90, field: 'creditDays' })
  const qr = image(input.qr, 'QR image')
  const removeQr = input.qr === null
  if (!esewaId && !khaltiId && !bank && !qr && !(hasQr && !removeQr)) fail('Add at least one way for shops to pay you: eSewa, Khalti, bank details or a QR.', 'esewaId')
  const config: SupplierConfig = { esewaId, khaltiId, bank, modes, creditDays, deliveryNote: optional(input.deliveryNote, 'Delivery note', 200) }
  return { config, qr, removeQr }
}

function linkedSupplier(ctx: Ctx, id: unknown) {
  const supplierId = String(id ?? '')
  if (!isLinked(ctx.org.id, supplierId)) fail('Choose one of your linked suppliers.', 'supplierId')
  return supplierId
}

function ownQuote(ctx: Ctx, id: unknown): Quote {
  const quote = db().quotes.find((q) => q.id === id && (ctx.ws === 'retailer' ? q.retailerId : q.supplierId) === ctx.org.id)
  if (!quote) fail('Quote not found.', undefined, 404)
  return quote
}

function ownSchedule(ctx: Ctx, id: unknown): Schedule {
  const schedule = db().schedules.find((s) => s.id === id && s.retailerId === ctx.org.id)
  if (!schedule) fail('Scheduled order not found.', undefined, 404)
  return schedule
}

function ownProduct(ctx: Ctx, id: unknown): Product {
  const product = db().products.find((p) => p.id === id && p.supplierId === ctx.org.id)
  if (!product) fail('Product not found.', undefined, 404)
  return product
}

function productFields(ctx: Ctx, row: Input, at = '', ignoreId?: string) {
  const name = text(row.name, `${at}Product name`, { min: 2, max: 80, field: 'name' })
  const sku = text(row.sku, `${at}SKU`, { min: 2, max: 30, field: 'sku' }).toUpperCase()
  const price = rupees(row.price, `${at}Price`, { min: 1, field: 'price' })
  const moq = whole(row.moq ?? 1, `${at}Minimum order`, { min: 1, max: 10_000, field: 'moq' })
  const tiers: Tier[] = (Array.isArray(row.tiers) ? list(row.tiers, 'Bulk prices', 4) : [])
    .map((t) => ({ min: whole(t.min, `${at}Bulk quantity`, { min: 2, max: 100_000 }), price: rupees(t.price, `${at}Bulk price`, { min: 1 }) }))
    .sort((a, b) => a.min - b.min)
  let last = { min: moq, price }
  for (const tier of tiers) {
    if (tier.min <= last.min) fail(`${at}Each bulk quantity must be higher than the one before it and above the minimum order.`, 'tiers')
    if (tier.price >= last.price) fail(`${at}Each bulk price must be lower than the price before it.`, 'tiers')
    last = tier
  }
  if (db().products.some((p) => p.supplierId === ctx.org.id && !p.archived && p.id !== ignoreId && p.sku.toUpperCase() === sku)) fail(`${at}Another product already uses the SKU ${sku}.`, 'sku')
  return {
    name, sku, price, moq, tiers,
    category: CATEGORIES.includes(row.category as never) ? (row.category as string) : 'Other',
    unit: UNITS.includes(row.unit as never) ? (row.unit as string) : 'piece',
    scheme: optional(row.scheme, `${at}Scheme`, 80),
    available: row.available !== false,
  }
}

export const moreActions: Record<string, Handler> = {
  'quote.request'(ctx, input) {
    needRetailer(ctx)
    needManager(ctx)
    const supplierId = linkedSupplier(ctx, input.supplierId)
    const lines = list(input.lines, 'Items', 10).map((row) => ({
      name: text(row.name, 'Item name', { min: 2, max: 80 }),
      unit: oneOf(row.unit, UNITS, 'unit'),
      qty: whole(row.qty, 'Quantity', { min: 1, max: 100_000 }),
      target: row.target === undefined || row.target === '' || row.target === null ? undefined : rupees(row.target, 'Target price', { min: 1 }),
    }))
    if (lines.length === 0) fail('Add at least one item to the request.')
    const store = db()
    const no = store.seq.quote++
    store.quotes.unshift({ id: `q_${no}`, no: `QT-${no}`, retailerId: ctx.org.id, supplierId, lines, note: optional(input.note, 'Note', 300), status: 'requested', createdAt: now() })
    notify(supplierId, 'supplier', `${ctx.org.name} asked for a quote (QT-${no}).`, '/supplier/quotes')
    audit(ctx, `Asked ${orgName(supplierId)} for a quote (QT-${no})`)
    return { id: `q_${no}` }
  },

  'quote.reply'(ctx, input) {
    needSupplier(ctx)
    needManager(ctx)
    const quote = ownQuote(ctx, input.id)
    if (quote.status !== 'requested') fail('This request has already been answered.')
    const offers = Array.isArray(input.offers) ? input.offers : []
    quote.lines.forEach((line, i) => {
      line.offer = rupees(offers[i], `Price for ${line.name}`, { min: 1 })
    })
    quote.reply = optional(input.reply, 'Message', 300)
    quote.status = 'offered'
    quote.repliedAt = now()
    notify(quote.retailerId, 'retailer', `${ctx.org.name} sent a price for ${quote.no}.`, '/retailer/orders/quotes')
    audit(ctx, `Sent a price to ${orgName(quote.retailerId)} for ${quote.no}`)
  },

  'quote.decline'(ctx, input) {
    needManager(ctx)
    const quote = ownQuote(ctx, input.id)
    const open = ctx.ws === 'supplier' ? quote.status === 'requested' : quote.status === 'offered' || quote.status === 'requested'
    if (!open) fail('This quote is already closed.')
    if (ctx.ws === 'supplier') quote.reply = text(input.reply, 'Reason', { min: 3, max: 300, field: 'reply' })
    quote.status = 'declined'
    quote.repliedAt = now()
    const other = ctx.ws === 'supplier' ? quote.retailerId : quote.supplierId
    notify(other, ctx.ws === 'supplier' ? 'retailer' : 'supplier', `${ctx.org.name} closed ${quote.no} without an order.`, ctx.ws === 'supplier' ? '/retailer/orders/quotes' : '/supplier/quotes')
    audit(ctx, `Closed quote ${quote.no}`)
  },

  'quote.accept'(ctx, input) {
    needRetailer(ctx)
    needManager(ctx)
    const quote = ownQuote(ctx, input.id)
    if (quote.status !== 'offered') fail('There is no open price on this quote to accept.')
    const store = db()
    const no = store.seq.order++
    const lines = quote.lines.map((l) => ({ name: l.name, sku: 'QUOTE', unit: l.unit, qty: l.qty, price: l.offer ?? 0, amount: (l.offer ?? 0) * l.qty }))
    // The supplier already agreed the price, so the order starts accepted and payment opens.
    const order: Order = {
      id: `o_${no}`, no: `FS-${no}`, retailerId: ctx.org.id, supplierId: quote.supplierId, lines, total: lines.reduce((sum, l) => sum + l.amount, 0),
      note: `From quote ${quote.no}`, status: 'accepted', payStatus: 'unpaid', createdAt: now(),
      history: [{ status: 'pending', at: now(), by: ctx.org.name }, { status: 'accepted', at: now(), by: orgName(quote.supplierId) }],
    }
    store.orders.unshift(order)
    quote.status = 'accepted'
    quote.orderId = order.id
    notify(quote.supplierId, 'supplier', `${ctx.org.name} accepted your price for ${quote.no}. Order ${order.no} is ready to pack.`, `/supplier/orders/${order.id}`)
    audit(ctx, `Accepted the price on ${quote.no}. Order ${order.no} created.`)
    return { orderId: order.id }
  },

  'schedule.save'(ctx, input) {
    needRetailer(ctx)
    needManager(ctx)
    const store = db()
    const existing = input.id ? ownSchedule(ctx, input.id) : null
    const supplierId = linkedSupplier(ctx, input.supplierId)
    const freq = oneOf(input.freq, ['weekly', 'monthly'] as const, 'frequency')
    const time = typeof input.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) ? input.time : fail('Choose a valid time.', 'time')
    const lines = list(input.lines, 'Items', 30).map((row) => {
      const p = store.products.find((x) => x.id === row.productId && x.supplierId === supplierId && !x.archived)
      if (!p) fail('One of the items is no longer in this supplier’s catalog.')
      return { productId: p.id, qty: whole(row.qty, `Quantity for ${p.name}`, { min: p.moq, max: 10_000 }) }
    })
    if (lines.length === 0) fail('Add at least one item to the scheduled order.')
    const fields = {
      supplierId, freq, time, lines,
      name: text(input.name, 'Name', { min: 2, max: 60, field: 'name' }),
      day: freq === 'weekly' ? whole(input.day, 'Day', { max: 6 }) : whole(input.day, 'Day of the month', { min: 1, max: 28 }),
      active: input.active !== false,
    }
    if (existing) Object.assign(existing, fields)
    else store.schedules.unshift({ id: nextId('sc'), retailerId: ctx.org.id, createdAt: now(), ...fields })
    audit(ctx, `${existing ? 'Edited' : 'Created'} scheduled order “${fields.name}”`)
  },

  'schedule.toggle'(ctx, input) {
    needRetailer(ctx)
    const schedule = ownSchedule(ctx, input.id)
    schedule.active = !schedule.active
    audit(ctx, `${schedule.active ? 'Resumed' : 'Paused'} scheduled order “${schedule.name}”`)
  },

  'schedule.remove'(ctx, input) {
    needRetailer(ctx)
    needManager(ctx)
    const schedule = ownSchedule(ctx, input.id)
    const store = db()
    store.schedules = store.schedules.filter((s) => s.id !== schedule.id)
    audit(ctx, `Deleted scheduled order “${schedule.name}”`)
  },

  'schedule.run'(ctx, input) {
    needRetailer(ctx)
    const schedule = ownSchedule(ctx, input.id)
    const store = db()
    const cart = (store.carts[ctx.org.id] ??= [])
    let added = 0
    for (const line of schedule.lines) {
      const p = store.products.find((x) => x.id === line.productId)
      if (!p || p.archived || !p.available || !isLinked(ctx.org.id, p.supplierId)) continue
      const inCart = cart.find((l) => l.productId === p.id)
      if (inCart) inCart.qty = Math.max(inCart.qty, line.qty)
      else cart.push({ productId: p.id, qty: line.qty })
      added += 1
    }
    if (added === 0) fail('None of these items can be ordered right now.')
    schedule.lastRun = now()
    audit(ctx, `Added scheduled order “${schedule.name}” to the cart`)
    return { added }
  },

  'product.save'(ctx, input) {
    needSupplier(ctx)
    const store = db()
    const existing = input.id ? ownProduct(ctx, input.id) : null
    const fields = productFields(ctx, input, '', existing?.id)
    if (existing) Object.assign(existing, fields, { archived: false })
    else {
      if (store.products.filter((p) => p.supplierId === ctx.org.id).length >= 1000) fail('This catalog has reached the 1,000 product limit.')
      store.products.push({ id: nextId('p'), supplierId: ctx.org.id, archived: false, ...fields })
    }
    audit(ctx, `${existing ? 'Edited' : 'Added'} product ${fields.name}`)
  },

  'product.toggle'(ctx, input) {
    needSupplier(ctx)
    const product = ownProduct(ctx, input.id)
    product.available = !product.available
    audit(ctx, `Marked ${product.name} ${product.available ? 'available' : 'unavailable'}`)
  },

  'product.archive'(ctx, input) {
    needSupplier(ctx)
    needManager(ctx)
    const product = ownProduct(ctx, input.id)
    product.archived = true
    product.available = false
    const store = db()
    for (const [orgId, cart] of Object.entries(store.carts)) store.carts[orgId] = cart.filter((l) => l.productId !== product.id)
    audit(ctx, `Archived product ${product.name}`)
  },

  'product.import'(ctx, input) {
    needSupplier(ctx)
    needManager(ctx)
    const store = db()
    const rows = list(input.rows, 'Import rows', 500)
    if (rows.length === 0) fail('The file has no rows to import.')
    const seen = new Set<string>()
    const parsed = rows.map((row, index) => {
      const sku = String(row.sku ?? '').trim().toUpperCase()
      if (seen.has(sku)) fail(`Row ${index + 2}: the SKU ${sku} appears twice in the file.`)
      seen.add(sku)
      const match = store.products.find((p) => p.supplierId === ctx.org.id && !p.archived && p.sku.toUpperCase() === sku)
      return { match, fields: productFields(ctx, row, `Row ${index + 2}: `, match?.id) }
    })
    let added = 0
    for (const { match, fields } of parsed) {
      if (match) Object.assign(match, fields)
      else {
        store.products.push({ id: nextId('p'), supplierId: ctx.org.id, archived: false, ...fields })
        added += 1
      }
    }
    audit(ctx, `Imported catalog from CSV: ${added} added, ${parsed.length - added} updated`)
    return { added, updated: parsed.length - added }
  },

  'return.request'(ctx, input) {
    needRetailer(ctx)
    needManager(ctx)
    const order = orderFor(ctx, input.orderId)
    if (order.status !== 'delivered') fail('Goods can be returned after the order is delivered.')
    const store = db()
    const earlier = store.returns.filter((r) => r.orderId === order.id && r.status !== 'rejected')
    const qtys = Array.isArray(input.qtys) ? input.qtys : []
    const lines = order.lines.flatMap((line, i) => {
      const already = earlier.reduce((sum, r) => sum + (r.lines.find((l) => l.sku === line.sku && l.name === line.name)?.qty ?? 0), 0)
      const qty = whole(qtys[i] ?? 0, `Return quantity for ${line.name}`, { max: line.qty })
      if (qty > line.qty - already) fail(`${line.name}: only ${line.qty - already} ${line.unit} left to return on this order.`)
      return qty > 0 ? [{ name: line.name, sku: line.sku, unit: line.unit, qty, price: line.price }] : []
    })
    if (lines.length === 0) fail('Choose how many of at least one item to send back.')
    const no = store.seq.ret++
    const request: ReturnReq = {
      id: `rt_${no}`, no: `RT-${no}`, orderId: order.id, retailerId: ctx.org.id, supplierId: order.supplierId, lines,
      amount: lines.reduce((sum, l) => sum + l.qty * l.price, 0), reason: text(input.reason, 'Reason', { min: 5, max: 300, field: 'reason' }),
      status: 'requested', createdAt: now(),
    }
    store.returns.unshift(request)
    notify(order.supplierId, 'supplier', `${ctx.org.name} asked to return goods from ${order.no}.`, '/supplier/returns')
    audit(ctx, `Asked ${orgName(order.supplierId)} to take back goods from ${order.no} (${request.no})`)
    return { id: request.id }
  },

  'return.resolve'(ctx, input) {
    needSupplier(ctx)
    needManager(ctx)
    const store = db()
    const request = store.returns.find((r) => r.id === input.id && r.supplierId === ctx.org.id)
    if (!request || request.status !== 'requested') fail('This return has already been handled.')
    const order = store.orders.find((o) => o.id === request.orderId)
    request.resolvedAt = now()
    if (input.ok !== true) {
      request.reply = text(input.reply, 'Reason', { min: 3, max: 300, field: 'reply' })
      request.status = 'rejected'
      notify(request.retailerId, 'retailer', `${ctx.org.name} did not accept return ${request.no}: ${request.reply}`, '/retailer/returns')
      audit(ctx, `Rejected return ${request.no} from ${orgName(request.retailerId)}`)
      return
    }
    request.reply = optional(input.reply, 'Message', 300)
    request.status = 'approved'
    for (const line of request.lines) {
      const item = store.items.find((i) => i.retailerId === request.retailerId && i.sku === line.sku)
      if (item) moveStock(item, 'returned', -Math.min(line.qty, item.qty), ctx.org.name, `${request.no} approved`)
    }
    // Open udharo shrinks by the returned value; a paid order gets a credit note instead.
    if (order?.udharo && !order.udharo.settledAt) order.udharo.amount = Math.max(0, order.udharo.amount - request.amount)
    notify(request.retailerId, 'retailer', `${ctx.org.name} approved return ${request.no} for ${rs(request.amount)}.`, '/retailer/returns')
    audit(ctx, `Approved return ${request.no} from ${orgName(request.retailerId)}`)
  },

  'link.add'(ctx, input) {
    needRetailer(ctx)
    needManager(ctx)
    const store = db()
    const supplier = store.orgs.find((o) => o.id === input.supplierId && o.role !== 'retailer' && o.id !== ctx.org.id)
    if (!supplier) fail('Supplier not found.', undefined, 404)
    if (isLinked(ctx.org.id, supplier.id)) fail(`${supplier.name} is already one of your suppliers.`)
    store.links.push({ retailerId: ctx.org.id, supplierId: supplier.id, createdAt: now() })
    notify(supplier.id, 'supplier', `${ctx.org.name} in ${ctx.org.city} added you as a supplier.`, '/supplier/retailers')
    audit(ctx, `Added ${supplier.name} as a supplier`)
  },

  'link.remove'(ctx, input) {
    needRetailer(ctx)
    needManager(ctx)
    const store = db()
    const supplierId = linkedSupplier(ctx, input.supplierId)
    const blocking = store.orders.some((o) => o.retailerId === ctx.org.id && o.supplierId === supplierId
      && (['pending', 'accepted', 'packed', 'dispatched'].includes(o.status) || (o.status === 'delivered' && o.payStatus !== 'paid')))
    if (blocking) fail('Finish or settle your open orders with this supplier before removing them.')
    store.links = store.links.filter((l) => !(l.retailerId === ctx.org.id && l.supplierId === supplierId))
    const theirs = new Set(store.products.filter((p) => p.supplierId === supplierId).map((p) => p.id))
    store.carts[ctx.org.id] = (store.carts[ctx.org.id] ?? []).filter((l) => !theirs.has(l.productId))
    audit(ctx, `Removed ${orgName(supplierId)} from suppliers`)
  },

  'team.add'(ctx, input) {
    needOwner(ctx)
    const store = db()
    if (store.users.filter((u) => u.orgId === ctx.org.id).length >= 15) fail('A business can have up to 15 logins.')
    const name = text(input.name, 'Full name', { min: 2, max: 80, field: 'name' })
    const role = oneOf(input.role, ['manager', 'staff'] as const, 'role')
    const { email, phone } = contact(input)
    store.users.push({ id: nextId('u'), orgId: ctx.org.id, name, email, phone, role, active: true, passHash: hashPassword(password(input.password)), createdAt: now() })
    audit(ctx, `Added ${name} to the team as ${role === 'manager' ? 'Manager' : 'Staff'}`)
  },

  'team.update'(ctx, input) {
    needOwner(ctx)
    const member = db().users.find((u) => u.id === input.id && u.orgId === ctx.org.id)
    if (!member) fail('Team member not found.', undefined, 404)
    if (member.role === 'owner') fail('The owner’s login cannot be changed here.')
    if (input.role !== undefined) member.role = oneOf(input.role, ['manager', 'staff'] as const, 'role')
    if (input.active !== undefined) member.active = input.active === true
    if (input.password !== undefined) member.passHash = hashPassword(password(input.password, 'New password'))
    if (!member.active || input.password !== undefined) endSessionsFor(member.id)
    audit(ctx, input.password !== undefined ? `Reset the password for ${member.name}` : `Updated ${member.name}: ${member.role === 'manager' ? 'Manager' : 'Staff'}, ${member.active ? 'active' : 'switched off'}`)
  },

  'org.profile'(ctx, input) {
    needOwner(ctx)
    Object.assign(ctx.org, {
      name: text(input.name, 'Business name', { min: 2, max: 80, field: 'name' }),
      city: oneOf(input.city, CITIES, 'city'),
      address: text(input.address, 'Address', { min: 3, max: 120, field: 'address' }),
      phone: phoneNumber(input.phone),
      email: emailAddress(input.email),
    })
    audit(ctx, 'Updated the business profile')
  },

  'org.payments'(ctx, input) {
    needOwner(ctx)
    if (ctx.org.role === 'retailer') fail('Payment setup is for supplier businesses.')
    const store = db()
    const key = `qr:${ctx.org.id}`
    const { config, qr, removeQr } = supplierConfig(input, Boolean(store.files[key]))
    ctx.org.supplier = config
    if (qr) store.files[key] = qr
    else if (removeQr) delete store.files[key]
    audit(ctx, 'Updated payment and delivery settings')
  },

  'notice.read'(ctx, input) {
    for (const n of db().notices) {
      if (n.orgId === ctx.org.id && n.ws === ctx.ws && (!input.id || n.id === input.id)) n.read = true
    }
  },

  'demo.reset'(ctx) {
    needOwner(ctx)
    if (!DEMO_ORG_IDS.includes(ctx.org.id)) fail('Only the demo accounts can reset the sample data.', undefined, 403)
    resetDb()
  },
}
