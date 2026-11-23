import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const CTA = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/60',
  outline: 'border bg-card text-foreground hover:bg-muted focus-visible:ring-ring/60',
  light: 'bg-card text-brand-navy hover:bg-sky focus-visible:ring-sidebar-ring',
  ghost: 'border border-brand-navy-foreground/25 text-brand-navy-foreground hover:bg-brand-navy-foreground/10 focus-visible:ring-sidebar-ring',
}

export type CtaVariant = keyof typeof CTA

export function ctaClass(variant: CtaVariant, className?: string) {
  return cn(
    'inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-3 disabled:opacity-70 [&_svg]:size-4.5 [&_svg]:shrink-0',
    CTA[variant],
    className,
  )
}

export function Cta({ href, variant = 'primary', className, children }: { href: string; variant?: CtaVariant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={ctaClass(variant, className)}>
      {children}
    </Link>
  )
}

export function SectionHeading({ eyebrow, title, text, inverse, className }: { eyebrow: string; title: string; text?: string; inverse?: boolean; className?: string }) {
  return (
    <div className={cn('reveal flex max-w-3xl flex-col gap-4', className)}>
      <p className={cn('text-sm font-semibold tracking-widest uppercase', inverse ? 'text-marigold' : 'text-primary')}>{eyebrow}</p>
      <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">{title}</h2>
      {text && <p className={cn('text-lg leading-relaxed text-pretty', inverse ? 'text-brand-navy-foreground/75' : 'text-muted-foreground')}>{text}</p>}
    </div>
  )
}
