'use client'

import { Archive, Download, Gift, Package, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AsyncButton, Chips, downloadCsv, EmptyState, Field, FileButton, Modal, PageHeader, SearchInput, StatusPill, useConfirm } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { useAct, useApp } from '@/lib/client'
import { parseCsv, rs } from '@/lib/format'
import { CATEGORIES, UNITS, type Product } from '@/lib/types'

type Filter = 'live' | 'available' | 'off' | 'archived'
const digits = (v: string, max = 7) => v.replace(/\D/g, '').slice(0, max)

function ProductDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const act = useAct()
  const [f, setF] = useState({
    name: product?.name ?? '', sku: product?.sku ?? '', category: product?.category ?? 'Other', unit: product?.unit ?? 'carton',
    price: String(product?.price ?? ''), moq: String(product?.moq ?? 1), scheme: product?.scheme ?? '', available: product?.available ?? true,
  })
  const [tiers, setTiers] = useState(() => (product?.tiers ?? []).map((t) => ({ min: String(t.min), price: String(t.price) })))
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((prev) => ({ ...prev, [key]: value }))
  const err = (field: string) => (error?.field === field ? error.message : undefined)

  return (
    <Modal
      open
      wide
      onOpenChange={(open) => { if (!open) onClose() }}
      title={product ? `Edit ${product.name}` : 'Add product'}
      description="Shops linked to you see this price right away. Bulk prices apply automatically at the quantity you set."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton onClick={async () => {
            const r = await act('product.save', { ...f, id: product?.id, price: Number(f.price), moq: Number(f.moq), tiers: tiers.filter((t) => t.min || t.price).map((t) => ({ min: Number(t.min), price: Number(t.price) })) }, { success: product ? 'Product saved.' : 'Product added to your catalog.', quiet: true })
            if (r.ok) onClose()
            else setError({ field: r.field, message: r.error })
          }}>{product ? 'Save product' : 'Add product'}</AsyncButton>
        </>
      }
    >
      {error && (!error.field || error.field === 'tiers') && <p role="alert" className="rounded-lg border border-tone-red-line bg-tone-red-soft px-3 py-2 text-sm font-medium text-tone-red-ink">{error.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name" htmlFor="product-name" error={err('name')} className="sm:col-span-2" hint="Include the pack size, for example “Wai Wai noodles (carton of 30)”.">
          <Input id="product-name" value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={80} aria-invalid={err('name') ? true : undefined} />
        </Field>
        <Field label="SKU" htmlFor="product-sku" error={err('sku')}>
          <Input id="product-sku" value={f.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} maxLength={30} aria-invalid={err('sku') ? true : undefined} />
        </Field>
        <Field label="Category" htmlFor="product-category">
          <NativeSelect id="product-category" value={f.category} onChange={(e) => set('category', e.target.value)} className="w-full">
            {CATEGORIES.map((c) => <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field label="Sold by the" htmlFor="product-unit">
          <NativeSelect id="product-unit" value={f.unit} onChange={(e) => set('unit', e.target.value)} className="w-full">
            {UNITS.map((u) => <NativeSelectOption key={u} value={u}>{u}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field label={`Base price per ${f.unit} (Rs)`} htmlFor="product-price" error={err('price')}>
          <Input id="product-price" inputMode="numeric" value={f.price} onChange={(e) => set('price', digits(e.target.value))} aria-invalid={err('price') ? true : undefined} />
        </Field>
        <Field label="Minimum order" htmlFor="product-moq" error={err('moq')} hint={`The smallest number of ${f.unit}s a shop can order.`}>
          <Input id="product-moq" inputMode="numeric" value={f.moq} onChange={(e) => set('moq', digits(e.target.value, 4))} />
        </Field>
        <Field label="Scheme (optional)" htmlFor="product-scheme" hint="For example “Buy 10 cartons, get 1 free”.">
          <Input id="product-scheme" value={f.scheme} onChange={(e) => set('scheme', e.target.value)} maxLength={80} />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Bulk prices</legend>
        {tiers.length === 0 && <p className="text-sm text-muted-foreground">No bulk prices. Every quantity is sold at the base price.</p>}
        {tiers.map((tier, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">From</span>
            <Input className="w-20" inputMode="numeric" value={tier.min} onChange={(e) => setTiers((rows) => rows.map((r, j) => (j === i ? { ...r, min: digits(e.target.value, 5) } : r)))} aria-label={`Bulk tier ${i + 1} quantity`} />
            <span className="text-muted-foreground">{`${f.unit}s, Rs`}</span>
            <Input className="w-28" inputMode="numeric" value={tier.price} onChange={(e) => setTiers((rows) => rows.map((r, j) => (j === i ? { ...r, price: digits(e.target.value) } : r)))} aria-label={`Bulk tier ${i + 1} price`} />
            <span className="text-muted-foreground">each</span>
            <Button variant="ghost" size="icon" aria-label={`Remove bulk tier ${i + 1}`} onClick={() => setTiers((rows) => rows.filter((_, j) => j !== i))}><Trash2 aria-hidden /></Button>
          </div>
        ))}
        {tiers.length < 4 && <Button variant="outline" className="w-fit" onClick={() => setTiers((rows) => [...rows, { min: '', price: '' }])}><Plus data-icon="inline-start" aria-hidden />Add bulk price</Button>}
      </fieldset>
      <label className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5 text-sm">
        <span className="flex flex-col">
          <span className="font-medium">Available to order</span>
          <span className="text-muted-foreground">Turn off when you are out of stock. Shops still see it, marked not available.</span>
        </span>
        <Switch checked={f.available} onCheckedChange={(on) => set('available', on)} />
      </label>
    </Modal>
  )
}

export function CatalogView() {
  const s = useApp()
  const act = useAct()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [confirm, confirmDialog] = useConfirm()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [category, setCategory] = useState('')
  const [filter, setFilter] = useState<Filter>('live')
  const [editing, setEditing] = useState<Product | 'new' | null>(params.get('new') ? 'new' : null)

  useEffect(() => {
    if (params.get('new')) setEditing('new')
    if (params.get('q') !== null) setQuery(params.get('q') ?? '')
  }, [params])
  const close = () => {
    setEditing(null)
    if (params.get('new')) router.replace(pathname)
  }

  const live = s.products.filter((p) => !p.archived)
  const q = query.trim().toLowerCase()
  const rows = s.products
    .filter((p) => (filter === 'archived' ? p.archived : !p.archived && (filter === 'live' || (filter === 'available') === p.available)))
    .filter((p) => (!category || p.category === category) && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name))

  const importCsv = async (file: File) => {
    const [head, ...body] = parseCsv(await file.text())
    if (!head || body.length === 0) return toast.error('That file has no rows. Export your catalog first to see the expected columns.')
    const col = (name: string) => head.findIndex((h) => h.toLowerCase().replace(/[^a-z]/g, '').startsWith(name))
    const at = { name: col('name'), sku: col('sku'), category: col('category'), unit: col('unit'), price: col('price'), moq: col('min'), scheme: col('scheme') }
    if (at.name < 0 || at.sku < 0 || at.price < 0) return toast.error('The file needs "Name", "SKU" and "Price" columns.')
    const num = (row: string[], i: number, fallback: number) => (i >= 0 && row[i] ? Number(row[i].replace(/[^\d]/g, '')) : fallback)
    const data = body.map((row) => ({ name: row[at.name], sku: row[at.sku], category: at.category >= 0 ? row[at.category] : '', unit: at.unit >= 0 ? row[at.unit] : '', price: num(row, at.price, 0), moq: num(row, at.moq, 1), scheme: at.scheme >= 0 ? row[at.scheme] : '' }))
    await act<{ added: number; updated: number }>('product.import', { rows: data }, { success: (r) => `Import done: ${r.added} added, ${r.updated} updated.` })
  }

  return (
    <>
      <PageHeader
        title="Product catalog"
        subtitle={`${live.length} products · ${live.filter((p) => p.available).length} available to order`}
        actions={
          <>
            <FileButton accept=".csv,text/csv" size="lg" onFile={(file) => void importCsv(file)}><Upload data-icon="inline-start" aria-hidden />Import CSV</FileButton>
            <Button variant="outline" size="lg" onClick={() => downloadCsv('feristock-catalog.csv', [['Name', 'SKU', 'Category', 'Unit', 'Price', 'Minimum order', 'Bulk prices', 'Scheme', 'Available'], ...live.map((p) => [p.name, p.sku, p.category, p.unit, p.price, p.moq, p.tiers.map((t) => `${t.min}+ ${t.price}`).join('; '), p.scheme, p.available ? 'Yes' : 'No'])])}><Download data-icon="inline-start" aria-hidden />Export</Button>
            <Button size="lg" onClick={() => setEditing('new')}><Plus data-icon="inline-start" aria-hidden />Add product</Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name or SKU" />
        <Chips
          label="Catalog filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'live', label: 'All', count: live.length },
            { value: 'available', label: 'Available', count: live.filter((p) => p.available).length },
            { value: 'off', label: 'Not available', count: live.filter((p) => !p.available).length },
            { value: 'archived', label: 'Archived', count: s.products.length - live.length },
          ]}
        />
        <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className="[&_select]:bg-card">
          <NativeSelectOption value="">All categories</NativeSelectOption>
          {CATEGORIES.map((c) => <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>)}
        </NativeSelect>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card" aria-label="Products">
        {rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title={s.products.length === 0 ? 'Your catalog is empty' : 'No products match'}
            text={s.products.length === 0 ? 'Add what you sell, with your price per unit. Shops linked to you can order it right away.' : 'Try another search, category or filter.'}
            action={s.products.length === 0 ? <Button onClick={() => setEditing('new')}><Plus data-icon="inline-start" aria-hidden />Add product</Button> : undefined}
          />
        ) : (
          <ul className="divide-y">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{`${p.sku} · ${p.category}`}</p>
                  <p className="text-sm">
                    <span className="font-semibold">{rs(p.price)}</span>
                    <span className="text-muted-foreground">{` per ${p.unit} · min ${p.moq}${p.tiers.map((t) => ` · ${t.min}+ ${rs(t.price)}`).join('')}`}</span>
                  </p>
                  {p.scheme && <p className="flex items-center gap-1.5 text-xs font-medium text-tone-teal-ink"><Gift className="size-3.5" aria-hidden />{p.scheme}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {p.archived ? (
                    <>
                      <StatusPill tone="grey">Archived</StatusPill>
                      <Button variant="outline" onClick={() => setEditing(p)}>Restore</Button>
                    </>
                  ) : (
                    <>
                      <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
                        <Switch checked={p.available} onCheckedChange={() => act('product.toggle', { id: p.id }, { success: p.available ? `${p.name} marked not available.` : `${p.name} is available again.` })} />
                        {p.available ? 'Available' : 'Not available'}
                      </label>
                      <Button variant="outline" onClick={() => setEditing(p)}><Pencil data-icon="inline-start" aria-hidden />Edit</Button>
                      <Button variant="ghost" size="icon" aria-label={`Archive ${p.name}`} onClick={async () => {
                        if (await confirm({ title: `Archive ${p.name}?`, text: 'Shops can no longer order it and it leaves their carts. Past orders keep it. You can restore it from the Archived filter.', action: 'Archive product', destructive: true })) {
                          await act('product.archive', { id: p.id }, { success: 'Product archived.' })
                        }
                      }}>
                        <Archive aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {editing && <ProductDialog product={editing === 'new' ? null : editing} onClose={close} />}
      {confirmDialog}
    </>
  )
}
