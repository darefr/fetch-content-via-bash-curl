import { Landing } from '@/components/landing'
import { getCtx, homeFor } from '@/lib/server/auth'

export default async function HomePage() {
  const ctx = await getCtx()
  return <Landing home={ctx ? homeFor(ctx.ws) : undefined} />
}
