'use client'

import { Check, MessageSquareQuote, Plus, Send, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AsyncButton, Chips, EmptyState, Field, Modal, PageHeader, Panel, StatusPill, useConfirm } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useAct, useApp } from '@/lib/client'
import { fmtDate, rs } from '@/lib/format'
import { partnerName, sumBy, type Tone } from '@/lib/logic'
import { UNITS, type Quote } from '@/lib/types'

const TONE: Record<Quote['status'], Tone> = { requested: 'amber', offered: 'blue', accepted: 'green', declined: 'grey' }
const digits = (v: string, max = 7) => v.replace(/\D/g, '').slice(0, max)

function RequestDialog({ onClose }: { onClose: () => void }) {
  const s = useApp()
  const act = useAct()
  const suppliers = s.partners.filter((p) => p.linked)
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '')
  const [lines, setLines] = useState([{ name: '', qty: '1', unit: 'carton', target: '' }])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const edit = (i: number, patch: Partial<(typeof lines)[number]>) => setLines((rows) => rows.map((row, j) => (j === i ? { ...row, ...patch } : row)))

  return (
    <Modal
      open
      wide
      onOpenChange={(open) => { if (!open) onClose() }}
      title="Request a quote"
      description="Ask one of your suppliers for a price on something they do not list, or for a better rate on a large quantity."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton onClick={async () => {
            const r = await act('quote.request', { supplierId, note, lines: lines.map((l) => ({ name: l.name, unit: l.unit, qty: Number(l.qty), target: l.target ? Number(l.target) : undefined })) }, { success: 'Quote request sent to the supplier.', quiet: true })
            if (r.ok) onClose()
            else setError(r.error)
          }}>
            <Send data-icon="inline-start" aria-hidden />
            Send request
          </AsyncButton>
        </>
      }
    >
      {error && <p role="alert" className="rounded-lg border border-tone-red-line bg-tone-red-soft px-3 py-2 text-sm font-medium text-tone-red-ink">{error}</p>}
      <Field label="Supplier" htmlFor="quote-supplier">
        <NativeSelect id="quote-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full">
          {suppliers.length === 0 && <NativeSelectOption value="">Link a supplier first</NativeSelectOption>}
          {suppliers.map((p) => <NativeSelectOption key={p.id} value={p.id}>{`${p.name}, ${p.city}`}</NativeSelectOption>)}
        </NativeSelect>
      </Field>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Items</legend>
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[minmax(0,3fr)_5rem_7rem_minmax(0,2fr)_auto]">
            <Input className="col-span-2 bg-card sm:col-span-1" value={line.name} onChange={(e) => edit(i, { name: e.target.value })} placeholder="Item and pack size" aria-label={`Item ${i + 1} name`} maxLength={80} />
            <Input className="bg-card" inputMode="numeric" value={line.qty} onChange={(e) => edit(i, { qty: digits(e.target.value, 5) })} aria-label={`Item ${i + 1} quantity`} />
            <NativeSelect value={line.unit} onChange={(e) => edit(i, { unit: e.target.value })} aria-label={`Item ${i + 1} unit`} className="w-full [&_select]:bg-card">
              {UNITS.map((u) => <NativeSelectOption key={u} value={u}>{u}</NativeSelectOption>)}
            </NativeSelect>
            <Input className="bg-card" inputMode="numeric" value={line.target} onChange={(e) => edit(i, { target: digits(e.target.value) })} placeholder="Target Rs (optional)" aria-label={`Item ${i + 1} target price per unit`} />
            <Button variant="ghost" size="icon" disabled={lines.length === 1} aria-label={`Remove item ${i + 1}`} onClick={() => setLines((rows) => rows.filter((_, j) => j !== i))}>
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        {lines.length < 10 && (
          <Button variant="outline" className="w-fit" onClick={() => setLines((rows) => [...rows, { name: '', qty: '1', unit: 'carton', target: '' }])}>
            <Plus data-icon="inline-start" aria-hidden />
            Add another item
          </Button>
        )}
      </fieldset>
      <Field label="Note for the supplier" htmlFor="quote-note" hint="Optional. Brand, expiry, delivery date or how often you would order.">
        <Textarea id="quote-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} />
      </Field>
    </Modal>
  )
}

