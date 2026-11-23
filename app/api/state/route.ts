import { getCtx } from '@/lib/server/auth'
import { buildState } from '@/lib/server/view'

export async function GET(request: Request) {
  const wanted = new URL(request.url).searchParams.get('ws')
  const ctx = await getCtx(wanted === 'supplier' || wanted === 'retailer' ? wanted : undefined)
  const headers = { 'Cache-Control': 'no-store' }
  if (!ctx) return Response.json({ error: 'Your session has ended. Sign in again.', code: 'auth' }, { status: 401, headers })
  return Response.json(buildState(ctx), { headers })
}
