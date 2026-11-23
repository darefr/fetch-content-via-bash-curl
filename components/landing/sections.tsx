import { ArrowRight, Check, HandCoins, Lock, PackageCheck, Plus, QrCode, ReceiptText, ScrollText, Store, Truck, Wallet, Warehouse, type LucideIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Brand, StatusPill } from '@/components/brand'
import { ORDER_LABEL, ORDER_TONE } from '@/lib/logic'
import { cn } from '@/lib/utils'
import { DemoButton } from './demo-button'
import { Cta, SectionHeading } from './parts'

const WAYS: { icon: LucideIcon; label: string }[] = [
  { icon: Wallet, label: 'eSewa' },
  { icon: Wallet, label: 'Khalti' },
  { icon: QrCode, label: 'QR / bank transfer' },
  { icon: HandCoins, label: 'Udharo (उधारो)' },
  { icon: Truck, label: 'Own van' },
  { icon: ScrollText, label: 'Transport bilti (बिल्टी)' },
  { icon: Store, label: 'Pickup' },
  { icon: ReceiptText, label: 'PAN / VAT receipts' },
]

export function Ways() {
  return (
    <section aria-labelledby="ways-title" className="border-b bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:gap-10">
        <h2 id="ways-title" className="shrink-0 text-sm leading-relaxed font-semibold text-muted-foreground lg:max-w-52">
          Built around how shops already pay and receive goods
        </h2>
        <ul className="flex flex-wrap gap-2">
          {WAYS.map((way) => (
            <li key={way.label} className="inline-flex h-10 items-center gap-2 rounded-full border bg-background px-4 text-sm font-medium">
              <way.icon className="size-4 text-primary" aria-hidden />
              {way.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const SIDES = [
  {
    icon: Store,
    image: '/images/kirana-shop.webp',
    alt: 'Illustration of a kirana shop front with stocked shelves, a counter and a delivery van pulling up',
    title: 'For retailers',
    who: 'Kirana and shop owners, mostly on a phone',
    points: [
      'Live stock list with OK, Low Stock and Out of Stock status',
      'Low-stock alerts and 1-click reorder into a supplier-grouped cart',
      'Scheduled restocks and custom quote requests',
      'Track dispatch by van or bilti, then confirm delivery',
      'Pay by eSewa, Khalti, QR/bank transfer or udharo (उधारो)',
    ],
    cta: 'Create retailer account',
    href: '/register?role=retailer',
  },
  {
    icon: Warehouse,
    image: '/images/wholesale-godown.webp',
    alt: 'Illustration of a wholesale godown with racks of cartons and a van being loaded',
    title: 'For suppliers',
    who: 'Wholesalers and distributors, on desktop or phone',
    points: [
      'Catalog with bulk price tiers, MOQ and schemes',
      'Accept, adjust or reject incoming orders and quotes',
      'Dispatch by own van, transport bilti (बिल्टी) or pickup',
      'Verify QR and bank payment proofs, track udharo due',
      'Receipts with PAN/VAT for both parties',
    ],
    cta: 'Create supplier account',
    href: '/register?role=supplier',
  },
]

export function Workspaces() {
  return (
    <section id="workspaces" className="scroll-mt-16 bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
        <SectionHeading
          eyebrow="Two workspaces"
          title="One workspace for each side of a restock"
          text="The role you choose at sign-up decides the whole app: its navigation, dashboard, features and permissions."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {SIDES.map((side) => (
            <article key={side.title} className="reveal flex flex-col overflow-hidden rounded-3xl border bg-card shadow-soft">
              <div className="relative aspect-[16/10] bg-brand-navy">
                <Image src={side.image} alt={side.alt} fill sizes="(min-width: 1024px) 40rem, 100vw" className="object-cover object-[50%_64%]" />
              </div>
              <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
                <div className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                    <side.icon className="size-6" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight">{side.title}</h3>
                    <p className="text-muted-foreground">{side.who}</p>
                  </div>
                </div>
                <ul className="flex flex-col gap-3">
                  {side.points.map((point) => (
                    <li key={point} className="flex gap-3 leading-relaxed">
                      <Check className="mt-1 size-4.5 shrink-0 text-tone-green" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
                <Cta href={side.href} className="mt-auto w-full sm:w-fit">
                  {side.cta}
                  <ArrowRight aria-hidden />
                </Cta>
              </div>
            </article>
          ))}
        </div>
        <p className="leading-relaxed text-muted-foreground">
          {'Buy stock and supply other shops? One account can switch between both workspaces. '}
          <Link className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline" href="/register?role=both">
            Create an account for both
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </p>
      </div>
    </section>
  )
}

const STAGES = [
  { status: 'pending', by: 'Retailer', text: 'The shop places the order from its reorder cart.' },
  { status: 'accepted', by: 'Supplier', text: 'The supplier confirms items and price. Payment opens.' },
  { status: 'packed', by: 'Supplier', text: 'Goods are packed at the godown.' },
  { status: 'dispatched', by: 'Supplier', text: 'Van details or the bilti number are shared.' },
  { status: 'delivered', by: 'Retailer', text: 'The shop confirms delivery and its stock goes up.' },
] as const

export function OrderFlow() {
  return (
    <section id="flow" className="scroll-mt-16 bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
        <SectionHeading
          eyebrow="Order flow"
          title="Every order moves through five stages"
          text="Both sides see the same status, so nobody has to phone to ask where the goods are."
        />
        <ol className="grid gap-4 lg:grid-cols-5">
          {STAGES.map((stage, i) => (
            <li key={stage.status} className="reveal flex gap-4 rounded-2xl border bg-background p-5 lg:flex-col">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-navy text-lg font-semibold text-brand-navy-foreground">{i + 1}</span>
              <div className="flex min-w-0 flex-col gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={ORDER_TONE[stage.status]} className="h-7 px-2.5 text-sm">{ORDER_LABEL[stage.status]}</StatusPill>
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', stage.by === 'Retailer' ? 'bg-sky text-sky-foreground' : 'bg-secondary text-secondary-foreground')}>
                    {`By the ${stage.by.toLowerCase()}`}
                  </span>
                </div>
                <p className="leading-relaxed text-muted-foreground">{stage.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="grid gap-4 md:grid-cols-2">
          <p className="reveal flex gap-4 rounded-2xl bg-sky/60 p-5 leading-relaxed">
            <Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            A retailer cannot pay before the supplier accepts the order.
          </p>
          <p className="reveal flex gap-4 rounded-2xl bg-sky/60 p-5 leading-relaxed">
            <PackageCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            Only the retailer can confirm delivery. Confirming adds the received quantity to stock.
          </p>
        </div>
      </div>
    </section>
  )
}

const QUESTIONS = [
  {
    q: 'Is FeriStock a marketplace?',
    a: 'No. You add the wholesalers you already buy from and reorder from their catalogs, at the prices they set. FeriStock does not sell goods itself.',
  },
  {
    q: 'Does FeriStock hold my money?',
    a: "Never. A shop pays its supplier directly: into the supplier's own eSewa or Khalti merchant account, by QR or bank transfer with a proof photo, or on udharo. FeriStock records the payment and issues the receipt.",
  },
  {
    q: 'Can I run it from my phone?',
    a: 'Yes. Both workspaces are built for a phone first, with bottom tabs and large buttons, and open up into a sidebar layout on a computer. You can add FeriStock to your home screen from the browser menu.',
  },
  {
    q: 'How is udharo (उधारो) tracked?',
    a: 'When a supplier allows credit, the order carries a due date. The shop sees what it owes and when; the supplier sees what is due to collect. Either side can see when it is settled.',
  },
  {
    q: 'Can my staff use it too?',
    a: 'Yes. Each person gets their own login, so every stock change shows who made it. Owners keep control of money and settings.',
  },
  {
    q: 'I buy stock and also supply other shops. Do I need two accounts?',
    a: 'No. Choose Both when you sign up and switch between the retailer and supplier workspaces from the account menu.',
  },
  {
    q: 'Can I try it before signing up?',
    a: 'Yes. Open a demo shop from this page, or pick a demo retailer or supplier on the sign-in page. They come with stock, orders and payments in place. This prototype runs on demo data, which can be reset.',
  },
]

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:py-28">
        <SectionHeading eyebrow="Questions" title="What shop owners ask first" text="Short answers about money, phones, credit and staff." />
        <div className="flex flex-col gap-3">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="group reveal rounded-2xl border bg-background px-5 open:bg-card open:shadow-soft">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-4 text-lg font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" aria-hidden />
              </summary>
              <p className="pb-5 leading-relaxed text-muted-foreground text-pretty">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Closing({ home }: { home?: string }) {
  return (
    <section className="bg-brand-navy text-brand-navy-foreground">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16 lg:py-24">
        <div className="reveal flex flex-col gap-6">
          <h2 className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">Set up your shop or wholesale business.</h2>
          <p className="max-w-xl text-lg leading-relaxed text-brand-navy-foreground/75 text-pretty">
            You fill in your own business details, and it takes about two minutes. No admin creates accounts for you.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {home ? (
              <Cta href={home} variant="light" className="h-14 px-8 text-lg">
                Open your workspace
                <ArrowRight aria-hidden />
              </Cta>
            ) : (
              <>
                <Cta href="/register" variant="light" className="h-14 px-8 text-lg">
                  Create account
                  <ArrowRight aria-hidden />
                </Cta>
                <DemoButton className="h-14 px-8 text-lg" />
              </>
            )}
          </div>
        </div>
        <div className="reveal relative aspect-[16/10] overflow-hidden rounded-3xl ring-1 ring-brand-navy-foreground/15">
          <Image src="/images/kirana-shop.webp" alt="" fill sizes="(min-width: 1024px) 34rem, 100vw" className="object-cover object-[50%_64%]" />
        </div>
      </div>
    </section>
  )
}

const FOOTER_LINKS = [
  {
    title: 'Product',
    links: [
      { href: '#workspaces', label: 'Who it is for' },
      { href: '#flow', label: 'Order flow' },
      { href: '#tools', label: 'Shop tools' },
      { href: '#payments', label: 'Payments' },
      { href: '#faq', label: 'Questions' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { href: '/register?role=retailer', label: 'Retailer account' },
      { href: '/register?role=supplier', label: 'Supplier account' },
      { href: '/register?role=both', label: 'Account for both' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/login', label: 'Sign in' },
      { href: '/forgot-password', label: 'Forgot password' },
      { href: '/design-system', label: 'Design system' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-brand-navy text-brand-navy-foreground">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-t border-brand-navy-foreground/10 py-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 flex flex-col gap-4 lg:col-span-1">
            <Brand inverse className="text-lg" />
            <p className="max-w-xs leading-relaxed text-brand-navy-foreground/70">Stock, orders and payments for shops and their suppliers in Nepal.</p>
          </div>
          {FOOTER_LINKS.map((group) => (
            <nav key={group.title} aria-label={group.title} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold tracking-wider text-brand-navy-foreground/60 uppercase">{group.title}</h2>
              <ul className="flex flex-col gap-1">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-9 items-center rounded-md text-brand-navy-foreground/85 outline-none hover:text-brand-navy-foreground hover:underline focus-visible:ring-3 focus-visible:ring-sidebar-ring"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-navy-foreground/10 py-6 text-sm text-brand-navy-foreground/70">
          <p>© 2026 FeriStock</p>
          <p className="flex flex-wrap items-center gap-3">
            <StatusPill tone="amber">Demo data</StatusPill>
            <span>Prototype by FastTech Nepal</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
