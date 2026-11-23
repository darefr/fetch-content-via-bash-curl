'use client'

import { MessageSquareQuote, Phone, Plus, ShoppingCart, Store, Trash2, Warehouse } from 'lucide-react'
import Link from 'next/link'
import { AsyncButton, EmptyState, Meta, PageHeader, Panel, StatusPill, useConfirm } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { useAct, useApp } from '@/lib/client'
import { fmtDate, rs } from '@/lib/format'
import { amountDue, sumBy } from '@/lib/logic'
import { MODE_LABEL, type AppState, type Partner } from '@/lib/types'
import { cn } from '@/lib/utils'

function tradeStats(s: AppState, partnerId: string) {
  const orders = s.orders.filter((o) => (s.ws === 'retailer' ? o.supplierId : o.retailerId) === partnerId && o.status !== 'rejected' && o.status !== 'cancelled')
  return {
    count: orders.length,
    value: sumBy(orders, (o) => o.total),
    udharo: sumBy(orders.filter((o) => o.payStatus === 'udharo'), amountDue),
    last: orders[0]?.createdAt,
  }
}

function PayPills({ partner }: { partner: Partner }) {
  const ways = [partner.hasEsewa && 'eSewa', partner.hasKhalti && 'Khalti', (partner.bank || partner.hasQr) && 'QR / Bank', partner.creditDays > 0 && `Udharo ${partner.creditDays} days`].filter(Boolean) as string[]
  if (ways.length === 0) return <span className="text-sm text-muted-foreground">No payment setup yet</span>
  return <span className="flex flex-wrap gap-1.5">{ways.map((w) => <StatusPill key={w} tone={w.startsWith('Udharo') ? 'blue' : 'grey'}>{w}</StatusPill>)}</span>
}

