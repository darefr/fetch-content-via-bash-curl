'use client'

import { Package, PackageCheck, Send, TriangleAlert, Truck } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { AsyncButton, Chips, EmptyState, Field, ImagePicker, Modal, PageHeader, Panel, Stat, StatusPill } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAct, useApp } from '@/lib/client'
import { dayKey, fmtDate, fmtDateTime, rs } from '@/lib/format'
import { partnerName, payBadge } from '@/lib/logic'
import { MODE_LABEL, type DeliveryMode, type Order } from '@/lib/types'
import { cn } from '@/lib/utils'

const CARRIER_LABEL: Record<DeliveryMode, string> = { van: 'Driver’s name', bilti: 'Transport company', pickup: 'Collected by (optional)' }
const REF_LABEL: Record<DeliveryMode, string> = { van: 'Vehicle number (optional)', bilti: 'Bilti number', pickup: 'Reference (optional)' }

export function DispatchDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const s = useApp()
  const act = useAct()
  const modes = s.org.supplier?.modes ?? []
  const [mode, setMode] = useState<DeliveryMode>(modes[0] ?? 'van')
  const [carrier, setCarrier] = useState('')
  const [ref, setRef] = useState('')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const unpaidBeforeDispatch = order.payStatus === 'unpaid' && (s.org.supplier?.creditDays ?? 0) === 0

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={`Dispatch ${order.no}`}
      description={`To ${partnerName(s, order.retailerId)} · ${rs(order.total)}. The shop sees these details right away.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton onClick={async () => {
            const r = await act('order.dispatch', { id: order.id, mode, carrier, ref, note, photo: photo ?? undefined }, { success: `${order.no} dispatched. The shop has been told.`, quiet: true })
            if (r.ok) onClose()
            else setError({ field: r.field, message: r.error })
          }}>
            <Truck data-icon="inline-start" aria-hidden />
            Mark as dispatched
          </AsyncButton>
        </>
      }
    >
      {unpaidBeforeDispatch && (
        <p role="status" className="flex gap-2 rounded-lg border border-tone-amber-line bg-tone-amber-soft px-3 py-2.5 text-sm font-medium text-tone-amber-ink">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          This order is not paid yet and your terms are payment before dispatch. You can still send it.
        </p>
      )}
      {error && !error.field && <p role="alert" className="rounded-lg border border-tone-red-line bg-tone-red-soft px-3 py-2 text-sm font-medium text-tone-red-ink">{error.message}</p>}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Delivery mode</legend>
        <div className="flex flex-wrap gap-2">
          {modes.map((m) => (
            <label key={m} className={cn('flex min-h-10 cursor-pointer items-center rounded-lg border px-3 text-sm font-medium has-focus-visible:ring-3 has-focus-visible:ring-ring/50', m === mode ? 'border-primary bg-accent text-accent-foreground' : 'bg-card hover:bg-muted')}>
              <input type="radio" name="dispatch-mode" className="sr-only" checked={m === mode} onChange={() => { setMode(m); setError(null) }} />
              {MODE_LABEL[m]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={CARRIER_LABEL[mode]} htmlFor="dispatch-carrier" error={error?.field === 'carrier' ? error.message : undefined}>
          <Input id="dispatch-carrier" value={carrier} onChange={(e) => { setCarrier(e.target.value); if (error?.field === 'carrier') setError(null) }} placeholder={mode === 'van' ? 'Bishnu Thapa' : mode === 'bilti' ? 'Lumbini Yatayat Transport' : ''} maxLength={80} />
        </Field>
        <Field label={REF_LABEL[mode]} htmlFor="dispatch-ref" error={error?.field === 'ref' ? error.message : undefined}>
          <Input id="dispatch-ref" value={ref} onChange={(e) => { setRef(e.target.value); if (error?.field === 'ref') setError(null) }} placeholder={mode === 'van' ? 'Lu 2 Kha 4120' : mode === 'bilti' ? 'BL-2041' : ''} maxLength={40} />
        </Field>
      </div>
      <Field label="Note for the shop" htmlFor="dispatch-note" hint="Optional. For example the number of cartons or the expected arrival.">
        <Input id="dispatch-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </Field>
      <Field label={mode === 'bilti' ? 'Photo of the bilti' : 'Photo of the loaded goods'} hint="Optional. The shop can open it from the order.">
        <ImagePicker value={photo} onChange={setPhoto} label="Add photo" alt="Dispatch photo" onError={(message) => toast.error(message)} />
      </Field>
    </Modal>
  )
}

type Window = 'transit' | 'delivered' | 'all'

export function ShipmentsView() {
  const s = useApp()
  const [show, setShow] = useState<Window>('transit')
  const rows = s.shipments
    .map((shipment) => ({ shipment, order: s.orders.find((o) => o.id === shipment.orderId) }))
    .filter((x): x is { shipment: typeof x.shipment; order: Order } => Boolean(x.order))
    .sort((a, b) => b.shipment.dispatchedAt.localeCompare(a.shipment.dispatchedAt))
  const transit = rows.filter((x) => !x.shipment.deliveredAt)
  const visible = show === 'transit' ? transit : show === 'delivered' ? rows.filter((x) => x.shipment.deliveredAt) : rows

  return (
    <>
      <PageHeader title="Shipments" subtitle="Goods on the way to your shop, and what has already arrived." />
      <Chips label="Shipments" value={show} onChange={setShow} options={[{ value: 'transit', label: 'On the way', count: transit.length }, { value: 'delivered', label: 'Delivered', count: rows.length - transit.length }, { value: 'all', label: 'All', count: rows.length }]} />
      <Panel>
        {visible.length === 0 ? (
          <EmptyState icon={Truck} title={show === 'transit' ? 'Nothing on the way' : 'No shipments yet'} text="When a supplier dispatches an order, the van or bilti details appear here." />
        ) : (
          <ul className="divide-y">
            {visible.map(({ shipment, order }) => (
              <li key={shipment.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1 basis-60">
                  <p className="text-sm font-semibold">
                    <Link href={`/retailer/orders/${order.id}`} className="text-primary hover:underline">{order.no}</Link>
                    {` · ${partnerName(s, order.supplierId)}`}
                  </p>
                  <p className="text-sm text-muted-foreground">{[MODE_LABEL[shipment.mode], shipment.carrier, shipment.ref].filter(Boolean).join(' · ')}</p>
                  <p className="text-xs text-muted-foreground">{`Dispatched ${fmtDateTime(shipment.dispatchedAt)}${shipment.deliveredAt ? ` · delivered ${fmtDate(shipment.deliveredAt)}` : ''}`}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={shipment.deliveredAt ? 'green' : 'blue'}>{shipment.deliveredAt ? 'Delivered' : 'On the way'}</StatusPill>
                  <Button variant={shipment.deliveredAt ? 'outline' : 'default'} nativeButton={false} render={<Link href={`/retailer/orders/${order.id}`} />}>
                    {shipment.deliveredAt ? 'View order' : 'Confirm delivery'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}

function OrderRow({ order, action }: { order: Order; action: ReactNode }) {
  const s = useApp()
  const pay = payBadge(order)
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-sm font-semibold">
          <Link href={`/supplier/orders/${order.id}`} className="text-primary hover:underline">{order.no}</Link>
          {` · ${partnerName(s, order.retailerId)}`}
        </p>
        <p className="text-sm text-muted-foreground">{`${order.lines.length} ${order.lines.length === 1 ? 'item' : 'items'} · ${rs(order.total)} · ${fmtDate(order.createdAt)}`}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {pay && <StatusPill tone={pay.tone}>{pay.label}</StatusPill>}
        {action}
      </div>
    </li>
  )
}

export function DispatchView() {
  const s = useApp()
  const act = useAct()
  const [dispatching, setDispatching] = useState<Order | null>(null)
  const toPack = s.orders.filter((o) => o.status === 'accepted').reverse()
  const ready = s.orders.filter((o) => o.status === 'packed').reverse()
  const today = dayKey(s.now)
  const sent = s.shipments.map((shipment) => ({ shipment, order: s.orders.find((o) => o.id === shipment.orderId) })).filter((x) => x.order).sort((a, b) => b.shipment.dispatchedAt.localeCompare(a.shipment.dispatchedAt))

  return (
    <>
      <PageHeader title="Dispatch" subtitle="Pack accepted orders, then send them by van, bilti or pickup." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="To pack" value={toPack.length} icon={Package} tone="amber" hint="Accepted, not packed yet" />
        <Stat label="Ready to dispatch" value={ready.length} icon={PackageCheck} tone="teal" hint="Packed at the godown" />
        <Stat label="Dispatched today" value={sent.filter((x) => dayKey(x.shipment.dispatchedAt) === today).length} icon={Send} tone="blue" hint="Vans, bilti and pickups" />
        <Stat label="On the way" value={sent.filter((x) => !x.shipment.deliveredAt).length} icon={Truck} tone="grey" hint="Waiting for the shop to confirm" />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel title="To pack" subtitle="Oldest first">
          {toPack.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">No accepted orders are waiting to be packed.</p> : (
            <ul className="divide-y">
              {toPack.map((o) => <OrderRow key={o.id} order={o} action={<AsyncButton variant="outline" onClick={() => act('order.pack', { id: o.id }, { success: `${o.no} marked packed.` })}><PackageCheck data-icon="inline-start" aria-hidden />Mark packed</AsyncButton>} />)}
            </ul>
          )}
        </Panel>
        <Panel title="Ready to dispatch" subtitle="Packed and waiting to leave">
          {ready.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">Nothing is packed and waiting.</p> : (
            <ul className="divide-y">
              {ready.map((o) => <OrderRow key={o.id} order={o} action={<Button onClick={() => setDispatching(o)}><Truck data-icon="inline-start" aria-hidden />Dispatch</Button>} />)}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title="Sent out" subtitle="Latest dispatches">
        {sent.length === 0 ? (
          <EmptyState icon={Truck} title="No dispatches yet" text="Orders you send out are listed here with the van or bilti details." />
        ) : (
          <ul className="divide-y">
            {sent.slice(0, 25).map(({ shipment, order }) => (
              <li key={shipment.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1 basis-60">
                  <p className="text-sm font-semibold">
                    <Link href={`/supplier/orders/${order!.id}`} className="text-primary hover:underline">{order!.no}</Link>
                    {` · ${partnerName(s, order!.retailerId)}`}
                  </p>
                  <p className="text-sm text-muted-foreground">{[MODE_LABEL[shipment.mode], shipment.carrier, shipment.ref].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs text-muted-foreground">{fmtDateTime(shipment.dispatchedAt)}</p>
                  <StatusPill tone={shipment.deliveredAt ? 'green' : 'blue'}>{shipment.deliveredAt ? 'Delivered' : 'On the way'}</StatusPill>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {dispatching && <DispatchDialog order={dispatching} onClose={() => setDispatching(null)} />}
    </>
  )
}
