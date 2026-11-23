'use client'

import JsBarcode from 'jsbarcode'
import { ArrowLeftRight, Barcode, CalendarCheck, CalendarClock, CalendarX2, Download, Pencil, Plus, Printer, Undo2 } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { AsyncButton, Chips, downloadCsv, EmptyState, Field, Modal, PageHeader, Panel, SearchInput, Stat, StatusPill, Stepper } from '@/components/kit'
import { AdjustDialog } from '@/components/screens/inventory'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useAct, useApp } from '@/lib/client'
import { fmtDateTime, fmtDay, rs } from '@/lib/format'
import { expiryState, MOVE_LABEL, partnerName, sumBy } from '@/lib/logic'
import { CATEGORIES, type Item, type MoveType } from '@/lib/types'
import { cn } from '@/lib/utils'

export function StockMovesView() {
  const s = useApp()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [picking, setPicking] = useState(Boolean(params.get('new')))
  const [itemId, setItemId] = useState('')
  const [adjusting, setAdjusting] = useState<Item | null>(null)

  useEffect(() => {
    if (params.get('new')) setPicking(true)
  }, [params])
  const closePicker = () => {
    setPicking(false)
    if (params.get('new')) router.replace(pathname)
  }

  const q = query.trim().toLowerCase()
  const rows = s.movements.filter((m) => (!type || m.type === type) && (!q || m.name.toLowerCase().includes(q) || m.by.toLowerCase().includes(q)))
  const sorted = [...s.items].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <PageHeader
        title="Stock movements"
        subtitle="Every change to your stock, with who made it and when."
        actions={
          <>
            <Button variant="outline" size="lg" onClick={() => downloadCsv('feristock-stock-movements.csv', [['When', 'Item', 'Change', 'Quantity', 'Balance', 'By', 'Note'], ...rows.map((m) => [fmtDateTime(m.at), m.name, MOVE_LABEL[m.type], m.delta, m.balance, m.by, m.note ?? ''])])}>
              <Download data-icon="inline-start" aria-hidden />
              Export
            </Button>
            <Button size="lg" onClick={() => setPicking(true)} disabled={s.items.length === 0}>
              <Plus data-icon="inline-start" aria-hidden />
              Record change
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by item or person" />
        <NativeSelect value={type} onChange={(e) => setType(e.target.value)} aria-label="Change type" className="[&_select]:bg-card">
          <NativeSelectOption value="">All changes</NativeSelectOption>
          {(Object.keys(MOVE_LABEL) as MoveType[]).map((t) => <NativeSelectOption key={t} value={t}>{MOVE_LABEL[t]}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title={s.movements.length ? 'No changes match' : 'No stock changes yet'} text="Sales, deliveries, damage and stock counts are listed here as they are recorded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-semibold">
                  <th scope="col">Item</th>
                  <th scope="col">Change</th>
                  <th scope="col" className="text-right">Qty</th>
                  <th scope="col" className="text-right max-sm:hidden">Balance</th>
                  <th scope="col" className="max-md:hidden">By</th>
                  <th scope="col" className="max-lg:hidden">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.slice(0, 150).map((m) => (
                  <tr key={m.id} className="[&>td]:px-4 [&>td]:py-2.5">
                    <td>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(m.at)}<span className="md:hidden">{` · ${m.by}`}</span></p>
                    </td>
                    <td className="whitespace-nowrap">{MOVE_LABEL[m.type]}</td>
                    <td className={cn('text-right font-semibold tabular-nums', m.delta < 0 ? 'text-tone-red-ink' : 'text-tone-green-ink')}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                    <td className="text-right tabular-nums max-sm:hidden">{m.balance}</td>
                    <td className="max-md:hidden">{m.by}</td>
                    <td className="text-muted-foreground max-lg:hidden">{m.note ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        open={picking}
        onOpenChange={(open) => { if (!open) closePicker() }}
        title="Record a stock change"
        description="Choose the item, then say what happened to it."
        footer={
          <>
            <Button variant="outline" onClick={closePicker}>Cancel</Button>
            <Button disabled={!itemId} onClick={() => { setAdjusting(s.items.find((i) => i.id === itemId) ?? null); closePicker() }}>Continue</Button>
          </>
        }
      >
        <Field label="Item" htmlFor="move-item">
          <NativeSelect id="move-item" value={itemId} onChange={(e) => setItemId(e.target.value)} className="w-full">
            <NativeSelectOption value="">Choose an item</NativeSelectOption>
            {sorted.map((i) => <NativeSelectOption key={i.id} value={i.id}>{`${i.name} (${i.qty} ${i.unit})`}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
      </Modal>
      {adjusting && <AdjustDialog item={adjusting} onClose={() => setAdjusting(null)} />}
    </>
  )
}

type Range = 'expired' | '30' | '90' | 'all'

export function ExpiryView() {
  const s = useApp()
  const act = useAct()
  const [range, setRange] = useState<Range>('30')
  const [writeOff, setWriteOff] = useState<Item | null>(null)
  const [redate, setRedate] = useState<Item | null>(null)
  const [date, setDate] = useState('')

  const dated = s.items.filter((i) => i.expiry).map((item) => ({ item, state: expiryState(item, s.now)! })).sort((a, b) => a.state.days - b.state.days)
  const onShelf = dated.filter((x) => x.item.qty > 0)
  const expired = onShelf.filter((x) => x.state.days < 0)
  const soon = onShelf.filter((x) => x.state.days >= 0 && x.state.days <= 30)
  const within = (days: number) => onShelf.filter((x) => x.state.days <= days)
  const rows = range === 'expired' ? expired : range === '30' ? within(30) : range === '90' ? within(90) : dated
  const value = (list: typeof dated) => sumBy(list, (x) => x.item.qty * x.item.cost)

  return (
    <>
      <PageHeader title="Expiry tracker" subtitle="Sell or return goods before their date. Write off what is already expired." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Already expired" value={expired.length} icon={CalendarX2} tone="red" hint={expired.length ? `${rs(value(expired))} at cost still on the shelf` : 'Nothing expired on the shelf'} />
        <Stat label="Expiring in 30 days" value={soon.length} icon={CalendarClock} tone="amber" hint={`${rs(value(soon))} at cost`} />
        <Stat label="Items with a date" value={dated.length} icon={Barcode} tone="blue" hint={`of ${s.items.length} items`} />
        <Stat label="No expiry date" value={s.items.length - dated.length} icon={Pencil} tone="grey" hint="Add a date from Edit item" />
      </div>
      <Chips
        label="Expiry window"
        value={range}
        onChange={setRange}
        options={[
          { value: 'expired', label: 'Expired', count: expired.length },
          { value: '30', label: 'Within 30 days', count: within(30).length },
          { value: '90', label: 'Within 90 days', count: within(90).length },
          { value: 'all', label: 'All dated items', count: dated.length },
        ]}
      />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Nothing in this window" text="Items with an expiry date appear here as their date gets close." />
        ) : (
          <ul className="divide-y">
            {rows.map(({ item, state }) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1 basis-60">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{`${item.qty} ${item.unit} in stock · ${rs(item.qty * item.cost)} at cost`}</p>
                  <p className="text-xs text-muted-foreground">{`${state.days < 0 ? 'Expired' : 'Expires'} ${fmtDay(item.expiry!)} · ${item.supplierId ? partnerName(s, item.supplierId) : 'No supplier'}`}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={state.tone}>{state.label}</StatusPill>
                  {item.qty > 0 && <Button variant={state.days < 0 ? 'default' : 'outline'} onClick={() => setWriteOff(item)}>Write off</Button>}
                  {item.qty > 0 && item.supplierId && (
                    <Button variant="outline" nativeButton={false} render={<Link href="/retailer/returns?new=1" />}>
                      <Undo2 data-icon="inline-start" aria-hidden />
                      Return
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => { setRedate(item); setDate(item.expiry ?? '') }}>
                    <Pencil data-icon="inline-start" aria-hidden />
                    Change date
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {writeOff && <AdjustDialog item={writeOff} type="expired" qty={writeOff.qty} onClose={() => setWriteOff(null)} />}
      <Modal
        open={redate !== null}
        onOpenChange={(open) => { if (!open) setRedate(null) }}
        title={`Expiry date: ${redate?.name ?? ''}`}
        description="Use the date printed on the newest batch. Leave it empty if the item does not expire."
        footer={
          <>
            <Button variant="outline" onClick={() => setRedate(null)}>Cancel</Button>
            <AsyncButton onClick={async () => {
              if (!redate) return
              const r = await act('item.save', { ...redate, expiry: date || undefined }, { success: 'Expiry date saved.' })
              if (r.ok) setRedate(null)
            }}>Save date</AsyncButton>
          </>
        }
      >
        <Field label="Expiry date" htmlFor="expiry-date">
          <Input id="expiry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </Modal>
    </>
  )
}

function BarcodeSvg({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    try {
      JsBarcode(ref.current, value, { format: 'CODE128', displayValue: false, height: 38, width: 1.3, margin: 0 })
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [value])
  if (failed) return <p className="text-xs text-muted-foreground">This SKU cannot be drawn as a barcode. Use a QR code.</p>
  return <svg ref={ref} role="img" aria-label={`Barcode for ${value}`} className="max-w-full" />
}

export function LabelsView() {
  const s = useApp()
  const params = useSearchParams()
  const [copies, setCopies] = useState<Record<string, number>>(() => Object.fromEntries((params.get('ids') ?? '').split(',').filter(Boolean).map((id) => [id, 1])))
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [code, setCode] = useState<'barcode' | 'qr'>('barcode')
  const [showShop, setShowShop] = useState(true)

  const q = query.trim().toLowerCase()
  const items = [...s.items].sort((a, b) => a.name.localeCompare(b.name))
  const rows = items.filter((i) => (!category || i.category === category) && (!q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)))
  const labels = items.flatMap((item) => Array.from({ length: copies[item.id] ?? 0 }, (_, n) => ({ item, key: `${item.id}-${n}` })))

  return (
    <>
      <PageHeader
        title="Print labels"
        subtitle="Barcode or QR shelf labels for your stock. Scanners read the SKU."
        actions={
          <Button size="lg" disabled={labels.length === 0} onClick={() => window.print()}>
            <Printer data-icon="inline-start" aria-hidden />
            {labels.length ? `Print ${labels.length} ${labels.length === 1 ? 'label' : 'labels'}` : 'Print labels'}
          </Button>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel
          className="no-print"
          title="Choose items"
          subtitle="Set how many labels you need for each item"
          action={<Button variant="ghost" disabled={labels.length === 0} onClick={() => setCopies({})}>Clear all</Button>}
        >
          <div className="flex flex-col gap-2 border-b p-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Search by name or SKU" className="sm:max-w-none" />
            <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              <NativeSelectOption value="">All categories</NativeSelectOption>
              {CATEGORIES.map((c) => <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>)}
            </NativeSelect>
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No items match.</p>
          ) : (
            <ul className="max-h-[32rem] divide-y overflow-y-auto">
              {rows.map((item) => {
                const count = copies[item.id] ?? 0
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <label className="flex min-w-0 cursor-pointer items-center gap-3">
                      <Checkbox checked={count > 0} onCheckedChange={(on) => setCopies((c) => ({ ...c, [item.id]: on ? 1 : 0 }))} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{item.name}</span>
                        <span className="block text-xs text-muted-foreground">{item.sku}</span>
                      </span>
                    </label>
                    {count > 0 && <Stepper value={count} min={1} max={60} label={`${item.name} labels`} onChange={(next) => setCopies((c) => ({ ...c, [item.id]: next }))} />}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel className="print:rounded-none print:border-0" title={<span className="no-print">Label sheet</span>} subtitle={<span className="no-print">{`${labels.length} ${labels.length === 1 ? 'label' : 'labels'} · 3 across on A4`}</span>}>
          <div className="no-print flex flex-wrap items-end gap-4 px-4 pt-4">
            <Field label="Code type" htmlFor="label-code">
              <NativeSelect id="label-code" value={code} onChange={(e) => setCode(e.target.value as 'barcode' | 'qr')}>
                <NativeSelectOption value="barcode">Barcode (Code 128)</NativeSelectOption>
                <NativeSelectOption value="qr">QR code</NativeSelectOption>
              </NativeSelect>
            </Field>
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={showShop} onCheckedChange={(on) => setShowShop(on === true)} />
              Show shop name
            </label>
          </div>
          {labels.length === 0 ? (
            <EmptyState icon={Barcode} title="No labels yet" text="Tick the items you want labels for. They appear here ready to print." />
          ) : (
            <div className="print-area grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 print:grid-cols-3">
              {labels.map(({ item, key }) => (
                <div key={key} className="flex break-inside-avoid flex-col items-center gap-1.5 rounded-lg border p-3 text-center">
                  {showShop && <p className="text-xs text-muted-foreground">{s.org.name}</p>}
                  <p className="text-xs leading-snug font-semibold">{item.name}</p>
                  {code === 'barcode' ? <BarcodeSvg value={item.sku} /> : <QRCodeSVG value={item.sku} size={84} marginSize={0} role="img" aria-label={`QR code for ${item.sku}`} />}
                  <p className="text-xs font-semibold tracking-wide">{item.sku}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}
