'use client'

import { BadgeCheck, CircleAlert, Clock, Download, FileDown, HandCoins, ImageIcon, Phone, Printer, ReceiptText, Wallet } from 'lucide-react'
import { useState } from 'react'
import { AsyncButton, Brand, downloadCsv, EmptyState, Field, Meta, Modal, PageHeader, Panel, RecordRow, SearchInput, Stat, StatusPill, useConfirm } from '@/components/kit'
import { Link } from '@/components/nav'
import { MissingView } from '@/components/screens/missing'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAct, useApp } from '@/lib/client'
import { daysUntil, dueLabel, fmtDate, fmtDateTime, fmtDay, monthKey, rs } from '@/lib/format'
import { amountDue, isPayable, partnerName, paymentBadge, sumBy, type Tone } from '@/lib/logic'
import { METHOD_LABEL, MODE_LABEL, type Order, type Payment } from '@/lib/types'

function dueTone(due: string, now: string): Tone {
  const days = daysUntil(due, now)
  return days < 0 ? 'red' : days <= 7 ? 'amber' : 'blue'
}

function PdfButton({ id }: { id: string }) {
  return (
    <Button variant="outline" size="sm" nativeButton={false} render={<a href={`/api/receipts/${id}`} target="_blank" rel="noreferrer" />}>
      <FileDown data-icon="inline-start" aria-hidden />
      PDF
    </Button>
  )
}

function RejectProofDialog({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const act = useAct()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title="Reject this payment proof?"
      description="The order goes back to unpaid and the shop is told why, so they can pay again."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton variant="destructive" onClick={async () => {
            const r = await act('pay.review', { paymentId: payment.id, ok: false, reason }, { success: 'Proof rejected. The shop has been told.', quiet: true })
            if (r.ok) onClose()
            else setError(r.error)
          }}>Reject proof</AsyncButton>
        </>
      }
    >
      <Field label="Reason" htmlFor="proof-reason" error={error || undefined}>
        <Textarea id="proof-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={200} placeholder="For example: the amount has not reached our account." />
      </Field>
    </Modal>
  )
}