export function SuppliersView() {
  const s = useApp()
  const act = useAct()
  const [confirm, confirmDialog] = useConfirm()
  const linked = s.partners.filter((p) => p.linked)

  // The same product name sold by two or more of the shop's suppliers, cheapest marked.
  const byName = new Map<string, { supplierId: string; price: number; unit: string }[]>()
  for (const p of s.products.filter((x) => x.available)) byName.set(p.name, [...(byName.get(p.name) ?? []), { supplierId: p.supplierId, price: p.price, unit: p.unit }])
  const compare = [...byName].filter(([, offers]) => offers.length > 1).sort((a, b) => a[0].localeCompare(b[0]))
  const sellers = linked.filter((p) => compare.some(([, offers]) => offers.some((o) => o.supplierId === p.id)))

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="The wholesalers you already buy from. You order from them and pay them directly."
        actions={
          <Button size="lg" nativeButton={false} render={<Link href="/retailer/orders/new" />}>
            <ShoppingCart data-icon="inline-start" aria-hidden />
            New order
          </Button>
        }
      />

      {linked.length === 0 ? (
        <Panel><EmptyState icon={Warehouse} title="No suppliers linked yet" text="Add the wholesalers you buy from below. Their catalogs and prices open up as soon as you do." /></Panel>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {linked.map((p) => {
            const stats = tradeStats(s, p.id)
            return (
              <li key={p.id}>
                <Panel title={p.name} subtitle={`${p.address}, ${p.city}`} action={p.phone && <Button variant="outline" nativeButton={false} render={<a href={`tel:${p.phone}`} />}><Phone data-icon="inline-start" aria-hidden />{p.phone}</Button>}>
                  <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
                    <Meta label="Orders">{stats.count}</Meta>
                    <Meta label="Total bought">{rs(stats.value)}</Meta>
                    <Meta label="Udharo open">{rs(stats.udharo)}</Meta>
                    <Meta label="Delivery" className="col-span-2 sm:col-span-3">{p.modes.map((m) => MODE_LABEL[m]).join(', ') || 'Not set'}</Meta>
                    <div className="col-span-2 flex flex-col gap-1 sm:col-span-3">
                      <dt className="text-xs text-muted-foreground">You can pay by</dt>
                      <dd><PayPills partner={p} /></dd>
                    </div>
                  </dl>
                  {p.deliveryNote && <p className="border-t px-4 py-3 text-sm text-muted-foreground">{p.deliveryNote}</p>}
                  <div className="flex flex-wrap gap-2 border-t px-4 py-3">
                    <Button nativeButton={false} render={<Link href="/retailer/orders/new" />}><ShoppingCart data-icon="inline-start" aria-hidden />Browse catalog</Button>
                    <Button variant="outline" nativeButton={false} render={<Link href="/retailer/orders/quotes?new=1" />}><MessageSquareQuote data-icon="inline-start" aria-hidden />Request quote</Button>
                    <Button variant="ghost" onClick={async () => {
                      if (await confirm({ title: `Remove ${p.name}?`, text: 'Their catalog leaves your cart and order screens. Past orders and receipts stay. You can add them again later.', action: 'Remove supplier', destructive: true })) {
                        await act('link.remove', { supplierId: p.id }, { success: `${p.name} removed from your suppliers.` })
                      }
                    }}>
                      <Trash2 data-icon="inline-start" aria-hidden />
                      Remove
                    </Button>
                  </div>
                </Panel>
              </li>
            )
          })}
        </ul>
      )}

      {compare.length > 0 && (
        <Panel title="Compare supplier prices" subtitle="Items that more than one of your suppliers sells. The lowest base price is marked.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold">
                  <th scope="col">Item</th>
                  {sellers.map((p) => <th key={p.id} scope="col" className="text-right">{p.name}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y">
                {compare.map(([name, offers]) => {
                  const best = Math.min(...offers.map((o) => o.price))
                  return (
                    <tr key={name} className="[&>td]:px-4 [&>td]:py-2.5">
                      <td className="font-medium">{name}</td>
                      {sellers.map((p) => {
                        const offer = offers.find((o) => o.supplierId === p.id)
                        return (
                          <td key={p.id} className={cn('text-right tabular-nums whitespace-nowrap', offer?.price === best ? 'font-semibold text-tone-green-ink' : 'text-muted-foreground')}>
                            {offer ? `${rs(offer.price)}${offer.price === best ? ' · lowest' : ''}` : 'Not sold'}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Panel title="Add a supplier" subtitle="Wholesalers on FeriStock you are not linked with yet">
        {s.directory.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">You are linked with every supplier on FeriStock. Ask your other wholesalers to create an account so you can order from them here.</p>
        ) : (
          <ul className="divide-y">
            {s.directory.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{`${p.city} · ${p.modes.map((m) => MODE_LABEL[m]).join(', ') || 'Delivery not set'} · ${p.creditDays > 0 ? `udharo up to ${p.creditDays} days` : 'no credit'}`}</p>
                </div>
                <AsyncButton variant="outline" onClick={() => act('link.add', { supplierId: p.id }, { success: `${p.name} added. Their catalog is now in your order screen.` })}>
                  <Plus data-icon="inline-start" aria-hidden />
                  Add supplier
                </AsyncButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {confirmDialog}
    </>
  )
}

export function RetailersView() {
  const s = useApp()
  return (
    <>
      <PageHeader title="Retailers" subtitle="Shops that added you as a supplier or have ordered from you." />
      {s.partners.length === 0 ? (
        <Panel><EmptyState icon={Store} title="No shops yet" text="A shop appears here when it adds you as a supplier. Share your business name so they can find you." /></Panel>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {s.partners.map((p) => {
            const stats = tradeStats(s, p.id)
            return (
              <li key={p.id}>
                <Panel
                  title={p.name}
                  subtitle={`${p.address}, ${p.city}`}
                  action={p.phone && <Button variant="outline" nativeButton={false} render={<a href={`tel:${p.phone}`} />}><Phone data-icon="inline-start" aria-hidden />{p.phone}</Button>}
                >
                  <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
                    <Meta label="Orders">{stats.count}</Meta>
                    <Meta label="Total sold">{rs(stats.value)}</Meta>
                    <Meta label="Udharo due">{rs(stats.udharo)}</Meta>
                    <Meta label="Last order">{stats.last ? fmtDate(stats.last) : 'None yet'}</Meta>
                    <Meta label="PAN / VAT" className="col-span-2">{p.pan || 'Not shared'}</Meta>
                    <div className="col-span-2 flex flex-col gap-1">
                      <dt className="text-xs text-muted-foreground">Status</dt>
                      <dd><StatusPill tone={p.linked ? 'green' : 'grey'}>{p.linked ? 'Linked to you' : 'Past orders only'}</StatusPill></dd>
                    </div>
                  </dl>
                </Panel>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
