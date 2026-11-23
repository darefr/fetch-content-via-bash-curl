import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Shell } from '@/components/shell'
import { getCtx } from '@/lib/server/auth'
import { buildState } from '@/lib/server/view'

export const metadata: Metadata = { title: 'Supplier workspace' }

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx('supplier')
  if (!ctx) redirect('/login')
  // A retailer-only business has no supplier workspace to show.
  if (ctx.ws !== 'supplier') redirect('/retailer')
  return <Shell initial={buildState(ctx)}>{children}</Shell>
}
