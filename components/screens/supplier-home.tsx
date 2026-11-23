'use client'

import { ArrowRight, Bell, ClipboardList, HandCoins, Package, PackageCheck, Plus, Truck, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { MonthBars, monthlyTotals } from '@/components/charts'
import { AsyncButton, BarList, EmptyState, Meta, PageHeader, Panel, PanelLink, Stat, StatusPill } from '@/components/kit'
import { DispatchDialog } from '@/components/screens/shipments'
import { Button } from '@/components/ui/button'
import { useAct, useApp } from '@/lib/client'
import { dayKey, daysUntil, fmtDate, rs } from '@/lib/format'
import { amountDue, isPayable, ORDER_LABEL, ORDER_TONE, partnerName, payBadge, rank, sumBy } from '@/lib/logic'
import type { Order } from '@/lib/types'

export function SupplierHome() {
  const s = useApp()
  const act = useAct()
  const [dispatching, setDispatching] = useState<Order | null>(null)

  const pending = s.orders.filter((o) => o.status === 'pending')
  const needAction = s.orders.filter((o) => o.status === 'pending' || o.status === 'accepted' || o.status === 'packed').reverse()
  const unpaid = s.orders.filter((o) => isPayable(o) && o.payStatus === 'unpaid')
  const proofs = s.payments.filter((p) => p.status === 'submitted')
  const udharo = s.orders.filter((o) => o.payStatus === 'udharo' && o.udharo)
  const overdue = udharo.filter((o) => daysUntil(o.udharo!.due, s.now) < 0).length
  const today = dayKey(s.now)
  const sales = monthlyTotals(s.orders, s.now)
  const live = s.orders.filter((o) => o.status !== 'rejected' && o.status !== 'cancelled')

  return (
    <>
      <PageHeader
        title={`Namaste, ${s.user.name.split(' ')[0]}`}
        subtitle={`${s.org.name}, ${s.org.city}`}
        actions={
          <>
            <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/supplier/catalog?new=1" />}>
              <Plus data-icon="inline-start" aria-hidden />
              Add product
            </Button>
            <Button size="lg" nativeButton={false} render={<Link href="/supplier/orders" />}>
              <ClipboardList data-icon="inline-start" aria-hidden />
              Incoming orders
            </Button>
          </>
        }
      />

      {pending.length > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tone-blue-line bg-tone-blue-soft px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-tone-blue-ink">
            <Bell className="size-4 shrink-0" aria-hidden />
            {`${pending.length} new ${pending.length === 1 ? 'order is' : 'orders are'} waiting for you. Shops cannot pay until you accept.`}
          </p>
          <Button nativeButton={false} render={<Link href="/supplier/orders" />}>Review orders</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="New orders" value={pending.length} icon={ClipboardList} tone="blue" hint="Waiting for you to accept" />
        <Stat label="Pending payments" value={rs(sumBy(unpaid, amountDue))} icon={Wallet} tone="amber" hint={`${proofs.length} ${proofs.length === 1 ? 'proof' : 'proofs'} to verify`} />
        <Stat label="Udharo due" value={rs(sumBy(udharo, amountDue))} icon={HandCoins} tone="red" hint={overdue ? `${overdue} overdue` : 'Nothing overdue'} />
        <Stat label="Dispatched today" value={s.shipments.filter((x) => dayKey(x.dispatchedAt) === today).length} icon={Truck} tone="grey" hint="Vans, bilti and pickups" />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Orders needing action" subtitle="Oldest first" action={<PanelLink href="/supplier/orders">All orders<ArrowRight data-icon="inline-end" aria-hidden /></PanelLink>}>
            {needAction.length === 0 ? (
              <EmptyState icon={PackageCheck} title="You are all caught up" text="New orders, and orders waiting to be packed or dispatched, appear here." />
            ) : (
              <ul className="divide-y">
                {needAction.slice(0, 8).map((o) => {
                  const pay = payBadge(o)
                  return (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                      <div className="min-w-0 flex-1 basis-56">
                        <p className="text-sm font-semibold">
                          <Link href={`/supplier/orders/${o.id}`} className="text-primary hover:underline">{o.no}</Link>
                          {` · ${partnerName(s, o.retailerId)}`}
                        </p>
                        <p className="text-sm text-muted-foreground">{`${o.lines.length} ${o.lines.length === 1 ? 'item' : 'items'} · ${rs(o.total)} · ${fmtDate(o.createdAt)}`}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={ORDER_TONE[o.status]}>{ORDER_LABEL[o.status]}</StatusPill>
                        {o.status !== 'pending' && pay && <StatusPill tone={pay.tone}>{pay.label}</StatusPill>}
                        {o.status === 'pending' ? (
                          <Button nativeButton={false} render={<Link href={`/supplier/orders/${o.id}`} />}>Review</Button>
                        ) : o.status === 'accepted' ? (
                          <AsyncButton variant="outline" onClick={() => act('order.pack', { id: o.id }, { success: `${o.no} marked packed.` })}>
                            <Package data-icon="inline-start" aria-hidden />
                            Mark packed
                          </AsyncButton>
                        ) : (
                          <Button onClick={() => setDispatching(o)}>
                            <Truck data-icon="inline-start" aria-hidden />
                            Dispatch
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Payment proofs to verify" action={<PanelLink href="/supplier/payments">Payments<ArrowRight data-icon="inline-end" aria-hidden /></PanelLink>}>
            {proofs.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No transfer proofs are waiting for you.</p>
            ) : (
              <ul className="divide-y">
                {proofs.map((p) => {
                  const order = s.orders.find((o) => o.id === p.orderId)
                  return (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{`${rs(p.amount)} from ${order ? partnerName(s, order.retailerId) : 'a shop'}`}</p>
                        <p className="text-sm text-muted-foreground">{`${order?.no ?? 'Order'} · Txn ${p.ref}`}</p>
                      </div>
                      <Button nativeButton={false} render={<Link href="/supplier/payments" />}>Verify</Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Sales" subtitle="Order value in the last 6 months">
            <div className="px-2 pt-3">
              <MonthBars data={sales} label="Sales" />
            </div>
            <dl className="mx-4 grid grid-cols-2 gap-4 border-t py-4">
              <Meta label="This month">{rs(sales[sales.length - 1].value)}</Meta>
              <Meta label="Products listed">
                <Link href="/supplier/catalog" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <Package className="size-4" aria-hidden />
                  {s.products.filter((p) => !p.archived).length}
                </Link>
              </Meta>
            </dl>
          </Panel>
          <Panel title="Top products" subtitle="By order value">
            <BarList rows={rank(live.flatMap((o) => o.lines), (l) => l.name, (l) => l.amount, 5)} empty="Products appear here once shops order them." />
          </Panel>
          <Panel title="Top retailers" subtitle="By order value">
            <BarList rows={rank(live, (o) => partnerName(s, o.retailerId), (o) => o.total, 5)} empty="Shops appear here once they order from you." />
          </Panel>
        </div>
      </div>
      {dispatching && <DispatchDialog order={dispatching} onClose={() => setDispatching(null)} />}
    </>
  )
}
