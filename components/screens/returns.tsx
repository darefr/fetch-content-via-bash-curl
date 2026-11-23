'use client'

import { Check, Undo2, X } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AsyncButton, Chips, EmptyState, Field, Modal, PageHeader, Panel, StatusPill, Stepper } from '@/components/kit'
import { Link, useNav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useAct, useApp } from '@/lib/client'
import { fmtDate, rs } from '@/lib/format'
import { partnerName, sumBy, type Tone } from '@/lib/logic'
import type { AppState, Order, ReturnReq } from '@/lib/types'

const TONE: Record<ReturnReq['status'], Tone> = { requested: 'amber', approved: 'green', rejected: 'red' }
const LABEL: Record<ReturnReq['status'], string> = { requested: 'Waiting for supplier', approved: 'Approved', rejected: 'Not accepted' }

/** How many of each order line can still be sent back, after earlier returns. */
function returnable(s: AppState, order: Order) {
  const earlier = s.returns.filter((r) => r.orderId === order.id && r.status !== 'rejected')
  return order.lines.map((line) => line.qty - sumBy(earlier, (r) => r.lines.find((l) => l.sku === line.sku && l.name === line.name)?.qty ?? 0))
}

export function ReturnDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const s = useApp()
  const act = useAct()
  const left = returnable(s, order)
  const [qtys, setQtys] = useState<number[]>(() => order.lines.map(() => 0))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const amount = sumBy(order.lines, (line) => line.price * (qtys[order.lines.indexOf(line)] ?? 0))

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={`Return goods from ${order.no}`}
      description={`${partnerName(s, order.supplierId)} is asked to take these back. Your stock changes only after they approve.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton onClick={async () => {
            const r = await act('return.request', { orderId: order.id, qtys, reason }, { success: 'Return request sent to the supplier.', quiet: true })
            if (r.ok) onClose()
            else setError(r.error)
          }}>
            <Undo2 data-icon="inline-start" aria-hidden />
            {amount > 0 ? `Request return of ${rs(amount)}` : 'Request return'}
          </AsyncButton>
        </>
      }
    >
      {error && <p role="alert" className="rounded-lg border border-tone-red-line bg-tone-red-soft px-3 py-2 text-sm font-medium text-tone-red-ink">{error}</p>}
      <ul className="divide-y rounded-lg border">
        {order.lines.map((line, i) => (
          <li key={`${line.sku}-${line.name}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">{line.name}</p>
              <p className="text-xs text-muted-foreground">{left[i] > 0 ? `Up to ${left[i]} ${line.unit} · ${rs(line.price)} each` : 'Already returned in full'}</p>
            </div>
            <Stepper value={qtys[i]} max={left[i]} disabled={left[i] <= 0} label={`${line.name} return`} onChange={(next) => setQtys((q) => q.map((v, j) => (j === i ? next : v)))} />
          </li>
        ))}
      </ul>
      <Field label="Reason" htmlFor="return-reason" hint="Say what is wrong: damaged, expired, wrong item or short supply.">
        <Textarea id="return-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} />
      </Field>
    </Modal>
  )
}

function ResolveDialog({ request, approve, onClose }: { request: ReturnReq; approve: boolean; onClose: () => void }) {
  const s = useApp()
  const act = useAct()
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={approve ? `Approve return ${request.no}?` : `Reject return ${request.no}?`}
      description={approve ? `${rs(request.amount)} is taken off ${partnerName(s, request.retailerId)}’s stock, and off their udharo if this order is on credit.` : 'Tell the shop why, so they know what to do with the goods.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton variant={approve ? 'default' : 'destructive'} onClick={async () => {
            const r = await act('return.resolve', { id: request.id, ok: approve, reply }, { success: approve ? 'Return approved.' : 'Return rejected.', quiet: true })
            if (r.ok) onClose()
            else setError(r.error)
          }}>{approve ? 'Approve return' : 'Reject return'}</AsyncButton>
        </>
      }
    >
      <Field label={approve ? 'Message to the shop (optional)' : 'Reason'} htmlFor="resolve-reply" error={error || undefined}>
        <Textarea id="resolve-reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={300} placeholder={approve ? 'For example: credit note against your next order.' : ''} />
      </Field>
    </Modal>
  )
}

type Filter = 'open' | 'closed' | 'all'

