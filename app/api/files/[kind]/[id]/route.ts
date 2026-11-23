import { getCtx } from '@/lib/server/auth'
import { db } from '@/lib/server/db'

/** Payment proofs, bilti photos and supplier QR codes, readable only by the businesses involved. */
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  const ctx = await getCtx()
  if (!ctx) return new Response('Sign in to view this file.', { status: 401 })

  const store = db()
  const me = ctx.org.id
  const partyTo = (orderId?: string) => {
    const order = store.orders.find((o) => o.id === orderId)
    return Boolean(order && (order.retailerId === me || order.supplierId === me))
  }
  const allowed =
    kind === 'proof' ? partyTo(store.payments.find((p) => p.id === id)?.orderId)
    : kind === 'bilti' ? partyTo(store.shipments.find((s) => s.id === id)?.orderId)
    : kind === 'qr' ? id === me || store.links.some((l) => l.retailerId === me && l.supplierId === id)
    : false
  const data = allowed ? store.files[`${kind}:${id}`] : undefined
  const match = data?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/)
  if (!match) return new Response('File not found.', { status: 404 })

  return new Response(Buffer.from(match[2], 'base64'), {
    headers: { 'Content-Type': match[1], 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' },
  })
}
