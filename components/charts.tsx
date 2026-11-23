'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { compact, lastMonths, monthKey, monthLabel, rs } from '@/lib/format'
import type { Order } from '@/lib/types'

/** Order value per Kathmandu calendar month, oldest first, for the months ending now. */
export function monthlyTotals(orders: Order[], now: string, months = 6) {
  const keys = lastMonths(months, now)
  const totals = new Map(keys.map((k) => [k, 0]))
  for (const o of orders) {
    if (o.status === 'rejected' || o.status === 'cancelled') continue
    const key = monthKey(o.createdAt)
    if (totals.has(key)) totals.set(key, totals.get(key)! + o.total)
  }
  return keys.map((key) => ({ month: monthLabel(key), value: totals.get(key)! }))
}

export function MonthBars({ data, label, className = 'h-56 w-full' }: { data: { month: string; value: number }[]; label: string; className?: string }) {
  const config = { value: { label, color: 'var(--chart-1)' } } satisfies ChartConfig
  return (
    <ChartContainer config={config} className={className}>
      <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => compact(v)} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{`${label}, ${item.payload.month}`}</span>
                  <span className="font-semibold tabular-nums">{rs(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        {/* Drawn without the entrance animation so the bars are there on first paint. */}
        <Bar dataKey="value" fill="var(--color-value)" radius={4} isAnimationActive={false} maxBarSize={44} />
      </BarChart>
    </ChartContainer>
  )
}
