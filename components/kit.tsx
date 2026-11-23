'use client'

import { ArrowLeft, ImagePlus, Minus, Plus, Search, Store, X, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { group, rs, toCsv } from '@/lib/format'
import type { Tone } from '@/lib/logic'
import { cn } from '@/lib/utils'

const PILL: Record<Tone, string> = {
  green: 'border-tone-green-line bg-tone-green-soft text-tone-green-ink',
  amber: 'border-tone-amber-line bg-tone-amber-soft text-tone-amber-ink',
  red: 'border-tone-red-line bg-tone-red-soft text-tone-red-ink',
  teal: 'border-tone-teal-line bg-tone-teal-soft text-tone-teal-ink',
  blue: 'border-tone-blue-line bg-tone-blue-soft text-tone-blue-ink',
  grey: 'border-tone-grey-line bg-tone-grey-soft text-tone-grey-ink',
}

const DOT: Record<Tone, string> = {
  green: 'bg-tone-green', amber: 'bg-tone-amber', red: 'bg-tone-red', teal: 'bg-tone-teal', blue: 'bg-tone-blue', grey: 'bg-tone-grey',
}

const SOFT: Record<Tone, string> = {
  green: 'bg-tone-green-soft text-tone-green-ink', amber: 'bg-tone-amber-soft text-tone-amber-ink', red: 'bg-tone-red-soft text-tone-red-ink',
  teal: 'bg-tone-teal-soft text-tone-teal-ink', blue: 'bg-tone-blue-soft text-tone-blue-ink', grey: 'bg-tone-grey-soft text-tone-grey-ink',
}

export function Brand({ inverse, compact, className }: { inverse?: boolean; compact?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-base font-semibold tracking-tight', inverse ? 'text-brand-navy-foreground' : 'text-foreground', className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Store className="size-4.5" aria-hidden />
      </span>
      <span className={cn(compact && 'sr-only')}>FeriStock</span>
    </span>
  )
}

export function StatusPill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap', PILL[tone], className)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', DOT[tone])} />
      {children}
    </span>
  )
}

export function PageHeader({ title, subtitle, back, pills, actions }: {
  title: string
  subtitle?: ReactNode
  back?: { href: string; label: string }
  pills?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="no-print flex flex-col gap-3">
      {back && (
        <Link href={back.href} className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
            {pills}
          </div>
          {subtitle && <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function Panel({ title, subtitle, action, children, className, bodyClassName }: {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-xl border bg-card', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button variant="ghost" nativeButton={false} render={<Link href={href} />} className="shrink-0">
      {children}
    </Button>
  )
}

export function Stat({ label, value, hint, icon: Icon, tone = 'blue' }: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; tone?: Tone }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', SOFT[tone])}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

/** Quantity control: the buttons step by one, the field takes a typed number on blur or Enter. */
export function Stepper({ value, onChange, label, min = 0, max = 99_999, disabled }: {
  value: number
  onChange: (next: number) => void
  label: string
  min?: number
  max?: number
  disabled?: boolean
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  const commit = () => {
    const next = Math.min(max, Math.max(min, Math.round(Number(draft))))
    if (Number.isFinite(next) && next !== value) onChange(next)
    else setDraft(String(value))
  }
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={`${label} quantity`}>
      <Button variant="outline" size="icon" disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        <Minus aria-hidden />
        <span className="sr-only">{`Decrease ${label} quantity`}</span>
      </Button>
      <input
        className="h-8 w-12 rounded-lg border border-transparent bg-transparent text-center text-sm font-semibold tabular-nums outline-none hover:border-border focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50 max-md:h-11 max-md:text-base"
        inputMode="numeric"
        aria-label={`${label} quantity`}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur()
        }}
      />
      <Button variant="outline" size="icon" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        <Plus aria-hidden />
        <span className="sr-only">{`Increase ${label} quantity`}</span>
      </Button>
    </div>
  )
}

export function Chips<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (next: T) => void
  label: string
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-11',
              active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground')}>{group(o.count)}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-sm font-semibold">{title}</p>
        {text && <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{text}</p>}
      </div>
      {action}
    </div>
  )
}

export function Field({ label, hint, error, children, className, htmlFor }: {
  label: ReactNode
  hint?: ReactNode
  error?: string
  children: ReactNode
  className?: string
  htmlFor?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)} data-invalid={error ? '' : undefined}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p role="alert" className="text-xs font-medium text-destructive">{error}</p> : hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function Meta({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold break-words">{children}</dd>
    </div>
  )
}

/** A button for async work: disabled with a spinner until the returned promise settles. */
export function AsyncButton({ onClick, children, disabled, ...props }: Omit<ComponentProps<typeof Button>, 'onClick'> & { onClick: () => Promise<unknown> | unknown }) {
  const [busy, setBusy] = useState(false)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])
  return (
    <Button
      {...props}
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true)
        try {
          await onClick()
        } finally {
          if (alive.current) setBusy(false)
        }
      }}
    >
      {busy && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  )
}

