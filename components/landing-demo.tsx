'use client'

import { CircleCheck, ShoppingCart, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { StatusPill, Stepper } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { stockStatus } from '@/lib/logic'

const SAMPLE = [
  { id: 'noodles', name: 'Wai Wai noodles', detail: 'Carton of 30', threshold: 5, qty: 2 },
  { id: 'rice', name: 'Basmati rice 25 kg', detail: 'Bag', threshold: 3, qty: 0 },
  { id: 'sugar', name: 'Sugar 50 kg', detail: 'Sack', threshold: 4, qty: 9 },
]

/** A working miniature of the retailer stock list, so the pitch can be tried before signing up. */
export function LandingDemo() {
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(SAMPLE.map((i) => [i.id, i.qty])))
  const [cart, setCart] = useState<string[]>([])
  const low = SAMPLE.filter((i) => stockStatus({ qty: qty[i.id], threshold: i.threshold }).key !== 'ok').length

  return (
    <div className="w-full max-w-md rounded-xl border bg-card shadow-sm">
      <div className="p-4">
        <p className="font-semibold">Ram Kirana, Butwal</p>
        <p className="text-sm text-muted-foreground">Sample stock. Change a quantity to see the status update.</p>
        {low > 0 ? (
          <p role="status" className="mt-3 flex items-center gap-2 rounded-lg border border-tone-red-line bg-tone-red-soft px-3 py-2.5 text-sm font-medium text-tone-red-ink">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {`${low} ${low === 1 ? 'item' : 'items'} low in stock. Reorder now`}
          </p>
        ) : (
          <p role="status" className="mt-3 flex items-center gap-2 rounded-lg border border-tone-green-line bg-tone-green-soft px-3 py-2.5 text-sm font-medium text-tone-green-ink">
            <CircleCheck className="size-4 shrink-0" aria-hidden />
            Every item is above its reorder level.
          </p>
        )}
      </div>
      <ul>
        {SAMPLE.map((item) => {
          const status = stockStatus({ qty: qty[item.id], threshold: item.threshold })
          const inCart = cart.includes(item.id)
          return (
            <li key={item.id} className="flex flex-col gap-2 border-t px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{`${item.detail}, reorder at ${item.threshold}`}</p>
                </div>
                <StatusPill tone={status.tone}>{status.label}</StatusPill>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Stepper value={qty[item.id]} label={item.name} max={99} onChange={(next) => setQty((q) => ({ ...q, [item.id]: next }))} />
                <Button
                  variant={status.key === 'ok' || inCart ? 'outline' : 'default'}
                  aria-pressed={inCart}
                  onClick={() => setCart((c) => (inCart ? c.filter((id) => id !== item.id) : [...c, item.id]))}
                >
                  <ShoppingCart data-icon="inline-start" aria-hidden />
                  {inCart ? 'In cart' : 'Reorder'}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t bg-muted/50 px-4 py-3">
        <p className="text-sm text-muted-foreground" role="status">
          {cart.length === 0 ? 'Reorder cart is empty.' : `${cart.length} ${cart.length === 1 ? 'item' : 'items'} in the reorder cart.`}
        </p>
        <Button variant={cart.length ? 'default' : 'outline'} nativeButton={false} render={<Link href="/register?role=retailer" />}>
          Create account to order
        </Button>
      </div>
    </div>
  )
}
