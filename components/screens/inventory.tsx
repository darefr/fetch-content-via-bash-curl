'use client'

import { Barcode, Bell, BellOff, Boxes, Download, EllipsisVertical, MessageSquareQuote, Pencil, Plus, Scale, ShoppingCart, Trash2, Upload } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AsyncButton, Chips, downloadCsv, EmptyState, Field, FileButton, Modal, PageHeader, SearchInput, StatusPill, Stepper, useConfirm } from '@/components/kit'
import { Link, useNav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAct, useApp } from '@/lib/client'
import { fmtDay, parseCsv, rs } from '@/lib/format'
import { expiryState, MOVE_LABEL, partnerName, productFor, stockStatus, suggestQty, sumBy } from '@/lib/logic'
import { CATEGORIES, UNITS, type Item, type MoveType } from '@/lib/types'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'ok' | 'low' | 'out'
const FILTERS: Filter[] = ['all', 'ok', 'low', 'out']
const SEVERITY = { out: 0, low: 1, ok: 2 }
const ADJUST_TYPES: MoveType[] = ['sold', 'added', 'damaged', 'expired', 'removed', 'counted']

export function AdjustDialog({ item, onClose, type: startType = 'sold', qty: startQty }: { item: Item; onClose: () => void; type?: MoveType; qty?: number }) {
  const act = useAct()
  const [type, setType] = useState<MoveType>(startType)
  const [qty, setQty] = useState(String(startQty ?? (startType === 'counted' ? item.qty : 1)))
  const [note, setNote] = useState('')
  const counted = type === 'counted'
  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={`Adjust stock: ${item.name}`}
      description={`${item.qty} ${item.unit} in stock now. Every change is kept in the stock history.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton onClick={async () => {
            const r = await act('item.adjust', { id: item.id, type, qty: Number(qty), note }, { success: 'Stock updated.' })
            if (r.ok) onClose()
          }}>Save change</AsyncButton>
        </>
      }
    >
      <Field label="What happened?" htmlFor="adjust-type">
        <NativeSelect id="adjust-type" value={type} onChange={(e) => setType(e.target.value as MoveType)} className="w-full">
          {ADJUST_TYPES.map((t) => <NativeSelectOption key={t} value={t}>{MOVE_LABEL[t]}</NativeSelectOption>)}
        </NativeSelect>
      </Field>
      <Field label={counted ? `Counted quantity (${item.unit})` : `Quantity (${item.unit})`} htmlFor="adjust-qty" hint={counted ? 'The stock is set to exactly this number.' : type === 'added' ? 'Added to the stock.' : 'Taken off the stock.'}>
        <Input id="adjust-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, '').slice(0, 5))} />
      </Field>
      <Field label="Note" htmlFor="adjust-note" hint="Optional. For example the reason or who took it.">
        <Textarea id="adjust-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={160} />
      </Field>
    </Modal>
  )
}

function ItemDialog({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const s = useApp()
  const act = useAct()
  const [f, setF] = useState({
    name: item?.name ?? '', sku: item?.sku ?? '', category: item?.category ?? 'Other', unit: item?.unit ?? 'carton', qty: '0',
    threshold: String(item?.threshold ?? 2), cost: String(item?.cost ?? 0), expiry: item?.expiry ?? '', supplierId: item?.supplierId ?? '',
    productId: item?.productId ?? '', alert: item?.alert ?? true,
  })
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((prev) => ({ ...prev, [key]: value }))
  const suppliers = s.partners.filter((p) => p.linked)
  const products = s.products.filter((p) => p.supplierId === f.supplierId)
  const err = (field: string) => (error?.field === field ? error.message : undefined)

  const pickProduct = (productId: string) => {
    const p = s.products.find((x) => x.id === productId)
    setF((prev) => (p ? { ...prev, productId, name: prev.name || p.name, sku: prev.sku || p.sku, unit: p.unit, category: p.category, cost: String(p.price) } : { ...prev, productId: '' }))
  }

  return (
    <Modal
      open
      wide
      onOpenChange={(open) => { if (!open) onClose() }}
      title={item ? `Edit ${item.name}` : 'Add stock item'}
      description={item ? 'Change the details. Use Adjust stock to change the quantity.' : 'Add something you keep on the shelf, with the level at which you want a reorder alert.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton onClick={async () => {
            const r = await act('item.save', { ...f, id: item?.id, qty: Number(f.qty), threshold: Number(f.threshold), cost: Number(f.cost), expiry: f.expiry || undefined, supplierId: f.supplierId || undefined, productId: f.productId || undefined }, { success: item ? 'Item saved.' : 'Item added to your stock.', quiet: true })
            if (r.ok) onClose()
            else setError({ field: r.field, message: r.error })
          }}>{item ? 'Save item' : 'Add item'}</AsyncButton>
        </>
      }
    >
      {error && !error.field && <p role="alert" className="rounded-lg border border-tone-red-line bg-tone-red-soft px-3 py-2 text-sm font-medium text-tone-red-ink">{error.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Linked supplier" htmlFor="item-supplier" hint="Optional. Lets you reorder in one tap." error={err('supplierId')}>
          <NativeSelect id="item-supplier" value={f.supplierId} onChange={(e) => setF((prev) => ({ ...prev, supplierId: e.target.value, productId: '' }))} className="w-full">
            <NativeSelectOption value="">No supplier</NativeSelectOption>
            {suppliers.map((p) => <NativeSelectOption key={p.id} value={p.id}>{p.name}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field label="Their catalog product" htmlFor="item-product" hint="Fills in the name, unit and cost.">
          <NativeSelect id="item-product" value={f.productId} onChange={(e) => pickProduct(e.target.value)} disabled={!f.supplierId} className="w-full">
            <NativeSelectOption value="">Not linked to a product</NativeSelectOption>
            {products.map((p) => <NativeSelectOption key={p.id} value={p.id}>{`${p.name} (${p.sku})`}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field label="Item name" htmlFor="item-name" error={err('name')} className="sm:col-span-2">
          <Input id="item-name" value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={80} aria-invalid={err('name') ? true : undefined} />
        </Field>
        <Field label="SKU" htmlFor="item-sku" error={err('sku')} hint="Leave empty to get one automatically.">
          <Input id="item-sku" value={f.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} maxLength={30} aria-invalid={err('sku') ? true : undefined} />
        </Field>
        <Field label="Category" htmlFor="item-category">
          <NativeSelect id="item-category" value={f.category} onChange={(e) => set('category', e.target.value)} className="w-full">
            {CATEGORIES.map((c) => <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field label="Unit" htmlFor="item-unit">
          <NativeSelect id="item-unit" value={f.unit} onChange={(e) => set('unit', e.target.value)} className="w-full">
            {UNITS.map((u) => <NativeSelectOption key={u} value={u}>{u}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        {!item && (
          <Field label="Quantity in stock now" htmlFor="item-qty" error={err('qty')}>
            <Input id="item-qty" inputMode="numeric" value={f.qty} onChange={(e) => set('qty', e.target.value.replace(/\D/g, '').slice(0, 5))} />
          </Field>
        )}
        <Field label="Reorder level" htmlFor="item-threshold" error={err('threshold')} hint="You get an alert at or below this.">
          <Input id="item-threshold" inputMode="numeric" value={f.threshold} onChange={(e) => set('threshold', e.target.value.replace(/\D/g, '').slice(0, 4))} />
        </Field>
        <Field label="Cost per unit (Rs)" htmlFor="item-cost" error={err('cost')}>
          <Input id="item-cost" inputMode="numeric" value={f.cost} onChange={(e) => set('cost', e.target.value.replace(/\D/g, '').slice(0, 8))} />
        </Field>
        <Field label="Expiry date" htmlFor="item-expiry" hint="Optional. Shows in the expiry tracker.">
          <Input id="item-expiry" type="date" value={f.expiry} onChange={(e) => set('expiry', e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5 text-sm">
        <span className="flex flex-col">
          <span className="font-medium">Low-stock alert</span>
          <span className="text-muted-foreground">Notify the shop when this item reaches its reorder level.</span>
        </span>
        <Switch checked={f.alert} onCheckedChange={(on) => set('alert', on)} />
      </label>
    </Modal>
  )
}

export function InventoryView() {
  const s = useApp()
  const act = useAct()
  const router = useNav()
  const pathname = usePathname()
  const params = useSearchParams()
  const [confirm, confirmDialog] = useConfirm()
  const startFilter = FILTERS.find((x) => x === params.get('filter')) ?? 'all'
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [filter, setFilter] = useState<Filter>(startFilter)
  const [category, setCategory] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<Item | 'new' | null>(params.get('new') ? 'new' : null)
  const [adjusting, setAdjusting] = useState<Item | null>(null)

  // The page can stay mounted while only the query string changes (quick add, search, alerts).
  useEffect(() => {
    if (params.get('new')) setEditing('new')
    if (params.get('q') !== null) setQuery(params.get('q') ?? '')
    const next = FILTERS.find((x) => x === params.get('filter'))
    if (next) setFilter(next)
  }, [params])

  const closeEditor = () => {
    setEditing(null)
    if (params.get('new')) router.replace(pathname)
  }

  const counts = { all: s.items.length, ok: 0, low: 0, out: 0 }
  for (const i of s.items) counts[stockStatus(i).key] += 1
  const q = query.trim().toLowerCase()
  const rows = s.items
    .filter((i) => (filter === 'all' || stockStatus(i).key === filter) && (!category || i.category === category) && (!q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)))
    .sort((a, b) => SEVERITY[stockStatus(a).key] - SEVERITY[stockStatus(b).key] || a.name.localeCompare(b.name))
  const picked = rows.filter((i) => selected.includes(i.id))
  const allPicked = rows.length > 0 && picked.length === rows.length

  const addToCart = async (items: Item[]) => {
    const lines = items.flatMap((i) => {
      const p = productFor(s, i)
      return p ? [{ productId: p.id, qty: suggestQty(i, p) }] : []
    })
    if (lines.length === 0) return toast.error('These items are not linked to a supplier product yet. Edit an item to link it.')
    const r = await act('cart.add', { lines })
    if (r.ok) toast.success(`${lines.length} ${lines.length === 1 ? 'item' : 'items'} added to the reorder cart.`, { action: { label: 'View cart', onClick: () => router.push('/retailer/orders/new') } })
  }

  const importCsv = async (file: File) => {
    const [head, ...body] = parseCsv(await file.text())
    if (!head || body.length === 0) return toast.error('That file has no rows. Export your stock first to see the expected columns.')
    const col = (name: string) => head.findIndex((h) => h.toLowerCase().replace(/[^a-z]/g, '').startsWith(name))
    const at = { name: col('name'), sku: col('sku'), category: col('category'), unit: col('unit'), qty: col('quantity'), threshold: col('reorder'), cost: col('cost') }
    if (at.name < 0) return toast.error('The file needs a "Name" column.')
    const num = (row: string[], i: number) => (i >= 0 && row[i] ? Number(row[i].replace(/[^\d]/g, '')) : 0)
    const data = body.map((row) => ({ name: row[at.name], sku: at.sku >= 0 ? row[at.sku] : '', category: at.category >= 0 ? row[at.category] : '', unit: at.unit >= 0 ? row[at.unit] : '', qty: num(row, at.qty), threshold: num(row, at.threshold), cost: num(row, at.cost) }))
    await act<{ added: number; updated: number }>('item.import', { rows: data }, { success: (r) => `Import done: ${r.added} added, ${r.updated} updated.` })
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={`${s.items.length} items · stock value ${rs(sumBy(s.items, (i) => i.qty * i.cost))} at cost`}
        actions={
          <>
            <FileButton accept=".csv,text/csv" size="lg" onFile={(file) => void importCsv(file)}>
              <Upload data-icon="inline-start" aria-hidden />
              Import CSV
            </FileButton>
            <Button variant="outline" size="lg" onClick={() => downloadCsv('feristock-inventory.csv', [['Name', 'SKU', 'Category', 'Unit', 'Quantity', 'Reorder level', 'Cost', 'Supplier', 'Expiry'], ...s.items.map((i) => [i.name, i.sku, i.category, i.unit, i.qty, i.threshold, i.cost, i.supplierId ? partnerName(s, i.supplierId) : '', i.expiry ?? ''])])}>
              <Download data-icon="inline-start" aria-hidden />
              Export
            </Button>
            <Button size="lg" onClick={() => setEditing('new')}>
              <Plus data-icon="inline-start" aria-hidden />
              Add item
            </Button>
          </>
        }
      />

      <div className="no-print flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name or SKU" />
        <Chips label="Stock status" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All', count: counts.all }, { value: 'ok', label: 'OK', count: counts.ok }, { value: 'low', label: 'Low', count: counts.low }, { value: 'out', label: 'Out', count: counts.out }]} />
        <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className="[&_select]:bg-card">
          <NativeSelectOption value="">All categories</NativeSelectOption>
          {CATEGORIES.map((c) => <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>)}
        </NativeSelect>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card" aria-label="Stock items">
        {rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={s.items.length === 0 ? 'No stock items yet' : 'No items match'}
            text={s.items.length === 0 ? 'Add the things you sell, or import them from a CSV file.' : 'Try another search, status or category.'}
            action={s.items.length === 0 ? <Button onClick={() => setEditing('new')}><Plus data-icon="inline-start" aria-hidden />Add item</Button> : <Button variant="outline" onClick={() => { setQuery(''); setFilter('all'); setCategory('') }}>Clear filters</Button>}
          />
        ) : (
          <>
            <div className="flex min-h-12 flex-wrap items-center gap-3 border-b bg-background px-4 py-2">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
                <Checkbox checked={allPicked} onCheckedChange={(on) => setSelected(on ? rows.map((i) => i.id) : [])} />
                {picked.length ? `${picked.length} selected` : `Select all ${rows.length}`}
              </label>
              {picked.length > 0 && (
                <div className="ml-auto flex flex-wrap gap-2">
                  <AsyncButton variant="outline" onClick={() => addToCart(picked)}><ShoppingCart data-icon="inline-start" aria-hidden />Add to cart</AsyncButton>
                  <Button variant="outline" nativeButton={false} render={<Link href={`/retailer/labels?ids=${picked.map((i) => i.id).join(',')}`} />}><Barcode data-icon="inline-start" aria-hidden />Print labels</Button>
                  <Button variant="ghost" onClick={() => setSelected([])}>Clear</Button>
                </div>
              )}
            </div>
            <ul className="divide-y">
              {rows.map((item) => {
                const status = stockStatus(item)
                const product = productFor(s, item)
                const expiry = expiryState(item, s.now)
                return (
                  <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
                      <Checkbox className="mt-1" checked={selected.includes(item.id)} onCheckedChange={(on) => setSelected((prev) => (on ? [...prev, item.id] : prev.filter((id) => id !== item.id)))} aria-label={`Select ${item.name}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{`${item.sku} · ${item.category} · reorder at ${item.threshold} ${item.unit}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.supplierId ? partnerName(s, item.supplierId) : 'No supplier'}
                          {expiry && <span className={cn(expiry.days <= 30 && 'font-medium text-tone-red-ink')}>{` · ${expiry.days < 0 ? 'expired' : 'expires'} ${fmtDay(item.expiry!)}`}</span>}
                          {!item.alert && ' · alert off'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      <Stepper value={item.qty} label={item.name} onChange={(qty) => act('item.set', { id: item.id, qty })} />
                      {product ? (
                        <AsyncButton onClick={() => addToCart([item])}><ShoppingCart data-icon="inline-start" aria-hidden />Reorder</AsyncButton>
                      ) : (
                        <Button variant="outline" nativeButton={false} render={<Link href="/retailer/orders/quotes?new=1" />}><MessageSquareQuote data-icon="inline-start" aria-hidden />Quote</Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`More actions for ${item.name}`} />}>
                          <EllipsisVertical aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => setEditing(item)}><Pencil aria-hidden />Edit item</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAdjusting(item)}><Scale aria-hidden />Adjust stock</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => act('item.alert', { id: item.id, on: !item.alert }, { success: item.alert ? 'Low-stock alert turned off.' : 'Low-stock alert turned on.' })}>
                              {item.alert ? <BellOff aria-hidden /> : <Bell aria-hidden />}
                              {item.alert ? 'Turn alert off' : 'Turn alert on'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/retailer/labels?ids=${item.id}`)}><Barcode aria-hidden />Print label</DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={async () => {
                                if (await confirm({ title: `Delete ${item.name}?`, text: 'The item leaves your stock list. Its past movements stay in the history.', action: 'Delete item', destructive: true })) {
                                  await act('item.remove', { id: item.id }, { success: 'Item deleted.' })
                                }
                              }}
                            >
                              <Trash2 aria-hidden />
                              Delete item
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      {editing && <ItemDialog item={editing === 'new' ? null : editing} onClose={closeEditor} />}
      {adjusting && <AdjustDialog item={adjusting} onClose={() => setAdjusting(null)} />}
      {confirmDialog}
    </>
  )
}
