'use client'

import { Boxes, ChartColumn, ClipboardList, Download, ReceiptText, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { MonthBars, monthlyTotals } from '@/components/charts'
import { BarList, Chips, downloadCsv, PageHeader, Panel, Stat } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/client'
import { fmtDate, rs } from '@/lib/format'
import { MOVE_LABEL, ORDER_LABEL, partnerName, rank, sumBy } from '@/lib/logic'
import { METHOD_LABEL } from '@/lib/types'

const PERIODS = [{ value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }, { value: '180', label: 'Last 6 months' }, { value: '365', label: 'Last 12 months' }] as const
type Period = (typeof PERIODS)[number]['value']

export function ReportsView() {
  const s = useApp()
  const retail = s.ws === 'retailer'
  const [period, setPeriod] = useState<Period>('90')
  const label = PERIODS.find((p) => p.value === period)!.label
  const since = Date.parse(s.now) - Number(period) * 86_400_000
  const inPeriod = (iso: string) => Date.parse(iso) >= since

  const all = s.orders.filter((o) => inPeriod(o.createdAt))
  const orders = all.filter((o) => o.status !== 'rejected' && o.status !== 'cancelled')
  const value = sumBy(orders, (o) => o.total)
  const lines = orders.flatMap((o) => o.lines)
  const categoryOf = (productId?: string, sku?: string) => s.products.find((p) => p.id === productId)?.category ?? s.items.find((i) => i.sku === sku)?.category ?? 'Other'
  const payments = s.payments.filter((p) => p.status === 'verified' && inPeriod(p.verifiedAt ?? p.createdAt))
  const stockValue = sumBy(s.items, (i) => i.qty * i.cost)
  const decided = all.filter((o) => o.status !== 'pending' && o.status !== 'cancelled')
  const accepted = decided.filter((o) => o.status !== 'rejected').length
  const costOf = (itemId: string) => s.items.find((i) => i.id === itemId)?.cost ?? 0
  const losses = s.movements.filter((m) => inPeriod(m.at) && (m.type === 'damaged' || m.type === 'expired' || m.type === 'removed'))
  const other = (o: (typeof orders)[number]) => partnerName(s, retail ? o.supplierId : o.retailerId)

  const exportOrders = () => downloadCsv(`feristock-${retail ? 'purchases' : 'sales'}.csv`, [
    ['Order', 'Date', retail ? 'Supplier' : 'Retailer', 'Item', 'SKU', 'Quantity', 'Unit', 'Rate', 'Amount', 'Status'],
    ...orders.flatMap((o) => o.lines.map((l) => [o.no, fmtDate(o.createdAt), other(o), l.name, l.sku, l.qty, l.unit, l.price, l.amount, ORDER_LABEL[o.status]])),
  ])
  const exportStock = () => downloadCsv('feristock-stock-valuation.csv', [
    ['Item', 'SKU', 'Category', 'Quantity', 'Unit', 'Cost', 'Value'],
    ...s.items.map((i) => [i.name, i.sku, i.category, i.qty, i.unit, i.cost, i.qty * i.cost]),
  ])

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={retail ? 'What you bought, from whom, and what your stock is worth.' : 'What you sold, to whom, and how orders are moving.'}
        actions={
          <>
            {retail && <Button variant="outline" size="lg" onClick={exportStock}><Download data-icon="inline-start" aria-hidden />Stock valuation</Button>}
            <Button variant="outline" size="lg" onClick={exportOrders}><Download data-icon="inline-start" aria-hidden />{retail ? 'Purchases CSV' : 'Sales CSV'}</Button>
          </>
        }
      />
      <Chips label="Report period" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p.value, label: p.label }))} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={retail ? 'Purchases' : 'Sales'} value={rs(value)} icon={ChartColumn} tone="blue" hint={label} />
        <Stat label="Orders" value={orders.length} icon={ClipboardList} tone="grey" hint={`${orders.filter((o) => o.status === 'delivered').length} delivered`} />
        <Stat label="Average order" value={rs(orders.length ? value / orders.length : 0)} icon={ReceiptText} tone="teal" hint="Per order" />
        {retail
          ? <Stat label="Stock value now" value={rs(stockValue)} icon={Boxes} tone="green" hint={`${s.items.length} items at cost`} />
          : <Stat label="Orders accepted" value={decided.length ? `${Math.round((accepted / decided.length) * 100)}%` : 'No orders'} icon={ThumbsUp} tone="green" hint={`${accepted} of ${decided.length} decided`} />}
      </div>

      <Panel title={retail ? 'Purchases by month' : 'Sales by month'} subtitle="Order value, last 6 months">
        <div className="px-2 py-3">
          <MonthBars data={monthlyTotals(s.orders, s.now)} label={retail ? 'Purchases' : 'Sales'} className="h-64 w-full" />
        </div>
      </Panel>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel title={retail ? 'Spend by supplier' : 'Sales by retailer'} subtitle={label}>
          <BarList rows={rank(orders, other, (o) => o.total)} />
        </Panel>
        <Panel title={retail ? 'Top items by spend' : 'Top products by sales'} subtitle={label}>
          <BarList rows={rank(lines, (l) => l.name, (l) => l.amount)} />
        </Panel>
        <Panel title={retail ? 'Spend by category' : 'Sales by category'} subtitle={label}>
          <BarList rows={rank(lines, (l) => categoryOf(l.productId, l.sku), (l) => l.amount, 10)} />
        </Panel>
        <Panel title="Payment methods" subtitle="Verified payments in this period">
          <BarList rows={rank(payments, (p) => METHOD_LABEL[p.method], (p) => p.amount)} empty="No verified payments in this period." />
        </Panel>
        {retail ? (
          <>
            <Panel title="Stock value by category" subtitle="What is on your shelves now, at cost">
              <BarList rows={rank(s.items, (i) => i.category, (i) => i.qty * i.cost, 10)} empty="Add stock items to see their value." />
            </Panel>
            <Panel title="Stock losses" subtitle="Damaged, expired and removed goods at cost">
              <BarList rows={rank(losses, (m) => MOVE_LABEL[m.type], (m) => -m.delta * costOf(m.itemId))} empty="No losses recorded in this period." />
            </Panel>
          </>
        ) : (
          <Panel title="Orders by status" subtitle={label}>
            <BarList rows={rank(all, (o) => ORDER_LABEL[o.status], () => 1, 7)} format={(n) => `${n} ${n === 1 ? 'order' : 'orders'}`} />
          </Panel>
        )}
      </div>
    </>
  )
}
