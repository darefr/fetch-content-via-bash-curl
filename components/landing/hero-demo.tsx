'use client'

import { ArrowRight, CircleCheck, Minus, PackageCheck, Plus, RotateCcw, ShoppingCart, Store, TriangleAlert, Warehouse } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { StatusPill } from '@/components/brand'
import { FLOW, ORDER_LABEL, ORDER_TONE, stockStatus } from '@/lib/logic'
import { cn } from '@/lib/utils'
import { ctaClass } from './parts'

const ITEMS = [
  { id: 'noodles', name: 'Wai Wai noodles', detail: 'Carton of 30', threshold: 5, start: 2 },
  { id: 'rice', name: 'Basmati rice 25 kg', detail: 'Bag', threshold: 3, start: 0 },
  { id: 'sugar', name: 'Sugar 50 kg', detail: 'Sack', threshold: 4, start: 8 },
]

const START: Record<string, number> = Object.fromEntries(ITEMS.map((i) => [i.id, i.start]))
const MAX_QTY = 99
const DISPATCHED = 3
const DELIVERED = 4
const STEP_MS = 1600

const SHOP_NOTE = [
  'Order sent. Waiting for Sita Traders to accept.',
  'Sita Traders accepted the items and price. Payment is open.',
  'Packed at the godown.',
  'On the way by transport, bilti BL-2041. Confirm when it arrives.',
  'Delivery confirmed. The received quantity is in your stock.',
]

const SUPPLIER_NOTE = [
  'New order from Ram Kirana. Accept, adjust or reject it.',
  'Accepted. Next, pack the goods.',
  'Packed and ready to dispatch.',
  'Dispatched with bilti BL-2041. Waiting for the shop to confirm.',
  'Delivered. The receipt is issued to both sides.',
]

interface DemoOrder {
  stage: number
  lines: { id: string; add: number }[]
}

