'use client'

import { ArrowRight, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Brand } from '@/components/brand'
import { ctaClass } from './parts'

const NAV = [
  { href: '#workspaces', label: 'Who it is for' },
  { href: '#flow', label: 'Order flow' },
  { href: '#tools', label: 'Shop tools' },
  { href: '#payments', label: 'Payments' },
  { href: '#faq', label: 'Questions' },
]

export function SiteHeader({ home }: { home?: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="sticky top-0 z-30 border-b border-brand-navy-foreground/10 bg-brand-navy text-brand-navy-foreground">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-5 sm:px-8">
        <Link href="/" aria-label="FeriStock home" className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring">
          <Brand inverse className="text-lg" />
        </Link>
        <nav aria-label="Sections" className="ml-8 hidden items-center gap-7 text-sm font-medium text-brand-navy-foreground/75 lg:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="rounded-md outline-none transition-colors hover:text-brand-navy-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {home ? (
            <Link href={home} className={ctaClass('light', 'h-10 px-5 text-sm')}>
              Open workspace
              <ArrowRight aria-hidden />
            </Link>
          ) : (
            <>
              <Link href="/login" className={ctaClass('ghost', 'h-10 border-transparent px-4 text-sm max-sm:hidden')}>Sign in</Link>
              <Link href="/register" className={ctaClass('light', 'h-10 px-5 text-sm max-sm:hidden')}>Create account</Link>
              <Link href="/login" className={ctaClass('light', 'h-10 px-5 text-sm sm:hidden')}>Sign in</Link>
            </>
          )}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 place-items-center rounded-full outline-none transition-colors hover:bg-brand-navy-foreground/10 focus-visible:ring-3 focus-visible:ring-sidebar-ring lg:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>
      {open && (
        <div id="site-menu" className="border-t border-brand-navy-foreground/10 bg-brand-navy lg:hidden">
          <nav aria-label="Sections" className="mx-auto flex max-w-7xl flex-col px-3 py-3 sm:px-6">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex h-12 items-center rounded-xl px-3 text-base font-medium outline-none hover:bg-brand-navy-foreground/10 focus-visible:ring-3 focus-visible:ring-sidebar-ring"
              >
                {item.label}
              </a>
            ))}
            {!home && (
              <div className="flex flex-col gap-2 px-2 pt-3 pb-2">
                <Link href="/register" className={ctaClass('light')}>
                  Create account
                  <ArrowRight aria-hidden />
                </Link>
                <Link href="/login" className={ctaClass('ghost')}>Sign in</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