export function Modal({ open, onOpenChange, title, description, children, footer, wide }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-h-[92dvh] gap-0 overflow-y-auto p-0', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <DialogHeader className="p-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>
        {footer && <DialogFooter className="sticky bottom-0 m-0 rounded-b-xl border-t bg-muted/50 p-3">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

interface ConfirmOptions {
  title: string
  text?: ReactNode
  action: string
  destructive?: boolean
}

/** `const [confirm, dialog] = useConfirm()`; render `dialog`, then `if (await confirm({...}))`. */
export function useConfirm() {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })), [])
  const settle = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }
  const dialog = (
    <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open) settle(false) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
          {pending?.text && <AlertDialogDescription>{pending.text}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={pending?.destructive ? 'destructive' : 'default'} onClick={() => settle(true)}>{pending?.action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
  return [confirm, dialog] as const
}

export function SearchInput({ value, onChange, placeholder, label, className }: { value: string; onChange: (v: string) => void; placeholder: string; label?: string; className?: string }) {
  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label ?? placeholder} className="bg-card pl-8" />
    </div>
  )
}

/** Horizontal ranking bars: the widest row is the largest value. */
export function BarList({ rows, format = rs, empty = 'Nothing to show for this period yet.' }: { rows: { label: string; value: number }[]; format?: (n: number) => string; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (rows.length === 0) return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="flex flex-col gap-3 p-4">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{format(r.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Shrinks a chosen photo in the browser so uploads stay small on a phone connection. */
export function fileToDataUrl(file: File, maxSide = 1100): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Choose an image file (JPG, PNG or WebP).'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That image could not be read. Try another photo.'))
    }
    img.src = url
  })
}

export function ImagePicker({ value, onChange, label, alt, onError }: { value?: string | null; onChange: (dataUrl: string | null) => void; label: string; alt: string; onError: (message: string) => void }) {
  const id = useId()
  return (
    <div className="flex flex-wrap items-center gap-3">
      {value && <img src={value} alt={alt} className="size-16 rounded-lg border object-cover" />}
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          try {
            onChange(await fileToDataUrl(file))
          } catch (error) {
            onError(error instanceof Error ? error.message : 'That image could not be read.')
          }
        }}
      />
      <Button variant="outline" nativeButton={false} render={<label htmlFor={id} />} className="cursor-pointer">
        <ImagePlus data-icon="inline-start" aria-hidden />
        {value ? 'Change photo' : label}
      </Button>
      {value && (
        <Button variant="ghost" onClick={() => onChange(null)}>
          <X data-icon="inline-start" aria-hidden />
          Remove
        </Button>
      )}
    </div>
  )
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function AppFooter({ demo = true }: { demo?: boolean }) {
  return (
    <footer className="no-print mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-xs text-muted-foreground">
      <p>© 2026 FeriStock</p>
      <p className="flex flex-wrap items-center gap-3">
        {demo && <StatusPill tone="amber">Demo data</StatusPill>}
        <span>Prototype by FastTech Nepal</span>
      </p>
    </footer>
  )
}