/** A working miniature of the product loop: sell stock, reorder, follow the order, confirm delivery. */
export function HeroDemo() {
  const [qty, setQty] = useState(START)
  const [cart, setCart] = useState<string[]>([])
  const [order, setOrder] = useState<DemoOrder | null>(null)

  // The supplier's stages move on their own here. Delivery waits for the visitor, as it does in the product.
  useEffect(() => {
    if (!order || order.stage >= DISPATCHED) return
    const timer = setTimeout(() => setOrder((o) => (o ? { ...o, stage: o.stage + 1 } : o)), STEP_MS)
    return () => clearTimeout(timer)
  }, [order])

  const travelling = order !== null && order.stage < DELIVERED
  const status = order ? FLOW[order.stage] : null
  const low = ITEMS.filter((i) => stockStatus({ qty: qty[i.id], threshold: i.threshold }).key !== 'ok').length

  const step = (id: string, delta: number) => setQty((q) => ({ ...q, [id]: Math.min(MAX_QTY, Math.max(0, q[id] + delta)) }))

  const toggleCart = (id: string) => {
    if (order?.stage === DELIVERED) setOrder(null)
    setCart((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  }

  const placeOrder = () => {
    const lines = ITEMS.filter((i) => cart.includes(i.id)).map((i) => ({ id: i.id, add: Math.max(i.threshold * 2 - qty[i.id], 1) }))
    setOrder({ stage: 0, lines })
    setCart([])
  }

  const confirmDelivery = () => {
    if (!order) return
    setQty((q) => {
      const next = { ...q }
      for (const line of order.lines) next[line.id] = Math.min(MAX_QTY, next[line.id] + line.add)
      return next
    })
    setOrder({ ...order, stage: DELIVERED })
  }

  const reset = () => {
    setQty(START)
    setCart([])
    setOrder(null)
  }

  return (
    <div className="rise mx-auto flex w-full max-w-md flex-col gap-4 [--rise-delay:220ms] lg:mx-0 lg:max-w-none">
      <section aria-label="Live demo of a shop's stock list" className="rounded-[1.75rem] bg-card text-foreground shadow-lift">
        <div className="flex items-center gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Store className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">Ram Kirana, Butwal</p>
            <p className="truncate text-sm text-muted-foreground">Sample stock. Tap minus when you sell.</p>
          </div>
          <span className="shrink-0 rounded-full bg-sky px-2.5 py-1 text-xs font-semibold text-sky-foreground">Live demo</span>
        </div>

        <p
          role="status"
          className={cn(
            'mx-4 mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium sm:mx-5',
            low > 0 ? 'border-tone-red-line bg-tone-red-soft text-tone-red-ink' : 'border-tone-green-line bg-tone-green-soft text-tone-green-ink',
          )}
        >
          {low > 0 ? <TriangleAlert className="size-4 shrink-0" aria-hidden /> : <CircleCheck className="size-4 shrink-0" aria-hidden />}
          {low > 0 ? `${low} ${low === 1 ? 'item' : 'items'} low in stock. Reorder now` : 'Every item is above its reorder level.'}
        </p>

        <ul className="mt-4">
          {ITEMS.map((item) => {
            const state = stockStatus({ qty: qty[item.id], threshold: item.threshold })
            const inCart = cart.includes(item.id)
            const incoming = order && order.stage < DELIVERED ? order.lines.find((l) => l.id === item.id) : undefined
            return (
              <li key={item.id} className="flex flex-col gap-3 border-t px-4 py-3.5 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{`${item.detail}, reorder at ${item.threshold}`}</p>
                  </div>
                  <StatusPill tone={state.tone}>{state.label}</StatusPill>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div role="group" aria-label={`${item.name} quantity`} className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => step(item.id, -1)}
                      disabled={qty[item.id] <= 0}
                      className="grid size-11 place-items-center rounded-xl border bg-background outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40"
                    >
                      <Minus className="size-4" aria-hidden />
                      <span className="sr-only">{`Sell one ${item.name}`}</span>
                    </button>
                    <output aria-live="polite" className="w-11 text-center text-lg font-semibold tabular-nums">{qty[item.id]}</output>
                    <button
                      type="button"
                      onClick={() => step(item.id, 1)}
                      disabled={qty[item.id] >= MAX_QTY}
                      className="grid size-11 place-items-center rounded-xl border bg-background outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40"
                    >
                      <Plus className="size-4" aria-hidden />
                      <span className="sr-only">{`Add one ${item.name}`}</span>
                    </button>
                  </div>
                  {incoming ? (
                    <p className="inline-flex h-11 items-center gap-2 rounded-xl bg-sky px-3 text-sm font-semibold text-sky-foreground">
                      <PackageCheck className="size-4" aria-hidden />
                      {`+${incoming.add} on order`}
                    </p>
                  ) : (
                    <button
                      type="button"
                      aria-pressed={inCart}
                      disabled={travelling}
                      onClick={() => toggleCart(item.id)}
                      className={cn(
                        'inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
                        state.key === 'ok' || inCart ? 'border bg-background hover:bg-muted' : 'bg-primary text-primary-foreground hover:bg-primary/90',
                      )}
                    >
                      <ShoppingCart className="size-4" aria-hidden />
                      {inCart ? 'In cart' : 'Reorder'}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <div aria-live="polite" className="rounded-b-[1.75rem] border-t bg-muted/60 px-4 py-4 sm:px-5">
          {!order && cart.length === 0 && (
            <p className="text-sm leading-relaxed text-muted-foreground">Tap Reorder on an item, place the order, and watch it travel from the supplier to your shelf.</p>
          )}
          {!order && cart.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                <span className="font-semibold">{`${cart.length} ${cart.length === 1 ? 'item' : 'items'} in the reorder cart`}</span>
                <span className="block text-muted-foreground">Supplier: Sita Traders</span>
              </p>
              <button type="button" onClick={placeOrder} className={ctaClass('primary', 'h-11 px-5 text-sm')}>
                Place order
                <ArrowRight aria-hidden />
              </button>
            </div>
          )}
          {order && status && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  Order FS-1043
                  <span className="font-normal text-muted-foreground"> to Sita Traders</span>
                </p>
                <StatusPill tone={ORDER_TONE[status]}>{ORDER_LABEL[status]}</StatusPill>
              </div>
              <ol aria-label="Order progress" className="grid grid-cols-5 gap-1.5">
                {FLOW.map((stage, i) => (
                  <li key={stage} className="flex flex-col gap-1.5">
                    <span aria-hidden className={cn('h-1.5 rounded-full transition-colors duration-500', i <= order.stage ? 'bg-primary' : 'bg-border')} />
                    <span className={cn('text-xs font-medium max-[420px]:sr-only', i <= order.stage ? 'text-foreground' : 'text-muted-foreground')}>{ORDER_LABEL[stage]}</span>
                  </li>
                ))}
              </ol>
              <p className="text-sm leading-relaxed text-muted-foreground">{SHOP_NOTE[order.stage]}</p>
              {order.stage === DISPATCHED && (
                <button type="button" onClick={confirmDelivery} className={ctaClass('primary', 'h-11 w-full text-sm')}>
                  <PackageCheck aria-hidden />
                  Confirm delivery
                </button>
              )}
              {order.stage === DELIVERED && (
                <div className="flex flex-wrap gap-2">
                  <Link href="/register?role=retailer" className={ctaClass('primary', 'h-11 flex-1 px-5 text-sm')}>
                    Create account
                    <ArrowRight aria-hidden />
                  </Link>
                  <button type="button" onClick={reset} className={ctaClass('outline', 'h-11 px-5 text-sm')}>
                    <RotateCcw aria-hidden />
                    Run again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <aside aria-label="The supplier's side of the same order" aria-live="polite" className="rounded-3xl border border-brand-navy-foreground/15 bg-sidebar-accent p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-navy">
            <Warehouse className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">Sita Traders</p>
            <p className="truncate text-sm text-brand-navy-foreground/70">Supplier workspace, same order</p>
          </div>
          {status && <StatusPill tone={ORDER_TONE[status]}>{ORDER_LABEL[status]}</StatusPill>}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-brand-navy-foreground/85">
          {order ? SUPPLIER_NOTE[order.stage] : 'No new orders yet. An order from the shop shows up here the moment it is placed.'}
        </p>
      </aside>
    </div>
  )
}