export function ReturnsView() {
  const s = useApp()
  const router = useNav()
  const pathname = usePathname()
  const params = useSearchParams()
  const retail = s.ws === 'retailer'
  const [filter, setFilter] = useState<Filter>('all')
  const [picking, setPicking] = useState(Boolean(params.get('new')))
  const [orderId, setOrderId] = useState('')
  const [returning, setReturning] = useState<Order | null>(null)
  const [resolving, setResolving] = useState<{ request: ReturnReq; approve: boolean } | null>(null)

  useEffect(() => {
    if (params.get('new')) setPicking(true)
  }, [params])
  const closePicker = () => {
    setPicking(false)
    if (params.get('new')) router.replace(pathname)
  }

  const eligible = s.orders.filter((o) => o.status === 'delivered' && returnable(s, o).some((n) => n > 0))
  const open = s.returns.filter((r) => r.status === 'requested')
  const rows = filter === 'open' ? open : filter === 'closed' ? s.returns.filter((r) => r.status !== 'requested') : s.returns

  return (
    <>
      <PageHeader
        title={retail ? 'Returns' : 'Returns from shops'}
        subtitle={retail ? 'Send back damaged or expired goods and get the credit agreed in writing.' : 'Shops asking you to take goods back. Approving removes the goods from their stock.'}
        actions={retail && (
          <Button size="lg" onClick={() => setPicking(true)} disabled={eligible.length === 0}>
            <Undo2 data-icon="inline-start" aria-hidden />
            New return
          </Button>
        )}
      />
      <Chips label="Returns" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All', count: s.returns.length }, { value: 'open', label: retail ? 'Waiting' : 'To review', count: open.length }, { value: 'closed', label: 'Closed', count: s.returns.length - open.length }]} />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={Undo2} title="No returns here" text={retail ? 'Start a return from a delivered order when something arrives damaged, expired or short.' : 'When a shop asks to send goods back, the request appears here.'} />
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              const order = s.orders.find((o) => o.id === r.orderId)
              return (
                <li key={r.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {`${r.no} · `}
                      {order ? <Link href={`/${s.ws}/orders/${order.id}`} className="text-primary hover:underline">{order.no}</Link> : 'Order'}
                      {` · ${partnerName(s, retail ? r.supplierId : r.retailerId)}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">{rs(r.amount)}</span>
                      <StatusPill tone={TONE[r.status]}>{retail || r.status !== 'requested' ? LABEL[r.status] : 'To review'}</StatusPill>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.lines.map((l) => `${l.qty} ${l.unit} ${l.name}`).join(', ')}</p>
                  <p className="text-sm"><span className="font-medium">Reason: </span>{r.reason}</p>
                  {r.reply && <p className="text-sm"><span className="font-medium">{retail ? 'Supplier: ' : 'Your reply: '}</span>{r.reply}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{`Asked ${fmtDate(r.createdAt)}${r.resolvedAt ? ` · closed ${fmtDate(r.resolvedAt)}` : ''}`}</p>
                    {!retail && r.status === 'requested' && (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setResolving({ request: r, approve: false })}><X data-icon="inline-start" aria-hidden />Reject</Button>
                        <Button onClick={() => setResolving({ request: r, approve: true })}><Check data-icon="inline-start" aria-hidden />Approve</Button>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Modal
        open={picking}
        onOpenChange={(o) => { if (!o) closePicker() }}
        title="Start a return"
        description="Choose the delivered order the goods came on."
        footer={
          <>
            <Button variant="outline" onClick={closePicker}>Cancel</Button>
            <Button disabled={!orderId} onClick={() => { setReturning(s.orders.find((o) => o.id === orderId) ?? null); closePicker() }}>Continue</Button>
          </>
        }
      >
        <Field label="Order" htmlFor="return-order">
          <NativeSelect id="return-order" value={orderId} onChange={(e) => setOrderId(e.target.value)} className="w-full">
            <NativeSelectOption value="">Choose an order</NativeSelectOption>
            {eligible.map((o) => <NativeSelectOption key={o.id} value={o.id}>{`${o.no} · ${partnerName(s, o.supplierId)} · ${fmtDate(o.createdAt)}`}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
      </Modal>
      {returning && <ReturnDialog order={returning} onClose={() => setReturning(null)} />}
      {resolving && <ResolveDialog request={resolving.request} approve={resolving.approve} onClose={() => setResolving(null)} />}
    </>
  )
}
