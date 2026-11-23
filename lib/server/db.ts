import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Db } from '@/lib/types'
import { buildSeed, DB_VERSION } from './seed'

// The demo data layer: one in-memory store per server process, mirrored to a JSON file so it
// survives restarts of the same machine. Everything else in the app reaches data only through
// this module and the actions built on it, which is the seam for a hosted database.
const FILE = path.join(os.tmpdir(), `feristock-db-v${DB_VERSION}.json`)
const holder = globalThis as unknown as { __feristockDb?: Db }

function persist(data: Db) {
  try {
    fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(data))
    fs.renameSync(`${FILE}.tmp`, FILE)
  } catch (error) {
    console.error('[feristock] Could not write the demo store to disk:', error)
  }
}

export function db(): Db {
  const current = holder.__feristockDb
  if (current && current.v === DB_VERSION) return current
  let data: Db | null = null
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Db
    if (parsed?.v === DB_VERSION) data = parsed
  } catch {
    // No saved store yet, or it is unreadable: start from the sample data.
  }
  if (!data) {
    data = buildSeed()
    persist(data)
  }
  holder.__feristockDb = data
  return data
}

export function save() {
  persist(db())
}

export function nextId(prefix: string) {
  const store = db()
  store.seq.id += 1
  return `${prefix}_${store.seq.id.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Puts the sample businesses back to their starting state. Businesses that real visitors
 * registered are kept, with everything they own, so one person's reset cannot erase another's work.
 */
export function resetDb() {
  const old = db()
  const fresh = buildSeed()
  const kept = new Set(old.orgs.filter((o) => !o.seed).map((o) => o.id))
  const keptOrders = old.orders.filter((o) => kept.has(o.retailerId) || kept.has(o.supplierId))
  const orderIds = new Set(keptOrders.map((o) => o.id))
  fresh.orgs.push(...old.orgs.filter((o) => kept.has(o.id)))
  fresh.users.push(...old.users.filter((u) => kept.has(u.orgId)))
  // Sample logins keep their ids across a reset, so nobody is signed out by it.
  const userIds = new Set(fresh.users.map((u) => u.id))
  fresh.sessions = old.sessions.filter((s) => userIds.has(s.userId))
  fresh.links.push(...old.links.filter((l) => kept.has(l.retailerId) || kept.has(l.supplierId)))
  fresh.products.push(...old.products.filter((p) => kept.has(p.supplierId)))
  fresh.items.push(...old.items.filter((i) => kept.has(i.retailerId)))
  fresh.movements.push(...old.movements.filter((m) => kept.has(m.retailerId)))
  fresh.orders.push(...keptOrders)
  fresh.shipments.push(...old.shipments.filter((s) => orderIds.has(s.orderId)))
  fresh.payments.push(...old.payments.filter((p) => orderIds.has(p.orderId)))
  fresh.receipts.push(...old.receipts.filter((r) => orderIds.has(r.orderId)))
  fresh.returns.push(...old.returns.filter((r) => orderIds.has(r.orderId)))
  fresh.quotes.push(...old.quotes.filter((q) => kept.has(q.retailerId) || kept.has(q.supplierId)))
  fresh.schedules.push(...old.schedules.filter((s) => kept.has(s.retailerId)))
  fresh.notices.push(...old.notices.filter((n) => kept.has(n.orgId)))
  fresh.audit.push(...old.audit.filter((a) => kept.has(a.orgId)))
  for (const id of kept) if (old.carts[id]) fresh.carts[id] = old.carts[id]
  for (const [key, value] of Object.entries(old.files)) {
    const [kind, id] = key.split(':')
    const owner =
      kind === 'qr' ? kept.has(id)
      : kind === 'proof' ? fresh.payments.some((p) => p.id === id)
      : fresh.shipments.some((s) => s.id === id)
    if (owner) fresh.files[key] = value
  }
  // Kept records carry numbers above the sample range, so counters only ever move forward.
  for (const key of Object.keys(fresh.seq) as (keyof Db['seq'])[]) fresh.seq[key] = Math.max(fresh.seq[key], old.seq[key])

  holder.__feristockDb = fresh
  persist(fresh)
}
