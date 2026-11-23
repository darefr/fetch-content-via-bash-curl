'use client'

import { LoaderCircle, Play } from 'lucide-react'
import { useState } from 'react'
import { ctaClass, type CtaVariant } from './parts'

/** Signs the visitor into the sample shop in one tap, so the product can be tried before signing up. */
export function DemoButton({ variant = 'ghost', className }: { variant?: CtaVariant; className?: string }) {
  const [busy, setBusy] = useState(false)

  const open = async () => {
    setBusy(true)
    try {
      const response = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'auth.demo', input: { role: 'retailer' } }),
      })
      const body = await response.json()
      if (!response.ok || !body?.ok) throw new Error('Demo sign-in was refused.')
      window.location.assign(body.result.home)
    } catch {
      // The sign-in page lists every demo account and explains what went wrong.
      window.location.assign('/login')
    }
  }

  return (
    <button type="button" onClick={open} disabled={busy} className={ctaClass(variant, className)}>
      {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <Play aria-hidden />}
      {busy ? 'Opening the demo shop' : 'Open a demo shop'}
    </button>
  )
}