export function PaymentsView() {
  const s = useApp()
  const act = useAct()
  const retail = s.ws === 'retailer'
  const [confirm, confirmDialog] = useConfirm()
  const [rejecting, setRejecting] = useState<Payment | null>(null)
  const orderOf = (p: Payment) => s.orders.find((o) => o.id === p.orderId)
  const other = (o?: Order) => (o ? partnerName(s, retail ? o.supplierId : o.retailerId) : 'Unknown business')
  const month = monthKey(s.now)
  const verified = s.payments.filter((p) => p.status === 'verified')
  const thisMonth = sumBy(verified.filter((p) => monthKey(p.verifiedAt ?? p.createdAt) === month), (p) => p.amount)
  const unpaid = s.orders.filter((o) => isPayable(o) && o.payStatus === 'unpaid')
  const udharo = s.orders.filter((o) => o.payStatus === 'udharo')
  const proofs = s.payments.filter((p) => p.status === 'submitted')
  const history = [...s.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const statusPill = (p: Payment) => {
    const badge = paymentBadge(p)
    return <StatusPill tone={badge.tone}>{retail || p.status !== 'submitted' ? badge.label : 'To verify'}</StatusPill>
  }

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle={retail ? 'What you have paid your suppliers and what is still open.' : 'Money shops paid you directly, and transfer proofs waiting for your check.'}
        actions={
          <Button variant="outline" size="lg" onClick={() => downloadCsv('feristock-payments.csv', [['Date', 'Order', retail ? 'Supplier' : 'Retailer', 'Method', 'Reference', 'Amount', 'Status'], ...history.map((p) => [fmtDate(p.createdAt), orderOf(p)?.no ?? '', other(orderOf(p)), METHOD_LABEL[p.method], p.ref, p.amount, paymentBadge(p).label])])}>
            <Download data-icon="inline-start" aria-hidden />
            Export
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={retail ? 'Paid this month' : 'Received this month'} value={rs(thisMonth)} icon={BadgeCheck} tone="green" hint="Verified payments" />
        <Stat label={retail ? 'To pay' : 'Pending payments'} value={rs(sumBy(unpaid, amountDue))} icon={Wallet} tone="amber" hint={`${unpaid.length} accepted ${unpaid.length === 1 ? 'order' : 'orders'} not paid yet`} />
        <Stat label={retail ? 'Udharo payable' : 'Udharo due'} value={rs(sumBy(udharo, amountDue))} icon={HandCoins} tone="teal" hint={`${udharo.length} on credit`} />
        <Stat label={retail ? 'Waiting for supplier' : 'Proofs to verify'} value={retail ? rs(sumBy(proofs, (p) => p.amount)) : proofs.length} icon={Clock} tone="blue" hint={retail ? `${proofs.length} proof${proofs.length === 1 ? '' : 's'} being checked` : rs(sumBy(proofs, (p) => p.amount))} />
      </div>

      {retail ? (
        <Panel title="To pay" subtitle="Accepted orders that are not paid yet">
          {unpaid.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">Nothing is waiting for payment.</p> : (
            <ul className="divide-y">
              {unpaid.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold"><Link href={`/retailer/orders/${o.id}`} className="text-primary hover:underline">{o.no}</Link>{` · ${other(o)}`}</p>
                    <p className="text-sm text-muted-foreground">{`${rs(amountDue(o))} · ordered ${fmtDate(o.createdAt)}`}</p>
                  </div>
                  <Button nativeButton={false} render={<Link href={`/retailer/orders/${o.id}/pay`} />}>Pay now</Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : (
        <Panel title="Payment proofs to verify" subtitle="Check your bank or wallet before confirming">
          {proofs.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">No transfer proofs are waiting for you.</p> : (
            <ul className="divide-y">
              {proofs.map((p) => {
                const order = orderOf(p)
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{`${rs(p.amount)} from ${other(order)}`}</p>
                      <p className="text-sm text-muted-foreground">
                        {order && <Link href={`/supplier/orders/${order.id}`} className="font-medium text-primary hover:underline">{order.no}</Link>}
                        {` · Txn ${p.ref} · ${fmtDateTime(p.createdAt)}`}
                      </p>
                      {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p.proofUrl && <Button variant="ghost" nativeButton={false} render={<a href={p.proofUrl} target="_blank" rel="noreferrer" />}><ImageIcon data-icon="inline-start" aria-hidden />View proof</Button>}
                      <Button variant="outline" onClick={() => setRejecting(p)}>Reject</Button>
                      <Button onClick={async () => {
                        if (await confirm({ title: `Confirm ${rs(p.amount)} received?`, text: `Only confirm once the money is in your account. ${order?.no ?? 'The order'} is marked Paid and a receipt is issued.`, action: 'Confirm payment' })) {
                          await act('pay.review', { paymentId: p.id, ok: true }, { success: 'Payment confirmed. Receipt issued.' })
                        }
                      }}>Verify</Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      )}

      <Panel title="Payment history" bodyClassName="@container">
        {history.length === 0 ? (
          <EmptyState icon={Wallet} title="No payments yet" text="Wallet payments, transfer proofs and settled udharo are listed here." />
        ) : (
          <div className="overflow-x-auto @max-2xl:hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold">
                  <th scope="col">Order</th>
                  <th scope="col">{retail ? 'Supplier' : 'Shop'}</th>
                  <th scope="col">Method</th>
                  <th scope="col" className="@max-4xl:hidden">Reference</th>
                  <th scope="col" className="text-right">Amount</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.slice(0, 100).map((p) => {
                  const order = orderOf(p)
                  return (
                    <tr key={p.id} className="[&>td]:px-4 [&>td]:py-2.5">
                      <td className="whitespace-nowrap">
                        {order ? <Link href={`/${s.ws}/orders/${order.id}`} className="font-semibold text-primary hover:underline">{order.no}</Link> : 'Order'}
                        <p className="text-xs text-muted-foreground">{fmtDate(p.createdAt)}</p>
                      </td>
                      <td>{other(order)}</td>
                      <td className="whitespace-nowrap">{METHOD_LABEL[p.method]}</td>
                      <td className="text-muted-foreground @max-4xl:hidden">{p.ref}</td>
                      <td className="text-right tabular-nums whitespace-nowrap">{rs(p.amount)}</td>
                      <td>{statusPill(p)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {history.length > 0 && (
          <ul className="divide-y @2xl:hidden">
            {history.slice(0, 100).map((p) => {
              const order = orderOf(p)
              return (
                <RecordRow
                  key={p.id}
                  title={order ? <Link href={`/${s.ws}/orders/${order.id}`} className="text-primary hover:underline">{order.no}</Link> : 'Order'}
                  detail={`${other(order)} · ${fmtDate(p.createdAt)}`}
                  badge={statusPill(p)}
                  value={rs(p.amount)}
                  note={METHOD_LABEL[p.method]}
                />
              )
            })}
          </ul>
        )}
      </Panel>
      {rejecting && <RejectProofDialog payment={rejecting} onClose={() => setRejecting(null)} />}
      {confirmDialog}
    </>
  )
}

export function UdharoView() {
  const s = useApp()
  const act = useAct()
  const retail = s.ws === 'retailer'
  const [confirm, confirmDialog] = useConfirm()
  const open = s.orders.filter((o) => o.payStatus === 'udharo' && o.udharo).sort((a, b) => a.udharo!.due.localeCompare(b.udharo!.due))
  const settled = s.orders.filter((o) => o.udharo?.settledAt)
  const overdue = open.filter((o) => daysUntil(o.udharo!.due, s.now) < 0)
  const soon = open.filter((o) => { const d = daysUntil(o.udharo!.due, s.now); return d >= 0 && d <= 7 })
  const other = (o: Order) => s.partners.find((p) => p.id === (retail ? o.supplierId : o.retailerId))

  return (
    <>
      <PageHeader title={retail ? 'Udharo (उधारो)' : 'Udharo due (उधारो)'} subtitle={retail ? 'Goods you took on credit, with the date each supplier expects payment.' : 'Credit you gave to shops, with the date each payment is due.'} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label={retail ? 'Total payable' : 'Total to collect'} value={rs(sumBy(open, amountDue))} icon={HandCoins} tone="teal" hint={`${open.length} ${open.length === 1 ? 'order' : 'orders'} on credit`} />
        <Stat label="Overdue" value={rs(sumBy(overdue, amountDue))} icon={CircleAlert} tone="red" hint={`${overdue.length} past the due date`} />
        <Stat label="Due in 7 days" value={rs(sumBy(soon, amountDue))} icon={Clock} tone="amber" hint={`${soon.length} coming up`} />
      </div>
      <Panel title="Open udharo" subtitle="Earliest due date first">
        {open.length === 0 ? (
          <EmptyState icon={HandCoins} title="No open udharo" text={retail ? 'Orders you take on credit appear here until you pay them.' : 'Orders shops take on credit appear here until they are settled.'} />
        ) : (
          <ul className="divide-y">
            {open.map((o) => {
              const partner = other(o)
              return (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold"><Link href={`/${s.ws}/orders/${o.id}`} className="text-primary hover:underline">{o.no}</Link>{` · ${partner?.name ?? 'Unknown business'}`}</p>
                    <p className="text-sm text-muted-foreground">{`${rs(amountDue(o))} · due ${fmtDay(o.udharo!.due)}`}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={dueTone(o.udharo!.due, s.now)}>{dueLabel(o.udharo!.due, s.now)}</StatusPill>
                    {retail ? (
                      <Button nativeButton={false} render={<Link href={`/retailer/orders/${o.id}/pay`} />}>Pay now</Button>
                    ) : (
                      <>
                        {partner?.phone && <Button variant="outline" nativeButton={false} render={<a href={`tel:${partner.phone}`} />}><Phone data-icon="inline-start" aria-hidden />Call</Button>}
                        <Button onClick={async () => {
                          if (await confirm({ title: `Mark ${o.no} as settled?`, text: `Use this when ${partner?.name ?? 'the shop'} has paid ${rs(amountDue(o))} in cash or outside FeriStock. A receipt is issued.`, action: 'Mark settled' })) {
                            await act('udharo.settle', { orderId: o.id }, { success: 'Udharo settled. Receipt issued.' })
                          }
                        }}>Mark settled</Button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
      {settled.length > 0 && (
        <Panel title="Settled" subtitle="Credit that has been paid">
          <ul className="divide-y">
            {settled.slice(0, 20).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span><Link href={`/${s.ws}/orders/${o.id}`} className="font-semibold text-primary hover:underline">{o.no}</Link>{` · ${other(o)?.name ?? ''} · ${rs(o.udharo!.amount)}`}</span>
                <span className="text-xs text-muted-foreground">{`Settled ${fmtDate(o.udharo!.settledAt!)}`}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {confirmDialog}
    </>
  )
}

export function ReceiptsView() {
  const s = useApp()
  const retail = s.ws === 'retailer'
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const rows = s.receipts
    .map((receipt) => ({ receipt, order: s.orders.find((o) => o.id === receipt.orderId) }))
    .filter((x): x is { receipt: typeof x.receipt; order: Order } => Boolean(x.order))
    .map((x) => ({ ...x, partner: partnerName(s, retail ? x.order.supplierId : x.order.retailerId) }))
    .filter((x) => !q || x.receipt.no.toLowerCase().includes(q) || x.order.no.toLowerCase().includes(q) || x.partner.toLowerCase().includes(q))

  return (
    <>
      <PageHeader
        title="Receipts"
        subtitle="An Order & Payment Receipt for every paid or delivered order, with both PAN/VAT numbers."
        actions={
          <Button variant="outline" size="lg" onClick={() => downloadCsv('feristock-receipts.csv', [['Receipt', 'Date', 'Order', retail ? 'Supplier' : 'Retailer', 'Method', 'Amount', 'Status'], ...rows.map(({ receipt: r, order, partner }) => [r.no, fmtDate(r.issuedAt), order.no, partner, r.method ? METHOD_LABEL[r.method] : '', r.amount, r.paid ? 'Paid' : 'Payment pending'])])}>
            <Download data-icon="inline-start" aria-hidden />
            Export
          </Button>
        }
      />
      <SearchInput value={query} onChange={setQuery} placeholder="Search by receipt, order or business" />
      <Panel bodyClassName="@container">
        {rows.length === 0 ? (
          <EmptyState icon={ReceiptText} title={s.receipts.length ? 'No receipts match' : 'No receipts yet'} text="A receipt is issued when an order is paid or its delivery is confirmed." />
        ) : (
          <div className="overflow-x-auto @max-2xl:hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold">
                  <th scope="col">Receipt</th>
                  <th scope="col">{retail ? 'Supplier' : 'Shop'}</th>
                  <th scope="col" className="@max-4xl:hidden">Method</th>
                  <th scope="col" className="text-right">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.slice(0, 150).map(({ receipt: r, order, partner }) => (
                  <tr key={r.id} className="[&>td]:px-4 [&>td]:py-2.5">
                    <td className="whitespace-nowrap">
                      <Link href={`/${s.ws}/receipts/${r.id}`} className="font-semibold text-primary hover:underline">{r.no}</Link>
                      <p className="text-xs text-muted-foreground">{`${order.no} · ${fmtDate(r.issuedAt)}`}</p>
                    </td>
                    <td>{partner}</td>
                    <td className="@max-4xl:hidden">{r.method ? METHOD_LABEL[r.method] : 'Not chosen yet'}</td>
                    <td className="text-right tabular-nums whitespace-nowrap">{rs(r.amount)}</td>
                    <td><StatusPill tone={r.paid ? 'green' : 'amber'}>{r.paid ? 'Paid' : 'Payment pending'}</StatusPill></td>
                    <td className="text-right"><PdfButton id={r.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 0 && (
          <ul className="divide-y @2xl:hidden">
            {rows.slice(0, 150).map(({ receipt: r, order, partner }) => (
              <RecordRow
                key={r.id}
                title={<Link href={`/${s.ws}/receipts/${r.id}`} className="text-primary hover:underline">{r.no}</Link>}
                detail={`${partner} · ${order.no} · ${fmtDate(r.issuedAt)}`}
                badge={<StatusPill tone={r.paid ? 'green' : 'amber'}>{r.paid ? 'Paid' : 'Payment pending'}</StatusPill>}
                value={rs(r.amount)}
                note={r.method ? METHOD_LABEL[r.method] : undefined}
                action={<PdfButton id={r.id} />}
              />
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}

export function ReceiptView({ id }: { id: string }) {
  const s = useApp()
  const receipt = s.receipts.find((r) => r.id === id)
  const order = receipt && s.orders.find((o) => o.id === receipt.orderId)
  if (!receipt || !order) return <MissingView what="receipt" />
  const retail = s.ws === 'retailer'
  const partner = s.partners.find((p) => p.id === (retail ? order.supplierId : order.retailerId))
  const mine = { name: s.org.name, pan: s.org.pan, address: `${s.org.address}, ${s.org.city}`, phone: s.org.phone }
  const theirs = { name: partner?.name ?? 'Unknown business', pan: partner?.pan ?? '', address: partner ? `${partner.address}, ${partner.city}` : '', phone: partner?.phone ?? '' }
  const parties = [{ title: 'Sold by (supplier)', org: retail ? theirs : mine }, { title: 'Sold to (retailer)', org: retail ? mine : theirs }]
  const shipment = s.shipments.find((x) => x.orderId === order.id)

  return (
    <>
      <PageHeader
        back={{ href: `/${s.ws}/receipts`, label: 'All receipts' }}
        title={`Receipt ${receipt.no}`}
        subtitle={`For order ${order.no} · issued ${fmtDateTime(receipt.issuedAt)}`}
        actions={
          <>
            <Button variant="outline" size="lg" onClick={() => window.print()}><Printer data-icon="inline-start" aria-hidden />Print</Button>
            <Button size="lg" nativeButton={false} render={<a href={`/api/receipts/${receipt.id}`} target="_blank" rel="noreferrer" />}><FileDown data-icon="inline-start" aria-hidden />Download PDF</Button>
          </>
        }
      />
      <article className="print-area mx-auto w-full max-w-3xl overflow-hidden rounded-xl border bg-card print:rounded-none print:border-0">
        <header className="flex flex-wrap items-start justify-between gap-4 bg-brand-navy px-5 py-4 text-brand-navy-foreground">
          <div className="flex flex-col gap-1.5">
            <Brand inverse />
            <p className="text-sm text-brand-navy-foreground/80">{'Order & Payment Receipt'}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{receipt.no}</p>
            <p className="text-sm text-brand-navy-foreground/80">{fmtDateTime(receipt.issuedAt)}</p>
          </div>
        </header>
        <div className="grid gap-5 border-b px-5 py-5 sm:grid-cols-2">
          {parties.map(({ title, org }) => (
            <div key={title} className="flex flex-col gap-0.5 text-sm">
              <p className="pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
              <p className="text-base font-semibold">{org.name}</p>
              <p>{`PAN / VAT ${org.pan || 'not shared'}`}</p>
              <p className="text-muted-foreground">{org.address}</p>
              <p className="text-muted-foreground">{org.phone}</p>
            </div>
          ))}
        </div>
        <div className="@container overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left [&>th]:px-5 [&>th]:py-2.5 [&>th]:font-semibold @max-lg:[&>th]:px-4">
                <th scope="col">Item</th>
                <th scope="col" className="text-right">Qty</th>
                <th scope="col" className="text-right @max-lg:hidden">Rate</th>
                <th scope="col" className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.lines.map((l) => (
                <tr key={`${l.sku}-${l.name}`} className="[&>td]:px-5 [&>td]:py-2.5 @max-lg:[&>td]:px-4">
                  <td>
                    <p className="font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.sku}<span className="@lg:hidden">{` · ${rs(l.price)} each`}</span></p>
                  </td>
                  <td className="text-right tabular-nums whitespace-nowrap">{`${l.qty} ${l.unit}`}</td>
                  <td className="text-right tabular-nums whitespace-nowrap @max-lg:hidden">{rs(l.price)}</td>
                  <td className="text-right tabular-nums whitespace-nowrap">{rs(l.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/50 font-semibold [&>td]:px-5 [&>td]:py-3 @max-lg:[&>td]:px-4">
                <td colSpan={2}>Order total</td>
                <td className="@max-lg:hidden" />
                <td className="text-right text-base tabular-nums whitespace-nowrap">{rs(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="grid gap-5 border-t px-5 py-5 sm:grid-cols-2">
          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Payment
              <StatusPill tone={receipt.paid ? 'green' : 'amber'}>{receipt.paid ? 'PAID' : 'PENDING'}</StatusPill>
            </h2>
            <dl className="grid grid-cols-2 gap-3">
              <Meta label="Method">{receipt.method ? METHOD_LABEL[receipt.method] : 'Not chosen yet'}</Meta>
              <Meta label={receipt.paid ? 'Amount paid' : 'Amount due'}>{rs(receipt.amount)}</Meta>
              <Meta label="Reference">{receipt.ref ?? 'None yet'}</Meta>
              <Meta label="Order">{order.no}</Meta>
            </dl>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Delivery</h2>
            {shipment ? (
              <dl className="grid grid-cols-2 gap-3">
                <Meta label="Mode">{MODE_LABEL[shipment.mode]}</Meta>
                <Meta label="Carrier / reference">{[shipment.carrier, shipment.ref].filter(Boolean).join(' · ') || 'Not given'}</Meta>
                <Meta label="Dispatched">{fmtDate(shipment.dispatchedAt)}</Meta>
                <Meta label="Delivered">{shipment.deliveredAt ? fmtDate(shipment.deliveredAt) : 'Not yet'}</Meta>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Not dispatched yet.</p>
            )}
          </section>
        </div>
        <p className="border-t px-5 py-3 text-xs leading-relaxed text-muted-foreground">Paid by the retailer directly to the supplier. FeriStock does not hold or move any money. This receipt is generated from the order record and cannot be edited.</p>
      </article>
    </>
  )
}
