import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import { fmtDate, fmtDateTime, group } from '@/lib/format'
import { getCtx } from '@/lib/server/auth'
import { db } from '@/lib/server/db'
import { METHOD_LABEL, MODE_LABEL } from '@/lib/types'

const NAVY = rgb(0.055, 0.114, 0.29)
const INK = rgb(0.055, 0.09, 0.176)
const MUTED = rgb(0.294, 0.337, 0.412)
const LINE = rgb(0.847, 0.875, 0.914)
const WHITE = rgb(1, 1, 1)

// The built-in PDF fonts cover basic Latin only, so anything else is replaced before drawing.
function ascii(value: string) {
  return value.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—·]/g, '-').replace(/[^\x20-\x7E]/g, '').trim()
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getCtx()
  if (!ctx) return new Response('Sign in to download this receipt.', { status: 401 })

  const store = db()
  const receipt = store.receipts.find((r) => r.id === id)
  const order = receipt && store.orders.find((o) => o.id === receipt.orderId)
  if (!receipt || !order || (order.retailerId !== ctx.org.id && order.supplierId !== ctx.org.id)) return new Response('Receipt not found.', { status: 404 })
  const supplier = store.orgs.find((o) => o.id === order.supplierId)
  const retailer = store.orgs.find((o) => o.id === order.retailerId)
  const shipment = store.shipments.find((s) => s.orderId === order.id)

  const pdf = await PDFDocument.create()
  pdf.setTitle(`FeriStock receipt ${receipt.no}`)
  const page = pdf.addPage([595, 842])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const draw = (p: PDFPage, value: string, x: number, y: number, size = 10, font: PDFFont = regular, color = INK) =>
    p.drawText(ascii(value), { x, y, size, font, color })
  const right = (value: string, x: number, y: number, size = 10, font: PDFFont = regular, color = INK) =>
    draw(page, value, x - font.widthOfTextAtSize(ascii(value), size), y, size, font, color)
  const rule = (y: number) => page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.7, color: LINE })

  page.drawRectangle({ x: 0, y: 752, width: 595, height: 90, color: NAVY })
  draw(page, 'FeriStock', 40, 800, 20, bold, WHITE)
  draw(page, 'Order & Payment Receipt', 40, 780, 11, regular, WHITE)
  right(receipt.no, 555, 800, 14, bold, WHITE)
  right(fmtDateTime(receipt.issuedAt), 555, 780, 10, regular, WHITE)

  let y = 722
  const party = (title: string, org: typeof supplier, x: number) => {
    draw(page, title, x, y, 8, bold, MUTED)
    draw(page, org?.name ?? '-', x, y - 16, 12, bold)
    draw(page, `PAN / VAT ${org?.pan ?? '-'}`, x, y - 31)
    draw(page, `${org?.address ?? ''}, ${org?.city ?? ''}`, x, y - 45, 10, regular, MUTED)
    draw(page, org?.phone ?? '', x, y - 59, 10, regular, MUTED)
  }
  party('SOLD BY (SUPPLIER)', supplier, 40)
  party('SOLD TO (RETAILER)', retailer, 310)

  y -= 86
  rule(y)
  y -= 16
  draw(page, 'Item', 40, y, 9, bold, MUTED)
  right('Qty', 370, y, 9, bold, MUTED)
  right('Rate', 455, y, 9, bold, MUTED)
  right('Amount', 555, y, 9, bold, MUTED)
  y -= 8
  rule(y)
  for (const line of order.lines) {
    y -= 18
    draw(page, line.name.slice(0, 52), 40, y, 10)
    draw(page, line.sku, 40, y - 11, 8, regular, MUTED)
    right(`${line.qty} ${line.unit}`, 370, y)
    right(`Rs ${group(line.price)}`, 455, y)
    right(`Rs ${group(line.amount)}`, 555, y)
    y -= 16
    rule(y)
  }
  y -= 20
  draw(page, 'Order total', 40, y, 11, bold)
  right(`Rs ${group(order.total)}`, 555, y, 12, bold)
  if (receipt.amount !== order.total) {
    y -= 16
    draw(page, receipt.paid ? 'Paid on this receipt' : 'Amount due', 40, y, 10, regular, MUTED)
    right(`Rs ${group(receipt.amount)}`, 555, y, 10, bold)
  }
  y -= 12
  rule(y)

  y -= 22
  draw(page, 'PAYMENT', 40, y, 8, bold, MUTED)
  draw(page, 'DELIVERY', 310, y, 8, bold, MUTED)
  const rows: [string, string][] = [
    ['Status', receipt.paid ? 'PAID' : 'Payment pending'],
    ['Method', receipt.method ? METHOD_LABEL[receipt.method] : 'Not chosen yet'],
    ['Reference', receipt.ref ?? '-'],
    ['Order', order.no],
  ]
  const delivery: [string, string][] = shipment
    ? [
        ['Mode', MODE_LABEL[shipment.mode]],
        ['Carrier / ref', [shipment.carrier, shipment.ref].filter(Boolean).join(' - ') || '-'],
        ['Dispatched', fmtDate(shipment.dispatchedAt)],
        ['Delivered', shipment.deliveredAt ? fmtDate(shipment.deliveredAt) : 'Not yet'],
      ]
    : [['Status', 'Not dispatched yet']]
  rows.forEach(([label, value], i) => {
    draw(page, label, 40, y - 16 - i * 15, 9, regular, MUTED)
    draw(page, value, 110, y - 16 - i * 15, 10, bold)
  })
  delivery.forEach(([label, value], i) => {
    draw(page, label, 310, y - 16 - i * 15, 9, regular, MUTED)
    draw(page, value.slice(0, 38), 385, y - 16 - i * 15, 10, bold)
  })

  y -= 96
  rule(y)
  draw(page, 'Paid by the retailer directly to the supplier. FeriStock does not hold or move any money.', 40, y - 16, 8, regular, MUTED)
  draw(page, 'This receipt is generated from the order record and cannot be edited.', 40, y - 28, 8, regular, MUTED)

  const bytes = await pdf.save()
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="FeriStock-${receipt.no}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
