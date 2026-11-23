import { ArrowLeftRight, Barcode, CalendarX2, ChartColumn, HandCoins, QrCode, ReceiptText, ShieldCheck, Undo2, Users, Wallet, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { StatusPill } from '@/components/brand'
import { rs } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SectionHeading } from './parts'

function Row({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2 text-sm shadow-soft">{children}</div>
}

function Avatar({ children }: { children: ReactNode }) {
  return <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-navy text-xs font-semibold text-brand-navy-foreground">{children}</span>
}

const REPORT_BARS = [
  { month: 'Jun', height: 38 },
  { month: 'Jul', height: 52 },
  { month: 'Aug', height: 46 },
  { month: 'Sep', height: 68 },
  { month: 'Oct', height: 60 },
  { month: 'Nov', height: 86 },
]

const TOOLS: { icon: LucideIcon; title: string; text: string; preview: ReactNode }[] = [
  {
    icon: ArrowLeftRight,
    title: 'Stock movements',
    text: 'Record sales, damage and counts. Every change is kept with who did it and when.',
    preview: (
      <>
        <Row>
          <span className="truncate font-medium">Wai Wai noodles</span>
          <span className="shrink-0 font-semibold text-tone-red-ink">-3 sold</span>
        </Row>
        <Row>
          <span className="truncate font-medium">Basmati rice 25 kg</span>
          <span className="shrink-0 font-semibold text-tone-green-ink">+10 received</span>
        </Row>
      </>
    ),
  },
  {
    icon: CalendarX2,
    title: 'Expiry tracker',
    text: 'See what expires this month before it turns into a loss.',
    preview: (
      <>
        <Row>
          <span className="truncate font-medium">Local eggs (crate of 30)</span>
          <StatusPill tone="amber">9 days left</StatusPill>
        </Row>
        <Row>
          <span className="truncate font-medium">Cream biscuits assorted</span>
          <StatusPill tone="red">Expired</StatusPill>
        </Row>
      </>
    ),
  },
  {
    icon: Barcode,
    title: 'Barcode and QR labels',
    text: 'Print shelf labels for any item straight from the browser.',
    preview: (
      <div className="mx-auto flex w-48 flex-col gap-1.5 rounded-xl bg-card p-3 shadow-soft">
        <p className="text-sm font-semibold">Wai Wai noodles</p>
        <div className="h-9 bg-[repeating-linear-gradient(90deg,var(--foreground)_0_2px,transparent_2px_4px,var(--foreground)_4px_5px,transparent_5px_9px)]" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>ST-NDL-01</span>
          <span className="font-semibold text-foreground">Carton of 30</span>
        </div>
      </div>
    ),
  },
  {
    icon: Undo2,
    title: 'Returns',
    text: 'Send back damaged or expired goods and get the credit agreed in writing.',
    preview: (
      <>
        <Row>
          <span className="truncate font-medium">2 cartons damaged</span>
          <StatusPill tone="green">Credit agreed</StatusPill>
        </Row>
        <Row>
          <span className="text-muted-foreground">Credit from supplier</span>
          <span className="shrink-0 font-semibold tabular-nums">{rs(1130)}</span>
        </Row>
      </>
    ),
  },
  {
    icon: ChartColumn,
    title: 'Reports',
    text: 'Monthly purchases, top items and stock value, with CSV export.',
    preview: (
      <div className="flex h-full gap-2 rounded-xl bg-card px-3 pt-3 pb-2 shadow-soft">
        {REPORT_BARS.map((bar, i) => (
          <div key={bar.month} className="flex flex-1 flex-col gap-1">
            <div className="flex flex-1 items-end">
              <span className={cn('w-full rounded-t-md', i === REPORT_BARS.length - 1 ? 'bg-primary' : 'bg-primary/25')} style={{ height: `${bar.height}%` }} />
            </div>
            <span className="text-center text-xs text-muted-foreground">{bar.month}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Users,
    title: 'Team logins',
    text: 'Give staff their own login. Owners keep control of money and settings.',
    preview: (
      <>
        <Row>
          <span className="flex min-w-0 items-center gap-2">
            <Avatar>RB</Avatar>
            <span className="truncate font-medium">Ram Bahadur Thapa</span>
          </span>
          <StatusPill tone="blue">Owner</StatusPill>
        </Row>
        <Row>
          <span className="flex min-w-0 items-center gap-2">
            <Avatar>BT</Avatar>
            <span className="truncate font-medium">Bikash Thapa</span>
          </span>
          <StatusPill tone="grey">Staff</StatusPill>
        </Row>
      </>
    ),
  },
]

export function ShopTools() {
  return (
    <section id="tools" className="scroll-mt-16 border-y bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
        <SectionHeading
          eyebrow="Shop tools"
          title="The everyday tools of a shop, built in"
          text="The parts of a store system that help with restocking, without turning FeriStock into a billing counter."
        />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <li key={tool.title} className="reveal flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-soft">
              <div aria-hidden className="flex h-36 flex-col justify-center gap-2 rounded-2xl bg-muted p-4">
                {tool.preview}
              </div>
              <div className="flex gap-4 px-1 pb-1">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky text-sky-foreground">
                  <tool.icon className="size-5" aria-hidden />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">{tool.title}</h3>
                  <p className="leading-relaxed text-muted-foreground">{tool.text}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">The previews on these cards use sample data.</p>
      </div>
    </section>
  )
}

const METHODS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Wallet, title: 'eSewa', text: "Paid to the supplier's own merchant account." },
  { icon: Wallet, title: 'Khalti', text: "Paid to the supplier's own merchant account." },
  { icon: QrCode, title: 'QR / Bank transfer', text: 'The retailer uploads proof and the supplier confirms it.' },
  { icon: HandCoins, title: 'Udharo (उधारो)', text: 'Credit with a due date, settled later.' },
]

const RECEIPT_LINES = [
  { name: 'Wai Wai noodles (carton of 30)', qty: 10, amount: 5650 },
  { name: 'Basmati rice 25 kg', qty: 3, amount: 9450 },
]

function ReceiptSample() {
  const total = RECEIPT_LINES.reduce((sum, line) => sum + line.amount, 0)
  return (
    <figure className="reveal rounded-3xl bg-card p-6 text-foreground shadow-lift sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{'Order & Payment Receipt'}</p>
          <p className="text-sm text-muted-foreground">FS-1042 · 21 Nov 2026</p>
        </div>
        <StatusPill tone="green">Paid</StatusPill>
      </div>
      <dl className="mt-6 grid gap-4 border-y py-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Supplier</dt>
          <dd className="mt-1 font-semibold">Sita Traders, Butwal</dd>
          <dd className="text-sm text-muted-foreground">PAN 600123456</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Retailer</dt>
          <dd className="mt-1 font-semibold">Ram Kirana, Butwal</dd>
          <dd className="text-sm text-muted-foreground">PAN 301245678</dd>
        </div>
      </dl>
      <table className="mt-5 w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th scope="col" className="pb-2 font-medium">Item</th>
            <th scope="col" className="pb-2 text-right font-medium">Qty</th>
            <th scope="col" className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {RECEIPT_LINES.map((line) => (
            <tr key={line.name} className="border-t">
              <td className="py-2.5 pr-3">{line.name}</td>
              <td className="py-2.5 text-right tabular-nums">{line.qty}</td>
              <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">{rs(line.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t">
            <th scope="row" colSpan={2} className="pt-3 text-left text-base font-semibold">Total</th>
            <td className="pt-3 text-right text-base font-semibold tabular-nums whitespace-nowrap">{rs(total)}</td>
          </tr>
        </tfoot>
      </table>
      <figcaption className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm">
        <span className="font-medium">Paid by eSewa · Ref 0007XK2</span>
        <span className="text-muted-foreground">Sample receipt</span>
      </figcaption>
    </figure>
  )
}

export function Payments() {
  return (
    <section id="payments" className="scroll-mt-16 bg-brand-navy text-brand-navy-foreground">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-28">
        <div className="flex flex-col gap-10">
          <SectionHeading
            inverse
            eyebrow="Payments"
            title="Money goes straight to the supplier"
            text="FeriStock is non-custodial. It never holds funds: the buyer pays the supplier directly, every time."
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {METHODS.map((method) => (
              <li key={method.title} className="reveal flex gap-4 rounded-2xl border border-sidebar-border bg-sidebar-accent p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-navy">
                  <method.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold">{method.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-brand-navy-foreground/75">{method.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-8">
          <ReceiptSample />
          <ul className="flex flex-col gap-4 text-brand-navy-foreground/85">
            <li className="flex gap-3 leading-relaxed">
              <ShieldCheck className="mt-1 size-5 shrink-0 text-marigold" aria-hidden />
              A wallet payment is marked Paid only after server-side verification of its status and the exact NPR amount.
            </li>
            <li className="flex gap-3 leading-relaxed">
              <ReceiptText className="mt-1 size-5 shrink-0 text-marigold" aria-hidden />
              {'Every paid or confirmed order gets an Order & Payment Receipt with both PAN/VAT numbers, itemized SKUs and the payment reference.'}
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
