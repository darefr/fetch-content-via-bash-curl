import { Store } from 'lucide-react'
import type { ReactNode } from 'react'
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
