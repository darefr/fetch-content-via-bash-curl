'use client'

import { Ban, Check, ClipboardList, Download, FileDown, HandCoins, ImageIcon, PackageCheck, Phone, RotateCcw, ShoppingCart, SlidersHorizontal, Truck, Undo2, Wallet, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { AsyncButton, Chips, downloadCsv, EmptyState, Field, Meta, Modal, PageHeader, Panel, SearchInput, StatusPill, Stepper, useConfirm } from '@/components/kit'
import { MissingView } from '@/components/screens/missing'
import { ReturnDialog } from '@/components/screens/returns'
import { DispatchDialog } from '@/components/screens/shipments'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAct, useApp } from '@/lib/client'
import { dueLabel, fmtDate, fmtDateTime, fmtDay, rs } from '@/lib/format'
import { amountDue, FLOW, isPayable, ORDER_LABEL, ORDER_TONE, partnerName, payBadge, paymentBadge } from '@/lib/logic'
import { METHOD_LABEL, MODE_LABEL, type Order, type OrderStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

type Tab = 'all' | 'closed' | OrderStatus
const WAITING: Record<string, string> = {
  accepted: 'Waiting for the supplier', packed: 'Not packed yet', dispatched: 'Not dispatched yet', delivered: 'The shop confirms on arrival',
}

function AdjustItemsDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const act = useAct()
  const [qtys, setQtys] = useState(() => order.lines.map((l) => l.qty))
  const changed = qtys.some((q, i) => q !== order.lines[i].qty)
  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={`Adjust items on ${order.no}`}
      description="Lower a quantity if you are short. Set it to 0 to leave an item out. The shop sees the new total before paying."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton onClick={async () => {
            const r = await act('order.accept', { id: order.id, qtys }, { success: changed ? `${order.no} accepted with changed quantities.` : `${order.no} accepted.` })
            if (r.ok) onClose()
          }}>
            <Check data-icon="inline-start" aria-hidden />
            {changed ? 'Accept with changes' : 'Accept as ordered'}
          </AsyncButton>
        </>
      }
    >
      <ul className="divide-y rounded-lg border">
        {order.lines.map((line, i) => (
          <li key={`${line.sku}-${line.name}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">{line.name}</p>
              <p className="text-xs text-muted-foreground">{`Ordered ${line.qty} ${line.unit}`}</p>
            </div>
            <Stepper value={qtys[i]} max={line.qty} label={line.name} onChange={(next) => setQtys((q) => q.map((v, j) => (j === i ? next : v)))} />
          </li>
        ))}
      </ul>
    </Modal>
  )
}

function RejectDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const act = useAct()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={`Reject ${order.no}?`}
      description="The shop is told right away, with your reason, so they can order elsewhere."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Keep order</Button>
          <AsyncButton variant="destructive" onClick={async () => {
            const r = await act('order.reject', { id: order.id, reason }, { success: `${order.no} rejected.`, quiet: true })
            if (r.ok) onClose()
            else setError(r.error)
          }}>Reject order</AsyncButton>
        </>
      }
    >
      <Field label="Reason" htmlFor="reject-reason" error={error || undefined}>
        <Textarea id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={200} placeholder="For example: out of stock until next week." />
      </Field>
    </Modal>
  )
}

export function OrdersView() {
  const s = useApp()
  const act = useAct()
  const retail = s.ws === 'retailer'
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [dispatching, setDispatching] = useState<Order | null>(null)
  const other = (o: Order) => partnerName(s, retail ? o.supplierId : o.retailerId)
  const closed = (o: Order) => o.status === 'rejected' || o.status === 'cancelled'
  const count = (status: OrderStatus) => s.orders.filter((o) => o.status === status).length
  const q = query.trim().toLowerCase()
  const rows = s.orders.filter((o) => (tab === 'all' || (tab === 'closed' ? closed(o) : o.status === tab)) && (!q || o.no.toLowerCase().includes(q) || other(o).toLowerCase().includes(q)))

  return (
    <>
      <PageHeader
        title={retail ? 'My orders' : 'Incoming orders'}
        subtitle={retail ? 'Every order you placed, newest first.' : 'Orders from the shops that buy from you. A shop cannot pay until you accept.'}
        actions={
          <>
            <Button variant="outline" size="lg" onClick={() => downloadCsv('feristock-orders.csv', [['Order', 'Date', retail ? 'Supplier' : 'Retailer', 'Items', 'Total', 'Status', 'Payment'], ...rows.map((o) => [o.no, fmtDate(o.createdAt), other(o), o.lines.length, o.total, ORDER_LABEL[o.status], payBadge(o)?.label ?? ''])])}>
              <Download data-icon="inline-start" aria-hidden />
              Export
            </Button>
            {retail && (
              <Button size="lg" nativeButton={false} render={<Link href="/retailer/orders/new" />}>
                <ShoppingCart data-icon="inline-start" aria-hidden />
                New order
              </Button>
            )}
          </>
        }
      />
      <Chips
        label="Order status"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: 'All', count: s.orders.length },
          ...FLOW.map((status) => ({ value: status as Tab, label: ORDER_LABEL[status], count: count(status) })),
          { value: 'closed', label: 'Closed', count: s.orders.filter(closed).length },
        ]}
      />
      <SearchInput value={query} onChange={setQuery} placeholder={retail ? 'Search by order number or supplier' : 'Search by order number or shop'} />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={ClipboardList} title={s.orders.length ? 'No orders match' : 'No orders yet'} text={retail ? 'Place your first order from the reorder cart.' : 'Orders appear here as soon as a shop sends one.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold">
                  <th scope="col">Order</th>
                  <th scope="col" className="max-sm:hidden">{retail ? 'Supplier' : 'Shop'}</th>
                  <th scope="col" className="text-right max-lg:hidden">Items</th>
                  <th scope="col" className="text-right">Total</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="max-md:hidden">Payment</th>
                  <th scope="col" className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((o) => {
                  const pay = payBadge(o)
                  const href = `/${s.ws}/orders/${o.id}`
                  return (
                    <tr key={o.id} className="[&>td]:px-4 [&>td]:py-2.5">
                      <td className="whitespace-nowrap">
                        <Link href={href} className="font-semibold text-primary hover:underline">{o.no}</Link>
                        <p className="text-xs text-muted-foreground">{fmtDate(o.createdAt)}</p>
                        <p className="max-w-36 truncate text-xs text-muted-foreground sm:hidden">{other(o)}</p>
                      </td>
                      <td className="max-sm:hidden">{other(o)}</td>
                      <td className="text-right tabular-nums max-lg:hidden">{o.lines.length}</td>
                      <td className="text-right tabular-nums whitespace-nowrap">{rs(o.total)}</td>
                      <td><StatusPill tone={ORDER_TONE[o.status]}>{ORDER_LABEL[o.status]}</StatusPill></td>
                      <td className="max-md:hidden">{pay ? <StatusPill tone={pay.tone}>{pay.label}</StatusPill> : <span className="text-muted-foreground">Not due</span>}</td>
                      <td className="text-right">
                        {retail && isPayable(o) ? (
                          <Button size="sm" nativeButton={false} render={<Link href={`${href}/pay`} />}>Pay now</Button>
                        ) : retail && o.status === 'dispatched' ? (
                          <Button size="sm" nativeButton={false} render={<Link href={href} />}>Confirm</Button>
                        ) : !retail && o.status === 'pending' ? (
                          <Button size="sm" nativeButton={false} render={<Link href={href} />}>Review</Button>
                        ) : !retail && o.status === 'accepted' ? (
                          <AsyncButton variant="outline" size="sm" onClick={() => act('order.pack', { id: o.id }, { success: `${o.no} marked packed.` })}>Mark packed</AsyncButton>
                        ) : !retail && o.status === 'packed' ? (
                          <Button size="sm" onClick={() => setDispatching(o)}>Dispatch</Button>
                        ) : (
                          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={href} />}>{retail ? 'Track' : 'View'}</Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {dispatching && <DispatchDialog order={dispatching} onClose={() => setDispatching(null)} />}
    </>
  )
}

export function OrderDetailView({ id }: { id: string }) {
  const s = useApp()
  const act = useAct()
  const router = useRouter()
  const [confirm, confirmDialog] = useConfirm()
  const [dialog, setDialog] = useState<'adjust' | 'reject' | 'dispatch' | 'return' | null>(null)
  const order = s.orders.find((o) => o.id === id)
  if (!order) return <MissingView what="order" />

  const retail = s.ws === 'retailer'
  const partner = s.partners.find((p) => p.id === (retail ? order.supplierId : order.retailerId))
  const shipment = s.shipments.find((x) => x.orderId === order.id)
  const payments = s.payments.filter((p) => p.orderId === order.id)
  const receipts = s.receipts.filter((r) => r.orderId === order.id)
  const returns = s.returns.filter((r) => r.orderId === order.id)
  const pay = payBadge(order)
  const due = amountDue(order)
  const stopped = order.status === 'rejected' || order.status === 'cancelled'
  const reached = FLOW.indexOf(order.status)

  const deliver = async () => {
    const ok = await confirm({ title: `Confirm delivery of ${order.no}?`, text: 'Do this once the goods are in your shop. The received quantities are added to your stock.', action: 'Confirm delivery' })
    if (ok) await act('order.deliver', { id: order.id }, { success: `${order.no} delivered. Stock updated.` })
  }
  const cancel = async () => {
    const ok = await confirm({ title: `Cancel ${order.no}?`, text: 'The supplier has not accepted it yet, so it can be cancelled without any payment.', action: 'Cancel order', destructive: true })
    if (ok) await act('order.cancel', { id: order.id }, { success: `${order.no} cancelled.` })
  }
  const again = async () => {
    const r = await act('order.again', { id: order.id })
    if (r.ok) toast.success('Items added to the reorder cart.', { action: { label: 'View cart', onClick: () => router.push('/retailer/orders/new') } })
  }
  const settle = async () => {
    const ok = await confirm({ title: `Mark udharo for ${order.no} as settled?`, text: `Use this when ${partner?.name ?? 'the shop'} has paid ${rs(due)} in cash or outside FeriStock. A receipt is issued.`, action: 'Mark settled' })
    if (ok) await act('udharo.settle', { orderId: order.id }, { success: 'Udharo settled. Receipt issued.' })
  }

  return (
    <>
      <PageHeader
        back={{ href: `/${s.ws}/orders`, label: 'All orders' }}
        title={`Order ${order.no}`}
        pills={<><StatusPill tone={ORDER_TONE[order.status]}>{ORDER_LABEL[order.status]}</StatusPill>{pay && <StatusPill tone={pay.tone}>{pay.label}</StatusPill>}</>}
        subtitle={`${retail ? 'To' : 'From'} ${partner?.name ?? 'Unknown business'} · placed ${fmtDateTime(order.createdAt)}`}
        actions={
          retail ? (
            <>
              {order.status === 'pending' && <Button variant="outline" size="lg" onClick={cancel}><Ban data-icon="inline-start" aria-hidden />Cancel order</Button>}
              {order.status === 'delivered' && <Button variant="outline" size="lg" onClick={() => setDialog('return')}><Undo2 data-icon="inline-start" aria-hidden />Return goods</Button>}
              {order.lines.some((l) => l.productId) && <AsyncButton variant="outline" size="lg" onClick={again}><RotateCcw data-icon="inline-start" aria-hidden />Order again</AsyncButton>}
              {order.status === 'dispatched' && <Button size="lg" onClick={deliver}><PackageCheck data-icon="inline-start" aria-hidden />Confirm delivery</Button>}
              {isPayable(order) && <Button size="lg" nativeButton={false} render={<Link href={`/retailer/orders/${order.id}/pay`} />}><Wallet data-icon="inline-start" aria-hidden />Pay now</Button>}
            </>
          ) : (
            <>
              {order.status === 'pending' && (
                <>
                  <Button variant="outline" size="lg" onClick={() => setDialog('reject')}><X data-icon="inline-start" aria-hidden />Reject</Button>
                  <Button variant="outline" size="lg" onClick={() => setDialog('adjust')}><SlidersHorizontal data-icon="inline-start" aria-hidden />Adjust items</Button>
                  <AsyncButton size="lg" onClick={() => act('order.accept', { id: order.id }, { success: `${order.no} accepted. The shop can pay now.` })}><Check data-icon="inline-start" aria-hidden />Accept</AsyncButton>
                </>
              )}
              {order.status === 'accepted' && <AsyncButton size="lg" onClick={() => act('order.pack', { id: order.id }, { success: `${order.no} marked packed.` })}><PackageCheck data-icon="inline-start" aria-hidden />Mark packed</AsyncButton>}
              {order.status === 'packed' && <Button size="lg" onClick={() => setDialog('dispatch')}><Truck data-icon="inline-start" aria-hidden />Dispatch</Button>}
              {order.payStatus === 'udharo' && <Button variant="outline" size="lg" onClick={settle}><HandCoins data-icon="inline-start" aria-hidden />Mark udharo settled</Button>}
            </>
          )
        }
      />

      {stopped && (
        <p role="status" className="rounded-xl border border-tone-red-line bg-tone-red-soft px-4 py-3 text-sm font-medium text-tone-red-ink">
          {order.status === 'rejected' ? `The supplier could not take this order: ${order.rejectReason ?? 'no reason given'}` : 'This order was cancelled before the supplier accepted it.'}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {!stopped && (
            <Panel title="Progress" subtitle="Both sides see the same five stages">
              <ol className="flex flex-col gap-4 p-4 md:flex-row md:gap-0">
                {FLOW.map((status, i) => {
                  const done = i <= reached
                  const entry = order.history.find((h) => h.status === status)
                  return (
                    <li key={status} className="relative flex flex-1 gap-3 md:flex-col md:gap-2">
                      {i < FLOW.length - 1 && <span aria-hidden className={cn('absolute top-3.5 left-7 hidden h-0.5 w-[calc(100%-1.75rem)] md:block', i < reached ? 'bg-primary' : 'bg-border')} />}
                      <span className={cn('relative grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold', done ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground')}>
                        {done ? <Check className="size-4" aria-hidden /> : i + 1}
                      </span>
                      <div className="min-w-0 md:pr-3">
                        <p className={cn('text-sm font-semibold', !done && 'text-muted-foreground')}>{ORDER_LABEL[status]}<span className="sr-only">{done ? ', done' : ', not yet'}</span></p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{entry ? `${fmtDateTime(entry.at)} · ${entry.by}` : WAITING[status]}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </Panel>
          )}

          <Panel title="Items" subtitle={`${order.lines.length} ${order.lines.length === 1 ? 'item' : 'items'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold">
                    <th scope="col">Item</th>
                    <th scope="col" className="text-right">Qty</th>
                    <th scope="col" className="text-right max-sm:hidden">Rate</th>
                    <th scope="col" className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.lines.map((l) => (
                    <tr key={`${l.sku}-${l.name}`} className="[&>td]:px-4 [&>td]:py-2.5">
                      <td><p className="font-medium">{l.name}</p><p className="text-xs text-muted-foreground">{l.sku}</p></td>
                      <td className="text-right tabular-nums whitespace-nowrap">{`${l.qty} ${l.unit}`}</td>
                      <td className="text-right tabular-nums whitespace-nowrap max-sm:hidden">{rs(l.price)}</td>
                      <td className="text-right tabular-nums whitespace-nowrap">{rs(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/50 font-semibold [&>td]:px-4 [&>td]:py-3">
                    <td colSpan={2}>Order total</td>
                    <td className="max-sm:hidden" />
                    <td className="text-right text-base tabular-nums whitespace-nowrap">{rs(order.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {order.note && <p className="border-t px-4 py-3 text-sm"><span className="font-semibold">Note from the shop: </span>{order.note}</p>}
          </Panel>

          {returns.length > 0 && (
            <Panel title="Returns on this order">
              <ul className="divide-y">
                {returns.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span><span className="font-semibold">{r.no}</span>{` · ${r.lines.map((l) => `${l.qty} ${l.unit} ${l.name}`).join(', ')}`}</span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums">{rs(r.amount)}</span>
                      <StatusPill tone={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'amber'}>{r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Not accepted' : 'Waiting'}</StatusPill>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Payment">
            <dl className="grid grid-cols-2 gap-4 p-4">
              <Meta label={order.payStatus === 'paid' ? 'Paid' : 'Amount due'}>{rs(order.payStatus === 'paid' ? order.total : due)}</Meta>
              <Meta label="Method">{order.payMethod ? METHOD_LABEL[order.payMethod] : order.payStatus === 'udharo' ? 'Udharo (उधारो)' : 'Not chosen yet'}</Meta>
              {order.udharo && !order.udharo.settledAt && <Meta label="Udharo due" className="col-span-2">{`${fmtDay(order.udharo.due)} · ${dueLabel(order.udharo.due, s.now)}`}</Meta>}
            </dl>
            {!stopped && order.payStatus !== 'paid' && (
              <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                {order.status === 'pending' ? (retail ? 'You can pay after the supplier accepts the order.' : 'The shop can pay once you accept the order.')
                  : order.payStatus === 'proof' ? (retail ? 'Your payment proof is with the supplier. They confirm it after checking their account.' : 'The shop sent a payment proof. Check your account, then confirm it in Payments.')
                    : retail ? 'Pay the supplier directly by eSewa, Khalti, QR or bank transfer.' : 'Waiting for the shop to pay you directly.'}
              </p>
            )}
            {payments.length > 0 && (
              <ul className="divide-y border-t">
                {payments.map((p) => {
                  const badge = paymentBadge(p)
                  return (
                    <li key={p.id} className="flex flex-col gap-1 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{`${METHOD_LABEL[p.method]} · ${rs(p.amount)}`}</p>
                        <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
                      </div>
                      <p className="text-xs text-muted-foreground">{`Ref ${p.ref} · ${fmtDateTime(p.createdAt)}`}</p>
                      {p.reason && <p className="text-xs font-medium text-tone-red-ink">{p.reason}</p>}
                      {p.proofUrl && <a href={p.proofUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary hover:underline"><ImageIcon className="size-3.5" aria-hidden />View payment proof</a>}
                    </li>
                  )
                })}
              </ul>
            )}
            {receipts.length > 0 && (
              <ul className="flex flex-col gap-2 border-t p-4">
                {receipts.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/${s.ws}/receipts/${r.id}`} className="font-semibold text-primary hover:underline">{`${r.kind === 'payment' ? 'Payment' : 'Delivery'} receipt ${r.no}`}</Link>
                    <a href={`/api/receipts/${r.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"><FileDown className="size-3.5" aria-hidden />PDF</a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Delivery">
            {shipment ? (
              <>
                <dl className="grid grid-cols-2 gap-4 p-4">
                  <Meta label="Mode">{MODE_LABEL[shipment.mode]}</Meta>
                  <Meta label={shipment.mode === 'van' ? 'Driver' : shipment.mode === 'bilti' ? 'Transport' : 'Collected by'}>{shipment.carrier || 'Not given'}</Meta>
                  <Meta label={shipment.mode === 'bilti' ? 'Bilti number' : 'Vehicle / reference'}>{shipment.ref || 'Not given'}</Meta>
                  <Meta label="Dispatched">{fmtDateTime(shipment.dispatchedAt)}</Meta>
                  <Meta label="Delivered">{shipment.deliveredAt ? fmtDateTime(shipment.deliveredAt) : 'Not yet'}</Meta>
                </dl>
                {shipment.note && <p className="border-t px-4 py-3 text-sm"><span className="font-semibold">Note: </span>{shipment.note}</p>}
                {shipment.photoUrl && <p className="border-t px-4 py-3"><a href={shipment.photoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><ImageIcon className="size-4" aria-hidden />View dispatch photo</a></p>}
              </>
            ) : (
              <p className="p-4 text-sm leading-relaxed text-muted-foreground">{`Not dispatched yet.${retail && partner?.deliveryNote ? ` ${partner.deliveryNote}` : ''}`}</p>
            )}
          </Panel>

          <Panel title={retail ? 'Supplier' : 'Retailer'}>
            <dl className="flex flex-col gap-3 p-4">
              <Meta label="Business">{partner?.name ?? 'Unknown business'}</Meta>
              <Meta label="Address">{partner ? `${partner.address}, ${partner.city}` : 'Not shared'}</Meta>
              <Meta label="PAN / VAT">{partner?.pan || 'Not shared'}</Meta>
              {partner?.phone && (
                <Meta label="Phone">
                  <a href={`tel:${partner.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline"><Phone className="size-4" aria-hidden />{partner.phone}</a>
                </Meta>
              )}
            </dl>
          </Panel>
        </div>
      </div>

      {dialog === 'adjust' && <AdjustItemsDialog order={order} onClose={() => setDialog(null)} />}
      {dialog === 'reject' && <RejectDialog order={order} onClose={() => setDialog(null)} />}
      {dialog === 'dispatch' && <DispatchDialog order={order} onClose={() => setDialog(null)} />}
      {dialog === 'return' && <ReturnDialog order={order} onClose={() => setDialog(null)} />}
      {confirmDialog}
    </>
  )
}
