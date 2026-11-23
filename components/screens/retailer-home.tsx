'use client'

import { ArrowRight, Boxes, ClipboardList, HandCoins, MessageSquareQuote, Plus, ShoppingCart, TriangleAlert, Truck, Warehouse } from 'lucide-react'
import { toast } from 'sonner'
import { MonthBars, monthlyTotals } from '@/components/charts'
import { AsyncButton, EmptyState, Meta, PageHeader, Panel, PanelLink, RecordRow, Stat, StatusPill, Stepper } from '@/components/kit'
import { Link, useNav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { useAct, useApp } from '@/lib/client'
import { ago, dueLabel, fmtDate, fmtDay, monthKey, rs } from '@/lib/format'
import { amountDue, expiryState, isOpen, isPayable, MOVE_LABEL, ORDER_LABEL, ORDER_TONE, partnerName, payBadge, productFor, stockStatus, suggestQty, sumBy } from '@/lib/logic'
import type { Order } from '@/lib/types'
import { cn } from '@/lib/utils'

const SEVERITY = { out: 0, low: 1, ok: 2 }

export function RetailerHome() {
  const s = useApp()
  const act = useAct()
  const router = useNav()

  const low = s.items
    .filter((i) => stockStatus(i).key !== 'ok')
    .sort((a, b) => SEVERITY[stockStatus(a).key] - SEVERITY[stockStatus(b).key] || a.name.localeCompare(b.name))
  const reorderable = low.filter((i) => productFor(s, i))
  const open = s.orders.filter(isOpen)
  const udharo = s.orders.filter((o) => o.payStatus === 'udharo' && o.udharo)
  const nextDue = udharo.map((o) => o.udharo!.due).sort()[0]
  const thisMonth = monthKey(s.now)
  const purchases = monthlyTotals(s.orders, s.now)
  const expiring = s.items
    .map((item) => ({ item, state: expiryState(item, s.now) }))
    .filter((x) => x.item.qty > 0 && x.state && x.state.days <= 30)
    .sort((a, b) => a.state!.days - b.state!.days)
    .slice(0, 5)

  const reorder = async (ids: string[], thenOpenCart = false) => {
    const lines = low.filter((i) => ids.includes(i.id)).flatMap((i) => {
      const p = productFor(s, i)
      return p ? [{ productId: p.id, qty: suggestQty(i, p) }] : []
    })
    const r = await act('cart.add', { lines })
    if (!r.ok) return
    if (thenOpenCart) router.push('/retailer/orders/new')
    else toast.success('Added to the reorder cart.', { action: { label: 'View cart', onClick: () => router.push('/retailer/orders/new') } })
  }

  const recent = s.orders.slice(0, 6)
  const orderAction = (o: Order) => {
    const receipt = s.receipts.find((r) => r.orderId === o.id)
    if (isPayable(o)) return <Button size="sm" nativeButton={false} render={<Link href={`/retailer/orders/${o.id}/pay`} />}>Pay now</Button>
    if (o.status === 'delivered' && receipt) return <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/retailer/receipts/${receipt.id}`} />}>Receipt</Button>
    return <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/retailer/orders/${o.id}`} />}>Track</Button>
  }

  return (
    <>
      <PageHeader
        title={`Namaste, ${s.user.name.split(' ')[0]}`}
        subtitle={`${s.org.name}, ${s.org.city}`}
        actions={
          <>
            <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/retailer/inventory?new=1" />}>
              <Plus data-icon="inline-start" aria-hidden />
              Add item
            </Button>
            <Button size="lg" nativeButton={false} render={<Link href="/retailer/orders/new" />}>
              <ShoppingCart data-icon="inline-start" aria-hidden />
              New order
            </Button>
          </>
        }
      />

      {low.length > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tone-red-line bg-tone-red-soft px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-tone-red-ink">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {`${low.length} ${low.length === 1 ? 'item' : 'items'} low in stock. Reorder now`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href="/retailer/inventory?filter=low" />}>View items</Button>
            {reorderable.length > 0 && (
              <AsyncButton onClick={() => reorder(reorderable.map((i) => i.id), true)}>
                <ShoppingCart data-icon="inline-start" aria-hidden />
                {`Reorder ${reorderable.length} ${reorderable.length === 1 ? 'item' : 'items'}`}
              </AsyncButton>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open orders" value={open.length} icon={ClipboardList} tone="blue" hint={`${open.filter((o) => o.status === 'dispatched').length} waiting for you to confirm delivery`} />
        <Stat label="Low stock" value={low.length} icon={Boxes} tone="amber" hint={`${low.filter((i) => i.qty <= 0).length} out of stock`} />
        <Stat label="Udharo payable" value={rs(sumBy(udharo, amountDue))} icon={HandCoins} tone="teal" hint={nextDue ? `Next: ${dueLabel(nextDue, s.now)}` : 'Nothing on credit'} />
        <Stat label="Shipments this month" value={s.shipments.filter((x) => monthKey(x.dispatchedAt) === thisMonth).length} icon={Truck} tone="grey" hint="Dispatched to your shop" />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Low stock" subtitle="Change a quantity when you sell or receive goods." action={<PanelLink href="/retailer/inventory">All inventory<ArrowRight data-icon="inline-end" aria-hidden /></PanelLink>}>
            {low.length === 0 ? (
              <EmptyState icon={Boxes} title="Everything is above its reorder level" text="Items show up here as soon as they fall to their reorder level." />
            ) : (
              <ul className="divide-y">
                {low.slice(0, 8).map((item) => {
                  const status = stockStatus(item)
                  const product = productFor(s, item)
                  const inCart = s.cart.find((l) => l.productId === product?.id)
                  return (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                      <div className="min-w-0 flex-1 basis-52">
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{`Reorder at ${item.threshold} ${item.unit}${item.supplierId ? ` · ${partnerName(s, item.supplierId)}` : ''}`}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        <Stepper value={item.qty} label={item.name} onChange={(qty) => act('item.set', { id: item.id, qty })} />
                        {inCart ? (
                          <Button variant="outline" nativeButton={false} render={<Link href="/retailer/orders/new" />}>
                            <ShoppingCart data-icon="inline-start" aria-hidden />
                            {`In cart (${inCart.qty})`}
                          </Button>
                        ) : product ? (
                          <AsyncButton onClick={() => reorder([item.id])}>
                            <ShoppingCart data-icon="inline-start" aria-hidden />
                            Reorder
                          </AsyncButton>
                        ) : (
                          <Button variant="outline" nativeButton={false} render={<Link href="/retailer/orders/quotes?new=1" />}>
                            <MessageSquareQuote data-icon="inline-start" aria-hidden />
                            Request quote
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Recent orders" bodyClassName="@container" action={<PanelLink href="/retailer/orders">All orders<ArrowRight data-icon="inline-end" aria-hidden /></PanelLink>}>
            {recent.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No orders yet" text="Your first order appears here with its status and payment." />
            ) : (
              <div className="overflow-x-auto @max-2xl:hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold">
                      <th scope="col">Order</th>
                      <th scope="col">Supplier</th>
                      <th scope="col" className="text-right">Total</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="@max-4xl:hidden">Payment</th>
                      <th scope="col" className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recent.map((o) => {
                      const pay = payBadge(o)
                      return (
                        <tr key={o.id} className="[&>td]:px-4 [&>td]:py-2.5">
                          <td className="whitespace-nowrap">
                            <Link href={`/retailer/orders/${o.id}`} className="font-semibold text-primary hover:underline">{o.no}</Link>
                            <p className="text-xs text-muted-foreground">{fmtDate(o.createdAt)}</p>
                          </td>
                          <td>{partnerName(s, o.supplierId)}</td>
                          <td className="text-right tabular-nums whitespace-nowrap">{rs(o.total)}</td>
                          <td><StatusPill tone={ORDER_TONE[o.status]}>{ORDER_LABEL[o.status]}</StatusPill></td>
                          <td className="@max-4xl:hidden">{pay ? <StatusPill tone={pay.tone}>{pay.label}</StatusPill> : <span className="text-muted-foreground">Not due</span>}</td>
                          <td className="text-right">{orderAction(o)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {recent.length > 0 && (
              <ul className="divide-y @2xl:hidden">
                {recent.map((o) => (
                  <RecordRow
                    key={o.id}
                    title={<Link href={`/retailer/orders/${o.id}`} className="text-primary hover:underline">{o.no}</Link>}
                    detail={`${partnerName(s, o.supplierId)} · ${fmtDate(o.createdAt)}`}
                    badge={<StatusPill tone={ORDER_TONE[o.status]}>{ORDER_LABEL[o.status]}</StatusPill>}
                    value={rs(o.total)}
                    note={payBadge(o)?.label}
                    action={orderAction(o)}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Purchases" subtitle="Order value in the last 6 months">
            <div className="px-2 pt-3">
              <MonthBars data={purchases} label="Purchases" />
            </div>
            <dl className="mx-4 grid grid-cols-2 gap-4 border-t py-4">
              <Meta label="This month">{rs(purchases[purchases.length - 1].value)}</Meta>
              <Meta label="Stock value at cost">{rs(sumBy(s.items, (i) => i.qty * i.cost))}</Meta>
              <Meta label="Items tracked">{s.items.length}</Meta>
              <Meta label="Linked suppliers">
                <Link href="/retailer/suppliers" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <Warehouse className="size-4" aria-hidden />
                  {s.partners.filter((p) => p.linked).length}
                </Link>
              </Meta>
            </dl>
          </Panel>

          <Panel title="Expiring soon" subtitle="Within 30 days, or already expired" action={<PanelLink href="/retailer/expiry">Tracker<ArrowRight data-icon="inline-end" aria-hidden /></PanelLink>}>
            {expiring.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Nothing expires in the next 30 days.</p>
            ) : (
              <ul className="divide-y">
                {expiring.map(({ item, state }) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{`${item.qty} ${item.unit} · ${fmtDay(item.expiry!)}`}</p>
                    </div>
                    <StatusPill tone={state!.tone}>{state!.days < 0 ? 'Expired' : state!.days === 0 ? 'Today' : `${state!.days} days`}</StatusPill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Stock activity" action={<PanelLink href="/retailer/stock-moves">History<ArrowRight data-icon="inline-end" aria-hidden /></PanelLink>}>
            {s.movements.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Sales, deliveries and counts are listed here as they happen.</p>
            ) : (
              <ul className="divide-y">
                {s.movements.slice(0, 5).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{`${MOVE_LABEL[m.type]} · ${ago(m.at, s.now)}`}</p>
                    </div>
                    <span className={cn('text-sm font-semibold tabular-nums', m.delta < 0 ? 'text-tone-red-ink' : 'text-tone-green-ink')}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}
