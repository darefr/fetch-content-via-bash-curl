'use client'

import { Gift, MessageSquareQuote, Plus, Send, ShoppingCart, Trash2, TriangleAlert, Warehouse, X } from 'lucide-react'
import { useState } from 'react'
import { AsyncButton, EmptyState, PageHeader, Panel, PanelLink, SearchInput, StatusPill, Stepper, useConfirm } from '@/components/kit'
import { Link, useNav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useAct, useApp } from '@/lib/client'
import { rs } from '@/lib/format'
import { productFor, stockStatus, suggestQty, sumBy, tierPrice } from '@/lib/logic'
import { MODE_LABEL, type Product } from '@/lib/types'

function priceLine(p: Product) {
  return [`per ${p.unit}`, `min ${p.moq}`, ...p.tiers.map((t) => `${t.min}+ ${rs(t.price)}`)].join(' · ')
}

export function CartView() {
  const s = useApp()
  const act = useAct()
  const router = useNav()
  const [confirm, confirmDialog] = useConfirm()
  const [query, setQuery] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})

  const suppliers = s.partners.filter((p) => p.linked)
  const q = query.trim().toLowerCase()
  const catalog = s.products
    .filter((p) => (!supplierId || p.supplierId === supplierId) && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name))
  const lines = s.cart.flatMap((l) => {
    const product = s.products.find((p) => p.id === l.productId)
    return product ? [{ product, qty: l.qty, price: tierPrice(product, l.qty), amount: tierPrice(product, l.qty) * l.qty }] : []
  })
  const groups = suppliers.map((supplier) => ({ supplier, lines: lines.filter((l) => l.product.supplierId === supplier.id) })).filter((g) => g.lines.length > 0)
  const total = sumBy(lines, (l) => l.amount)
  const inCart = new Set(s.cart.map((l) => l.productId))
  const suggestions = s.items.filter((i) => stockStatus(i).key !== 'ok').flatMap((i) => {
    const p = productFor(s, i)
    return p && !inCart.has(p.id) ? [{ productId: p.id, qty: suggestQty(i, p) }] : []
  })

  const place = async (supplierIds: string[]) => {
    const r = await act<{ placed: { id: string; no: string }[] }>('order.place', { supplierIds, notes }, {
      success: (result) => (result.placed.length === 1 ? 'Order sent to the supplier.' : `${result.placed.length} orders sent to your suppliers.`),
    })
    if (!r.ok) return
    router.push(r.result.placed.length === 1 ? `/retailer/orders/${r.result.placed[0].id}` : '/retailer/orders')
  }

  return (
    <>
      <PageHeader
        title="New order"
        subtitle="Orders go straight to your own suppliers. Payment opens after the supplier accepts."
        actions={
          <>
            <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/retailer/orders/quotes?new=1" />}>
              <MessageSquareQuote data-icon="inline-start" aria-hidden />
              Request a quote
            </Button>
            {lines.length > 0 && (
              <Button
                variant="outline"
                size="lg"
                onClick={async () => {
                  if (await confirm({ title: 'Clear the reorder cart?', text: `${lines.length} ${lines.length === 1 ? 'item is' : 'items are'} removed. Nothing has been ordered yet.`, action: 'Clear cart', destructive: true })) await act('cart.clear')
                }}
              >
                <Trash2 data-icon="inline-start" aria-hidden />
                Clear cart
              </Button>
            )}
          </>
        }
      />

      {suggestions.length > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tone-amber-line bg-tone-amber-soft px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-tone-amber-ink">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {`${suggestions.length} low-stock ${suggestions.length === 1 ? 'item is' : 'items are'} not in the cart yet.`}
          </p>
          <AsyncButton variant="outline" onClick={() => act('cart.add', { lines: suggestions }, { success: 'Suggested quantities added to the cart.' })}>
            <Plus data-icon="inline-start" aria-hidden />
            Add suggested quantities
          </AsyncButton>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Supplier catalogs" subtitle="Live prices from the suppliers you have linked" action={<PanelLink href="/retailer/suppliers"><Warehouse data-icon="inline-start" aria-hidden />Suppliers</PanelLink>}>
          <div className="flex flex-wrap gap-2 border-b p-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Search products" />
            <NativeSelect value={supplierId} onChange={(e) => setSupplierId(e.target.value)} aria-label="Supplier">
              <NativeSelectOption value="">All suppliers</NativeSelectOption>
              {suppliers.map((p) => <NativeSelectOption key={p.id} value={p.id}>{p.name}</NativeSelectOption>)}
            </NativeSelect>
          </div>
          {suppliers.length === 0 ? (
            <EmptyState icon={Warehouse} title="Link a supplier first" text="Add the wholesalers you already buy from. Their catalogs and prices appear here." action={<Button nativeButton={false} render={<Link href="/retailer/suppliers" />}>Find suppliers</Button>} />
          ) : catalog.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="No products match" text="Try another search, or ask a supplier for a quote on something they do not list." />
          ) : (
            <ul className="divide-y">
              {catalog.map((p) => {
                const line = s.cart.find((l) => l.productId === p.id)
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-sm text-muted-foreground">{`${suppliers.find((x) => x.id === p.supplierId)?.name} · ${p.sku}`}</p>
                      <p className="text-sm"><span className="font-semibold">{rs(p.price)}</span><span className="text-muted-foreground">{` ${priceLine(p)}`}</span></p>
                      {p.scheme && <p className="flex items-center gap-1.5 text-xs font-medium text-tone-teal-ink"><Gift className="size-3.5" aria-hidden />{p.scheme}</p>}
                    </div>
                    {!p.available ? (
                      <StatusPill tone="grey">Not available</StatusPill>
                    ) : line ? (
                      <Stepper value={line.qty} min={0} label={p.name} onChange={(qty) => act('cart.set', { productId: p.id, qty })} />
                    ) : (
                      <AsyncButton variant="outline" onClick={() => act('cart.set', { productId: p.id, qty: p.moq })}>
                        <Plus data-icon="inline-start" aria-hidden />
                        Add
                      </AsyncButton>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-3 lg:sticky lg:top-20">
          <Panel title="Reorder cart" subtitle={lines.length ? `${lines.length} ${lines.length === 1 ? 'item' : 'items'} from ${groups.length} ${groups.length === 1 ? 'supplier' : 'suppliers'}` : 'One order per supplier'}>
            {groups.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="Your cart is empty" text="Add products from the catalogs, or use Reorder on a low-stock item." />
            ) : (
              <>
                <ul className="divide-y">
                  {groups.map(({ supplier, lines: mine }) => (
                    <li key={supplier.id} className="flex flex-col gap-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{supplier.name}</p>
                          <p className="text-xs text-muted-foreground">{`${supplier.city} · ${supplier.modes.map((m) => MODE_LABEL[m]).join(', ')}`}</p>
                        </div>
                        <StatusPill tone={supplier.creditDays > 0 ? 'blue' : 'grey'}>{supplier.creditDays > 0 ? `Udharo up to ${supplier.creditDays} days` : 'No credit'}</StatusPill>
                      </div>
                      <ul className="flex flex-col gap-3">
                        {mine.map(({ product: p, qty, price, amount }) => (
                          <li key={p.id} className="flex flex-col gap-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{p.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {`${rs(price)} per ${p.unit}`}
                                  {price < p.price && <span className="font-semibold text-tone-green-ink"> · bulk price</span>}
                                </p>
                              </div>
                              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${p.name}`} onClick={() => act('cart.set', { productId: p.id, qty: 0 })}>
                                <X aria-hidden />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <Stepper value={qty} min={p.moq} label={p.name} onChange={(next) => act('cart.set', { productId: p.id, qty: next })} />
                              <p className="text-sm font-semibold tabular-nums">{rs(amount)}</p>
                            </div>
                            {p.scheme && <p className="flex items-center gap-1.5 text-xs font-medium text-tone-teal-ink"><Gift className="size-3.5" aria-hidden />{p.scheme}</p>}
                          </li>
                        ))}
                      </ul>
                      <Input value={notes[supplier.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [supplier.id]: e.target.value }))} placeholder="Note for the supplier (optional)" aria-label={`Note for ${supplier.name}`} maxLength={200} />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm">{'Subtotal '}<span className="font-semibold tabular-nums">{rs(sumBy(mine, (l) => l.amount))}</span></p>
                        <AsyncButton onClick={() => place([supplier.id])}>
                          <Send data-icon="inline-start" aria-hidden />
                          Place order
                        </AsyncButton>
                      </div>
                    </li>
                  ))}
                </ul>
                {groups.length > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/50 px-4 py-3">
                    <p className="text-sm">{'Total '}<span className="font-semibold tabular-nums">{rs(total)}</span></p>
                    <AsyncButton onClick={() => place(groups.map((g) => g.supplier.id))}>
                      <Send data-icon="inline-start" aria-hidden />
                      {`Place all ${groups.length} orders`}
                    </AsyncButton>
                  </div>
                )}
              </>
            )}
          </Panel>
          <p className="px-1 text-xs leading-relaxed text-muted-foreground">You pay each supplier directly after they accept. FeriStock never holds your money.</p>
        </div>
      </div>
      {confirmDialog}
    </>
  )
}
