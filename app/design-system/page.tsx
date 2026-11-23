import { ArrowLeft, Plus, ShoppingCart } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { FigureSamples } from '@/components/design-samples'
import { AppFooter, Brand, Panel, StatusPill } from '@/components/kit'
import { Button } from '@/components/ui/button'
import type { Tone } from '@/lib/logic'

export const metadata: Metadata = { title: 'Design system' }

const COLORS: [string, string, string][] = [
  ['Background', 'bg-background', '#f2f6fb'],
  ['Card', 'bg-card', '#ffffff'],
  ['Primary', 'bg-primary', '#134ac5'],
  ['Brand navy', 'bg-brand-navy', '#0e1d4a'],
  ['Sky', 'bg-sky', '#d9e9ff'],
  ['Muted', 'bg-muted', '#ecf0f8'],
  ['Border', 'bg-border', '#d8dfe9'],
  ['Destructive', 'bg-destructive', '#c90d23'],
]

const STATUSES: [string, [string, Tone][]][] = [
  ['Stock', [['OK', 'green'], ['Low Stock', 'amber'], ['Out of Stock', 'red']]],
  ['Order stages', [['Pending', 'grey'], ['Accepted', 'teal'], ['Packed', 'amber'], ['Dispatched', 'blue'], ['Delivered', 'green'], ['Rejected', 'red']]],
  ['Payment', [['Unpaid', 'grey'], ['Proof submitted', 'amber'], ['Udharo', 'blue'], ['Paid', 'green']]],
]

const TYPE: [string, string, string][] = [
  ['Page title', 'text-2xl font-semibold tracking-tight', 'Namaste, Ram'],
  ['Section title', 'text-sm font-semibold', 'Low stock'],
  ['Body', 'text-sm leading-relaxed', 'Change a quantity when you sell or receive goods.'],
  ['Caption', 'text-xs text-muted-foreground', 'Reorder at 5 carton · Sita Traders'],
  ['Nepali', 'text-sm', 'उधारो · बिल्टी · फेरि स्टक'],
]

export default function DesignSystemPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" aria-label="FeriStock home" className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Brand />
        </Link>
        <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeft data-icon="inline-start" aria-hidden />
          Back to home
        </Button>
      </header>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Design system</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">The tokens and parts every FeriStock screen is built from. IBM Plex Sans with IBM Plex Sans Devanagari, a 4/8 px spacing grid and 44 px touch targets on phones.</p>
      </div>

      <Panel title="Colour" subtitle="One blue for actions, navy for the frame, neutrals for everything else">
        <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {COLORS.map(([name, swatch, hex]) => (
            <li key={name} className="flex flex-col gap-2">
              <span className={`h-14 rounded-lg border ${swatch}`} aria-hidden />
              <span className="text-sm font-medium">{name}</span>
              <span className="text-xs text-muted-foreground">{hex}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Status" subtitle="The same colour always means the same thing, with a label beside it">
        <dl className="flex flex-col gap-4 p-4">
          {STATUSES.map(([group, pills]) => (
            <div key={group} className="flex flex-col gap-2">
              <dt className="text-xs font-medium text-muted-foreground">{group}</dt>
              <dd className="flex flex-wrap gap-2">{pills.map(([label, tone]) => <StatusPill key={label} tone={tone}>{label}</StatusPill>)}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="Type" subtitle="Two weights do most of the work: 400 for reading, 600 for names and numbers">
        <dl className="divide-y">
          {TYPE.map(([name, classes, sample]) => (
            <div key={name} className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-3">
              <dt className="w-28 shrink-0 text-xs text-muted-foreground">{name}</dt>
              <dd className={`min-w-0 flex-1 ${classes}`}>{sample}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="Buttons" subtitle="One primary action per area; the rest are outline or ghost">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <Button><ShoppingCart data-icon="inline-start" aria-hidden />Reorder</Button>
          <Button variant="outline"><Plus data-icon="inline-start" aria-hidden />Add item</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete item</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Panel>

      <Panel title="Figures" subtitle="Rupees with Nepali grouping, tabular numerals">
        <FigureSamples />
      </Panel>

      <AppFooter />
    </div>
  )
}