function OfferDialog({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const s = useApp()
  const act = useAct()
  const [offers, setOffers] = useState(() => quote.lines.map((l) => String(l.target ?? '')))
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const total = sumBy(quote.lines, (l) => l.qty * Number(offers[quote.lines.indexOf(l)] || 0))

  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={`Send a price for ${quote.no}`}
      description={`${partnerName(s, quote.retailerId)} can accept your price, which creates an order ready to pack.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton onClick={async () => {
            const r = await act('quote.reply', { id: quote.id, offers: offers.map(Number), reply }, { success: 'Price sent to the shop.', quiet: true })
            if (r.ok) onClose()
            else setError(r.error)
          }}>
            <Send data-icon="inline-start" aria-hidden />
            {total > 0 ? `Send price (${rs(total)})` : 'Send price'}
          </AsyncButton>
        </>
      }
    >
      {error && <p role="alert" className="rounded-lg border border-tone-red-line bg-tone-red-soft px-3 py-2 text-sm font-medium text-tone-red-ink">{error}</p>}
      {quote.lines.map((line, i) => (
        <Field key={`${line.name}-${i}`} label={`${line.name} · ${line.qty} ${line.unit}`} htmlFor={`offer-${i}`} hint={line.target ? `The shop hopes for ${rs(line.target)} per ${line.unit}.` : `Your rate per ${line.unit}.`}>
          <Input id={`offer-${i}`} inputMode="numeric" value={offers[i]} onChange={(e) => setOffers((o) => o.map((v, j) => (j === i ? digits(e.target.value) : v)))} placeholder={`Rs per ${line.unit}`} />
        </Field>
      ))}
      <Field label="Message (optional)" htmlFor="offer-reply">
        <Textarea id="offer-reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={2} maxLength={300} placeholder="For example: rate valid this week, delivery in 2 days." />
      </Field>
    </Modal>
  )
}

function DeclineDialog({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const act = useAct()
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={`Decline ${quote.no}?`}
      description="The shop is told you cannot supply this, with your reason."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton variant="destructive" onClick={async () => {
            const r = await act('quote.decline', { id: quote.id, reply }, { success: 'Quote declined.', quiet: true })
            if (r.ok) onClose()
            else setError(r.error)
          }}>Decline request</AsyncButton>
        </>
      }
    >
      <Field label="Reason" htmlFor="decline-reply" error={error || undefined}>
        <Textarea id="decline-reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={300} placeholder="For example: we do not stock this item." />
      </Field>
    </Modal>
  )
}

type Filter = 'open' | 'closed' | 'all'

export function QuotesView() {
  const s = useApp()
  const act = useAct()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const retail = s.ws === 'retailer'
  const [confirm, confirmDialog] = useConfirm()
  const [filter, setFilter] = useState<Filter>('all')
  const [requesting, setRequesting] = useState(retail && Boolean(params.get('new')))
  const [offering, setOffering] = useState<Quote | null>(null)
  const [declining, setDeclining] = useState<Quote | null>(null)

  useEffect(() => {
    if (retail && params.get('new')) setRequesting(true)
  }, [params, retail])
  const closeRequest = () => {
    setRequesting(false)
    if (params.get('new')) router.replace(pathname)
  }

  const isOpen = (q: Quote) => q.status === 'requested' || q.status === 'offered'
  const quotes = [...s.quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const rows = quotes.filter((q) => filter === 'all' || (filter === 'open' ? isOpen(q) : !isOpen(q)))
  const label = (q: Quote) =>
    q.status === 'requested' ? (retail ? 'Waiting for a price' : 'Needs your price')
      : q.status === 'offered' ? (retail ? 'Price received' : 'Price sent')
        : q.status === 'accepted' ? 'Ordered' : 'Closed'

  return (
    <>
      <PageHeader
        title={retail ? 'Quote requests' : 'Quotes'}
        subtitle={retail ? 'Ask a supplier for a price on something they do not list, or for a bulk deal.' : 'Price requests from shops. Reply with your rate per unit.'}
        actions={retail && (
          <Button size="lg" onClick={() => setRequesting(true)} disabled={!s.partners.some((p) => p.linked)}>
            <Plus data-icon="inline-start" aria-hidden />
            Request a quote
          </Button>
        )}
      />
      <Chips label="Quotes" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All', count: quotes.length }, { value: 'open', label: 'Open', count: quotes.filter(isOpen).length }, { value: 'closed', label: 'Closed', count: quotes.filter((q) => !isOpen(q)).length }]} />

      {rows.length === 0 ? (
        <Panel>
          <EmptyState icon={MessageSquareQuote} title="No quotes here" text={retail ? 'Request a quote when you need an item that is not in a catalog, or a better rate for a big order.' : 'When a shop asks you for a price, the request appears here.'} />
        </Panel>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((q) => {
            const offered = q.lines.every((l) => l.offer !== undefined)
            const total = sumBy(q.lines, (l) => l.qty * (l.offer ?? 0))
            return (
              <li key={q.id}>
                <Panel
                  title={`${q.no} · ${partnerName(s, retail ? q.supplierId : q.retailerId)}`}
                  subtitle={`Asked ${fmtDate(q.createdAt)}${q.repliedAt ? ` · answered ${fmtDate(q.repliedAt)}` : ''}`}
                  action={<StatusPill tone={TONE[q.status]}>{label(q)}</StatusPill>}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left [&>th]:px-4 [&>th]:py-2 [&>th]:font-semibold">
                          <th scope="col">Item</th>
                          <th scope="col" className="text-right">Qty</th>
                          <th scope="col" className="text-right">Target</th>
                          <th scope="col" className="text-right">Offered</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {q.lines.map((l, i) => (
                          <tr key={`${l.name}-${i}`} className="[&>td]:px-4 [&>td]:py-2">
                            <td className="font-medium">{l.name}</td>
                            <td className="text-right tabular-nums whitespace-nowrap">{`${l.qty} ${l.unit}`}</td>
                            <td className="text-right tabular-nums whitespace-nowrap text-muted-foreground">{l.target ? rs(l.target) : 'Open'}</td>
                            <td className="text-right font-semibold tabular-nums whitespace-nowrap">{l.offer !== undefined ? rs(l.offer) : 'Not yet'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col gap-2 border-t px-4 py-3">
                    {q.note && <p className="text-sm"><span className="font-medium">{retail ? 'Your note: ' : 'Shop’s note: '}</span>{q.note}</p>}
                    {q.reply && <p className="text-sm"><span className="font-medium">{retail ? 'Supplier: ' : 'Your reply: '}</span>{q.reply}</p>}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">{offered ? <>{'Total at the offered price '}<span className="font-semibold text-foreground tabular-nums">{rs(total)}</span></> : 'No price yet.'}</p>
                      <div className="flex flex-wrap gap-2">
                        {q.orderId && <Button variant="outline" nativeButton={false} render={<Link href={`/${s.ws}/orders/${q.orderId}`} />}>View order</Button>}
                        {retail && isOpen(q) && (
                          <Button variant="outline" onClick={async () => {
                            if (await confirm({ title: `Close ${q.no}?`, text: 'The supplier is told you no longer need this price.', action: 'Close quote', destructive: true })) await act('quote.decline', { id: q.id }, { success: 'Quote closed.' })
                          }}>
                            <X data-icon="inline-start" aria-hidden />
                            {q.status === 'offered' ? 'Decline price' : 'Withdraw'}
                          </Button>
                        )}
                        {retail && q.status === 'offered' && (
                          <AsyncButton onClick={async () => {
                            const r = await act<{ orderId: string }>('quote.accept', { id: q.id }, { success: 'Price accepted. Your order is ready to pay.' })
                            if (r.ok) router.push(`/retailer/orders/${r.result.orderId}`)
                          }}>
                            <Check data-icon="inline-start" aria-hidden />
                            {`Accept and order (${rs(total)})`}
                          </AsyncButton>
                        )}
                        {!retail && q.status === 'requested' && (
                          <>
                            <Button variant="outline" onClick={() => setDeclining(q)}><X data-icon="inline-start" aria-hidden />Decline</Button>
                            <Button onClick={() => setOffering(q)}><Send data-icon="inline-start" aria-hidden />Send price</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Panel>
              </li>
            )
          })}
        </ul>
      )}

      {requesting && <RequestDialog onClose={closeRequest} />}
      {offering && <OfferDialog quote={offering} onClose={() => setOffering(null)} />}
      {declining && <DeclineDialog quote={declining} onClose={() => setDeclining(null)} />}
      {confirmDialog}
    </>
  )
}
