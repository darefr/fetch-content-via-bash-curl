'use client'

import { Copy, HandCoins, Landmark, ReceiptText, Send, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { AsyncButton, Field, ImagePicker, Meta, Modal, PageHeader, Panel, StatusPill } from '@/components/kit'
import { MissingView } from '@/components/screens/missing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAct, useApp } from '@/lib/client'
import { addDays, fmtDay, rs } from '@/lib/format'
import { amountDue, isPayable, ORDER_LABEL, ORDER_TONE, payBadge } from '@/lib/logic'
import { cn } from '@/lib/utils'

type Method = 'esewa' | 'khalti' | 'qr' | 'udharo'
interface Session { paymentId: string; ref: string; amount: number; merchant: string }

export function PayView({ id }: { id: string }) {
  const s = useApp()
  const act = useAct()
  const router = useRouter()
  const [method, setMethod] = useState<Method | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [ref, setRef] = useState('')
  const [note, setNote] = useState('')
  const [proof, setProof] = useState<string | null>(null)
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)

  const order = s.orders.find((o) => o.id === id)
  if (!order) return <MissingView what="order" />
  const supplier = s.partners.find((p) => p.id === order.supplierId)
  const name = supplier?.name ?? 'the supplier'
  const due = amountDue(order)
  const pay = payBadge(order)
  const receipt = s.receipts.find((r) => r.orderId === order.id && r.paid)
  const orderHref = `/retailer/orders/${order.id}`

  const options: { value: Method; title: string; text: string; icon: LucideIcon; ready: boolean }[] = [
    { value: 'esewa', title: 'eSewa', text: 'Pay from your eSewa wallet.', icon: Wallet, ready: Boolean(supplier?.hasEsewa) },
    { value: 'khalti', title: 'Khalti', text: 'Pay from your Khalti wallet.', icon: Wallet, ready: Boolean(supplier?.hasKhalti) },
    { value: 'qr', title: 'QR / Bank transfer', text: 'Scan or transfer, then upload proof.', icon: Landmark, ready: Boolean(supplier?.bank || supplier?.hasQr) },
    { value: 'udharo', title: 'Udharo (उधारो)', text: supplier?.creditDays ? `Credit for ${supplier.creditDays} days.` : 'This supplier gives no credit.', icon: HandCoins, ready: Boolean(supplier?.creditDays) && order.payStatus !== 'udharo' },
  ]
  const chosen = method ?? options.find((o) => o.ready)?.value ?? null
  const wallet = chosen === 'esewa' ? 'eSewa' : 'Khalti'

  const finishWallet = async (outcome: 'complete' | 'cancel') => {
    if (!session) return
    await act('pay.gateway', { paymentId: session.paymentId, outcome }, { quiet: true })
    // The browser never decides the result: the server re-checks status and amount.
    const r = await act<{ state: string; receiptId?: string }>('pay.verify', { paymentId: session.paymentId })
    setSession(null)
    if (!r.ok) return
    if (r.result.state === 'paid') {
      toast.success('Payment verified. Your receipt is ready.')
      router.push(r.result.receiptId ? `/retailer/receipts/${r.result.receiptId}` : orderHref)
    } else if (r.result.state === 'cancelled') toast.info('Payment cancelled. Nothing was paid.')
    else toast.error('The wallet did not confirm this payment. Nothing was marked paid.')
  }

  return (
    <>
      <PageHeader
        back={{ href: orderHref, label: `Order ${order.no}` }}
        title={`Pay ${order.no}`}
        pills={<><StatusPill tone={ORDER_TONE[order.status]}>{ORDER_LABEL[order.status]}</StatusPill>{pay && <StatusPill tone={pay.tone}>{pay.label}</StatusPill>}</>}
        subtitle={`To ${name}. The money goes straight to them. FeriStock never holds it.`}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {!isPayable(order) ? (
            <Panel title="Nothing to pay right now">
              <div className="flex flex-col items-start gap-3 p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {order.payStatus === 'paid' ? `This order is paid in full. ${name} has been told.`
                    : order.payStatus === 'proof' ? `Your payment proof is with ${name}. The order is marked Paid as soon as they confirm it.`
                      : order.status === 'pending' ? `${name} has not accepted this order yet. Payment opens when they do.`
                        : 'This order is closed, so there is nothing to pay.'}
                </p>
                {receipt ? (
                  <Button nativeButton={false} render={<Link href={`/retailer/receipts/${receipt.id}`} />}><ReceiptText data-icon="inline-start" aria-hidden />View receipt</Button>
                ) : (
                  <Button variant="outline" nativeButton={false} render={<Link href={orderHref} />}>Back to the order</Button>
                )}
              </div>
            </Panel>
          ) : (
            <>
              <Panel title="Choose how to pay" subtitle={`Amount due ${rs(due)}`}>
                <fieldset className="grid gap-2 p-4 sm:grid-cols-2">
                  <legend className="sr-only">Payment method</legend>
                  {options.map((o) => (
                    <label key={o.value} className={cn('flex min-h-16 items-center gap-3 rounded-xl border p-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50', !o.ready ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', o.value === chosen ? 'border-primary bg-accent' : o.ready && 'hover:bg-muted')}>
                      <input type="radio" name="pay-method" className="sr-only" disabled={!o.ready} checked={o.value === chosen} onChange={() => { setMethod(o.value); setError(null) }} />
                      <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', o.value === chosen ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                        <o.icon className="size-4" aria-hidden />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-semibold">{o.title}</span>
                        <span className="text-sm text-muted-foreground">{o.ready || o.value === 'udharo' ? o.text : 'Not set up by this supplier.'}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              </Panel>

              {(chosen === 'esewa' || chosen === 'khalti') && (
                <Panel title={`Pay with ${wallet}`}>
                  <div className="flex flex-col items-start gap-3 p-4">
                    <p className="text-sm leading-relaxed">
                      {'You pay '}<span className="font-semibold">{rs(due)}</span>{` to the ${wallet} merchant account of ${name}. The order is marked Paid only after the wallet confirms the status and the exact amount.`}
                    </p>
                    <AsyncButton onClick={async () => {
                      const r = await act<Session>('pay.start', { orderId: order.id, method: chosen })
                      if (r.ok) setSession(r.result)
                    }}>
                      <Wallet data-icon="inline-start" aria-hidden />
                      {`Continue to ${wallet}`}
                    </AsyncButton>
                  </div>
                </Panel>
              )}

              {chosen === 'qr' && (
                <Panel title="Pay by QR or bank transfer" subtitle={`Send ${rs(due)} to ${name}, then upload the proof`}>
                  <div className="flex flex-col gap-4 p-4">
                    {error && !error.field && <p role="alert" className="rounded-lg border border-tone-red-line bg-tone-red-soft px-3 py-2 text-sm font-medium text-tone-red-ink">{error.message}</p>}
                    <div className="flex flex-wrap gap-4">
                      {supplier?.hasQr && <img src={`/api/files/qr/${supplier.id}`} alt={`Payment QR code of ${name}`} className="size-40 rounded-lg border bg-card object-contain" />}
                      {supplier?.bank && (
                        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-2 rounded-lg border bg-background p-3">
                          <p className="text-xs font-medium text-muted-foreground">Bank details</p>
                          <p className="text-sm font-medium whitespace-pre-line">{supplier.bank}</p>
                          <Button variant="outline" size="sm" className="w-fit" onClick={async () => {
                            try { await navigator.clipboard.writeText(supplier.bank); toast.success('Bank details copied.') } catch { toast.error('Could not copy. Select the text and copy it by hand.') }
                          }}>
                            <Copy data-icon="inline-start" aria-hidden />
                            Copy
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Transaction ID" htmlFor="pay-ref" error={error?.field === 'ref' ? error.message : undefined} hint="From your banking app or the transfer slip.">
                        <Input id="pay-ref" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={60} />
                      </Field>
                      <Field label="Note (optional)" htmlFor="pay-note">
                        <Input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
                      </Field>
                    </div>
                    <Field label="Payment proof" error={error?.field === 'image' ? error.message : undefined} hint="A screenshot or photo that shows the amount and the transaction ID.">
                      <ImagePicker value={proof} onChange={setProof} label="Upload proof" alt="Your payment proof" onError={(message) => toast.error(message)} />
                    </Field>
                    <AsyncButton className="w-fit" onClick={async () => {
                      const r = await act('pay.proof', { orderId: order.id, ref, note, image: proof ?? undefined }, { success: `Proof sent. ${name} confirms it after checking their account.`, quiet: true })
                      if (r.ok) router.push(orderHref)
                      else setError({ field: r.field, message: r.error })
                    }}>
                      <Send data-icon="inline-start" aria-hidden />
                      Send proof to supplier
                    </AsyncButton>
                  </div>
                </Panel>
              )}

              {chosen === 'udharo' && supplier && (
                <Panel title="Take this order on udharo (उधारो)">
                  <div className="flex flex-col items-start gap-3 p-4">
                    <p className="text-sm leading-relaxed">
                      {`${name} gives ${supplier.creditDays} days of credit. You owe `}<span className="font-semibold">{rs(due)}</span>{` by ${fmtDay(addDays(s.now, supplier.creditDays))}. It shows in your Udharo list until you pay.`}
                    </p>
                    <AsyncButton onClick={async () => {
                      const r = await act('pay.udharo', { orderId: order.id }, { success: `${order.no} is on udharo for ${supplier.creditDays} days.` })
                      if (r.ok) router.push('/retailer/udharo')
                    }}>
                      <HandCoins data-icon="inline-start" aria-hidden />
                      Confirm udharo
                    </AsyncButton>
                  </div>
                </Panel>
              )}

              {!chosen && <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">{`${name} has not set up a way to be paid in FeriStock yet. Call them to agree how to pay.`}</p>}
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <Panel title="Order summary">
            <ul className="divide-y">
              {order.lines.map((l) => (
                <li key={`${l.sku}-${l.name}`} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{`${l.qty} ${l.unit} × ${rs(l.price)}`}</p>
                  </div>
                  <p className="text-sm tabular-nums whitespace-nowrap">{rs(l.amount)}</p>
                </li>
              ))}
            </ul>
            <dl className="grid grid-cols-2 gap-4 border-t p-4">
              <Meta label="Order total">{rs(order.total)}</Meta>
              <Meta label="Due now">{rs(due)}</Meta>
            </dl>
          </Panel>
          <p className="flex gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            A wallet payment is marked Paid only after the server checks the wallet’s status and the exact NPR amount. A receipt with both PAN/VAT numbers is issued right after.
          </p>
        </div>
      </div>

      <Modal
        open={session !== null}
        onOpenChange={(open) => { if (!open) void finishWallet('cancel') }}
        title={`${wallet} sandbox`}
        description="This is a test wallet for the demo. No real money moves."
        footer={
          <>
            <AsyncButton variant="outline" onClick={() => finishWallet('cancel')}>Cancel payment</AsyncButton>
            <AsyncButton onClick={() => finishWallet('complete')}>{`Pay ${rs(session?.amount ?? 0)}`}</AsyncButton>
          </>
        }
      >
        <dl className="flex flex-col gap-3 rounded-lg border bg-background p-3">
          <Meta label="Paying to">{session?.merchant}</Meta>
          <Meta label="Amount">{rs(session?.amount ?? 0)}</Meta>
          <Meta label="Transaction reference">{session?.ref}</Meta>
        </dl>
      </Modal>
    </>
  )
}
