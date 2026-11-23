'use client'

import { CalendarClock, Info, Pause, Pencil, Play, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AsyncButton, EmptyState, Field, Modal, PageHeader, Panel, StatusPill, Stepper, useConfirm } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { useAct, useApp } from '@/lib/client'
import { dayKey, fmtDate, fmtDay, rs, WEEKDAYS } from '@/lib/format'
import { nextRun, partnerName, sumBy, tierPrice } from '@/lib/logic'
import type { Schedule } from '@/lib/types'

function when(schedule: Pick<Schedule, 'freq' | 'day' | 'time'>) {
  return schedule.freq === 'weekly' ? `Every ${WEEKDAYS[schedule.day]} at ${schedule.time}` : `On day ${schedule.day} of every month at ${schedule.time}`
}

function ScheduleDialog({ schedule, onClose }: { schedule: Schedule | null; onClose: () => void }) {
  const s = useApp()
  const act = useAct()
  const suppliers = s.partners.filter((p) => p.linked)
  const [name, setName] = useState(schedule?.name ?? '')
  const [supplierId, setSupplierId] = useState(schedule?.supplierId ?? suppliers[0]?.id ?? '')
  const [freq, setFreq] = useState<Schedule['freq']>(schedule?.freq ?? 'weekly')
  const [day, setDay] = useState(schedule?.day ?? 0)
  const [time, setTime] = useState(schedule?.time ?? '08:00')
  const [active, setActive] = useState(schedule?.active ?? true)
  const [lines, setLines] = useState(schedule?.lines ?? [])
  const [adding, setAdding] = useState('')
  const [error, setError] = useState('')
  const catalog = s.products.filter((p) => p.supplierId === supplierId)
  const free = catalog.filter((p) => !lines.some((l) => l.productId === p.id))

  return (
    <Modal
      open
      wide
      onOpenChange={(open) => { if (!open) onClose() }}
      title={schedule ? `Edit “${schedule.name}”` : 'New scheduled order'}
      description="A list you reorder on the same day every week or month. On that day, add it to your cart with one tap."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton onClick={async () => {
            const r = await act('schedule.save', { id: schedule?.id, name, supplierId, freq, day, time, active, lines }, { success: schedule ? 'Scheduled order saved.' : 'Scheduled order created.', quiet: true })
            if (r.ok) onClose()
            else setError(r.error)
          }}>{schedule ? 'Save schedule' : 'Create schedule'}</AsyncButton>
        </>
      }
    >
      {error && <p role="alert" className="rounded-lg border border-tone-red-line bg-tone-red-soft px-3 py-2 text-sm font-medium text-tone-red-ink">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="schedule-name">
          <Input id="schedule-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekly staples" maxLength={60} />
        </Field>
        <Field label="Supplier" htmlFor="schedule-supplier">
          <NativeSelect id="schedule-supplier" value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setLines([]) }} className="w-full">
            {suppliers.map((p) => <NativeSelectOption key={p.id} value={p.id}>{p.name}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field label="Repeats" htmlFor="schedule-freq">
          <NativeSelect id="schedule-freq" value={freq} onChange={(e) => { const next = e.target.value as Schedule['freq']; setFreq(next); setDay(next === 'weekly' ? 0 : 1) }} className="w-full">
            <NativeSelectOption value="weekly">Every week</NativeSelectOption>
            <NativeSelectOption value="monthly">Every month</NativeSelectOption>
          </NativeSelect>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={freq === 'weekly' ? 'Day' : 'Day of month'} htmlFor="schedule-day">
            <NativeSelect id="schedule-day" value={day} onChange={(e) => setDay(Number(e.target.value))} className="w-full">
              {freq === 'weekly'
                ? WEEKDAYS.map((d, i) => <NativeSelectOption key={d} value={i}>{d}</NativeSelectOption>)
                : Array.from({ length: 28 }, (_, i) => <NativeSelectOption key={i + 1} value={i + 1}>{i + 1}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field label="Time" htmlFor="schedule-time">
            <Input id="schedule-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Items</legend>
        {lines.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">No items yet. Add products from this supplier’s catalog below.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {lines.map((line) => {
              const p = s.products.find((x) => x.id === line.productId)
              if (!p) return null
              return (
                <li key={line.productId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{`${rs(tierPrice(p, line.qty))} per ${p.unit} · min ${p.moq}`}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Stepper value={line.qty} min={p.moq} label={p.name} onChange={(qty) => setLines((rows) => rows.map((r) => (r.productId === p.id ? { ...r, qty } : r)))} />
                    <Button variant="ghost" size="icon" aria-label={`Remove ${p.name}`} onClick={() => setLines((rows) => rows.filter((r) => r.productId !== p.id))}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <NativeSelect value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Product to add" className="min-w-0 flex-1">
            <NativeSelectOption value="">{free.length ? 'Choose a product to add' : 'Every product is on the list'}</NativeSelectOption>
            {free.map((p) => <NativeSelectOption key={p.id} value={p.id}>{`${p.name} · ${rs(p.price)}`}</NativeSelectOption>)}
          </NativeSelect>
          <Button variant="outline" disabled={!adding} onClick={() => {
            const p = catalog.find((x) => x.id === adding)
            if (p) setLines((rows) => [...rows, { productId: p.id, qty: p.moq }])
            setAdding('')
          }}>
            <Plus data-icon="inline-start" aria-hidden />
            Add
          </Button>
        </div>
      </fieldset>
      <label className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5 text-sm">
        <span className="flex flex-col">
          <span className="font-medium">Active</span>
          <span className="text-muted-foreground">Paused schedules keep their list but stop reminding you.</span>
        </span>
        <Switch checked={active} onCheckedChange={setActive} />
      </label>
    </Modal>
  )
}

export function SchedulesView() {
  const s = useApp()
  const act = useAct()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [confirm, confirmDialog] = useConfirm()
  const [editing, setEditing] = useState<Schedule | 'new' | null>(params.get('new') ? 'new' : null)
  const today = dayKey(s.now)

  useEffect(() => {
    if (params.get('new')) setEditing('new')
  }, [params])
  const close = () => {
    setEditing(null)
    if (params.get('new')) router.replace(pathname)
  }

  return (
    <>
      <PageHeader
        title="Scheduled orders"
        subtitle="Lists you reorder every week or month, ready to drop into the cart on the day."
        actions={
          <Button size="lg" onClick={() => setEditing('new')} disabled={!s.partners.some((p) => p.linked)}>
            <Plus data-icon="inline-start" aria-hidden />
            New schedule
          </Button>
        }
      />
      <p className="flex gap-2 rounded-xl border border-tone-blue-line bg-tone-blue-soft px-4 py-3 text-sm text-tone-blue-ink">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        FeriStock does not place these orders by itself. On the day, tap “Add to cart”, check the quantities and place the order.
      </p>

      {s.schedules.length === 0 ? (
        <Panel>
          <EmptyState icon={CalendarClock} title="No scheduled orders yet" text="Save the list you buy every week, such as rice, sugar and noodles, and reorder it in two taps." action={<Button onClick={() => setEditing('new')} disabled={!s.partners.some((p) => p.linked)}><Plus data-icon="inline-start" aria-hidden />New schedule</Button>} />
        </Panel>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {s.schedules.map((schedule) => {
            const next = nextRun(schedule, s.now)
            const due = schedule.active && next === today
            const lines = schedule.lines.flatMap((l) => {
              const p = s.products.find((x) => x.id === l.productId)
              return p ? [{ p, qty: l.qty }] : []
            })
            return (
              <li key={schedule.id}>
                <Panel
                  title={schedule.name}
                  subtitle={`${partnerName(s, schedule.supplierId)} · ${when(schedule)}`}
                  action={<StatusPill tone={!schedule.active ? 'grey' : due ? 'amber' : 'green'}>{!schedule.active ? 'Paused' : due ? 'Due today' : 'Active'}</StatusPill>}
                >
                  <ul className="divide-y">
                    {lines.map(({ p, qty }) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                        <span className="min-w-0 truncate">{p.name}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">{`${qty} ${p.unit}`}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-3 border-t px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      {'About '}<span className="font-semibold text-foreground tabular-nums">{rs(sumBy(lines, ({ p, qty }) => tierPrice(p, qty) * qty))}</span>
                      {schedule.active ? ` · next on ${fmtDay(next)}` : ' · paused'}
                      {schedule.lastRun ? ` · last added ${fmtDate(schedule.lastRun)}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <AsyncButton variant={due ? 'default' : 'outline'} onClick={async () => {
                        const r = await act('schedule.run', { id: schedule.id })
                        if (r.ok) toast.success(`“${schedule.name}” added to the reorder cart.`, { action: { label: 'View cart', onClick: () => router.push('/retailer/orders/new') } })
                      }}>
                        <ShoppingCart data-icon="inline-start" aria-hidden />
                        Add to cart
                      </AsyncButton>
                      <AsyncButton variant="outline" onClick={() => act('schedule.toggle', { id: schedule.id }, { success: schedule.active ? 'Schedule paused.' : 'Schedule resumed.' })}>
                        {schedule.active ? <Pause data-icon="inline-start" aria-hidden /> : <Play data-icon="inline-start" aria-hidden />}
                        {schedule.active ? 'Pause' : 'Resume'}
                      </AsyncButton>
                      <Button variant="outline" onClick={() => setEditing(schedule)}><Pencil data-icon="inline-start" aria-hidden />Edit</Button>
                      <Button variant="ghost" onClick={async () => {
                        if (await confirm({ title: `Delete “${schedule.name}”?`, text: 'The saved list is removed. Orders you already placed are not affected.', action: 'Delete schedule', destructive: true })) await act('schedule.remove', { id: schedule.id }, { success: 'Scheduled order deleted.' })
                      }}>
                        <Trash2 data-icon="inline-start" aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Panel>
              </li>
            )
          })}
        </ul>
      )}
      {editing && <ScheduleDialog schedule={editing === 'new' ? null : editing} onClose={close} />}
      {confirmDialog}
    </>
  )
}
