import { actions, publicActions } from '@/lib/server/actions'
import { getCtx } from '@/lib/server/auth'
import { ActionError, type Input } from '@/lib/server/core'
import { save } from '@/lib/server/db'

const MAX_BODY_CHARS = 3_000_000

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  // A JSON content type cannot be sent by a plain cross-site form, and browsers preflight it.
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Unsupported request.' }, 415)
  if (process.env.NODE_ENV === 'production') {
    const origin = request.headers.get('origin')
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
    if (origin && new URL(origin).host !== host) return json({ error: 'Request blocked.' }, 403)
  }

  const raw = await request.text()
  if (raw.length > MAX_BODY_CHARS) return json({ error: 'That upload is too large.' }, 413)
  let body: { action?: unknown; input?: unknown; ws?: unknown }
  try {
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'Unsupported request.' }, 400)
  }
  const name = typeof body.action === 'string' ? body.action : ''
  const input = (body.input && typeof body.input === 'object' ? body.input : {}) as Input

  try {
    if (Object.hasOwn(publicActions, name)) {
      const result = await publicActions[name](input)
      save()
      return json({ ok: true, result: result ?? null })
    }
    // hasOwn keeps inherited keys such as "constructor" from being called as actions.
    if (!Object.hasOwn(actions, name)) return json({ error: 'Unknown action.' }, 404)
    const ctx = await getCtx(body.ws === 'supplier' || body.ws === 'retailer' ? body.ws : undefined)
    if (!ctx) return json({ error: 'Your session has ended. Sign in again.', code: 'auth' }, 401)
    const result = await actions[name](ctx, input)
    save()
    return json({ ok: true, result: result ?? null })
  } catch (error) {
    if (error instanceof ActionError) return json({ error: error.message, field: error.field }, error.status)
    console.error(`[feristock] Action "${name}" failed:`, error)
    return json({ error: 'Something went wrong on our side. Try again.' }, 500)
  }
}
