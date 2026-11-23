import { redirect } from 'next/navigation'
import { Shell } from '@/components/shell'
import { getCtx } from '@/lib/server/auth'
import { buildState } from '@/lib/server/view'

export default async function RetailerLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx('retailer')
  if (!ctx) redirect('/login')
  // A supplier-only business has no retailer workspace to show.
  if (ctx.ws !== 'retailer') redirect('/supplier')
  return <Shell initial={buildState(ctx)}>{children}</Shell>
}
