import { ArrowLeftRight, ArrowRight, Barcode, CalendarX2, ChartColumn, Check, HandCoins, Lock, PackageCheck, QrCode, ReceiptText, ShieldCheck, Store, Undo2, Users, Wallet, Warehouse } from 'lucide-react'
import Link from 'next/link'
import { LandingDemo } from '@/components/landing-demo'
import { Button } from '@/components/ui/button'

function Header({ home }: { home?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link aria-label="FeriStock home" className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/">
          <span className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-4.5" aria-hidden />
            </span>
            FeriStock
          </span>
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <a href="#workspaces" className="hover:text-foreground">Retailers and suppliers</a>
          <a href="#flow" className="hover:text-foreground">Order flow</a>
          <a href="#tools" className="hover:text-foreground">Shop tools</a>
          <a href="#payments" className="hover:text-foreground">Payments</a>
        </nav>
        <div className="flex items-center gap-2">
          {home ? (
            <Button size="lg" nativeButton={false} render={<Link href={home} />}>
              Open workspace
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Button>
          ) : (
            <>
              <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/login" />}>Sign in</Button>
              <Button size="lg" nativeButton={false} render={<Link href="/register" />} className="max-sm:hidden">Create account</Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-12 md:py-16 lg:flex-row lg:justify-between">
      <div className="flex max-w-xl flex-col gap-5">
        <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">Restock your shop before the shelf goes empty.</h1>
        <p className="text-base leading-relaxed text-muted-foreground text-pretty md:text-lg">
          {"FeriStock keeps a shop's live stock and its wholesalers' orders in one place: low-stock alerts, 1-click reorders, bilti tracking, and direct payment by eSewa, Khalti, QR or udharo."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" nativeButton={false} render={<Link href="/register" />} className="h-10 px-4">
            Create account
            <ArrowRight aria-hidden />
          </Button>
          <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/login" />} className="h-10 px-4">Sign in</Button>
        </div>
        <p className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Not a marketplace. You order from your own suppliers and pay them directly. FeriStock never holds your money.
        </p>
      </div>
      <LandingDemo />
    </section>
  )
}

function Workspaces() {
  return (
    <section id="workspaces" className="scroll-mt-14 border-y bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 md:py-16">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">One workspace for each side of a restock</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground text-pretty">
            The role you choose at sign-up decides the whole app: its navigation, dashboard, features and permissions.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="flex flex-col rounded-xl border bg-card">
            <div className="flex items-center gap-3 p-4 pb-0">
              <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Store className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold">Retailers</h3>
                <p className="text-sm text-muted-foreground">Kirana and shop owners, mostly on a phone</p>
              </div>
            </div>
            <ul className="flex flex-col gap-2.5 p-4">
              <li className="flex gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 size-4 shrink-0 text-tone-green" aria-hidden />
                Live stock list with OK, Low Stock and Out of Stock status
              </li>
              <li className="flex gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 size-4 shrink-0 text-tone-green" aria-hidden />
                Low-stock alerts and 1-click reorder into a supplier-grouped cart
              </li>
              <li className="flex gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 size-4 shrink-0 text-tone-green" aria-hidden />
                Scheduled restocks and custom quote requests
              </li>
              <li className="flex gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 size-4 shrink-0 text-tone-green" aria-hidden />
                Track dispatch by van or bilti, then confirm delivery
              </li>
              <li className="flex gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 size-4 shrink-0 text-tone-green" aria-hidden />
                Pay by eSewa, Khalti, QR/bank transfer or udharo (उधारो)
              </li>
            </ul>
            <div className="mt-auto rounded-b-xl border-t bg-muted/50 p-4">
              <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/register?role=retailer" />}>
                Create retailer account
                <ArrowRight aria-hidden />
              </Button>
            </div>
          </article>
          <article className="flex flex-col rounded-xl border bg-card">
            <div className="flex items-center gap-3 p-4 pb-0">
              <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Warehouse className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold">Suppliers</h3>
                <p className="text-sm text-muted-foreground">Wholesalers and distributors, on desktop or phone</p>
              </div>
            </div>
            <ul className="flex flex-col gap-2.5 p-4">
              <li className="flex gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 size-4 shrink-0 text-tone-green" aria-hidden />
                Catalog with bulk price tiers, MOQ and schemes
              </li>
              <li className="flex gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 size-4 shrink-0 text-tone-green" aria-hidden />
                Accept, adjust or reject incoming orders and quotes
              </li>
              <li className="flex gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 size-4 shrink-0 text-tone-green" aria-hidden />
                Dispatch by own van, transport bilti (बिल्टी) or pickup
              </li>
              <li className="flex gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 size-4 shrink-0 text-tone-green" aria-hidden />
                Verify QR and bank payment proofs, track udharo due
              </li>
              <li className="flex gap-2.5 text-sm leading-relaxed">
                <Check className="mt-0.5 size-4 shrink-0 text-tone-green" aria-hidden />
                Receipts with PAN/VAT for both parties
              </li>
            </ul>
            <div className="mt-auto rounded-b-xl border-t bg-muted/50 p-4">
              <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/register?role=supplier" />}>
                Create supplier account
                <ArrowRight aria-hidden />
              </Button>
            </div>
          </article>
        </div>
        <p className="text-sm text-muted-foreground">
          {"Buy stock and supply other shops? One account can switch between both workspaces. "}
          <Link className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline" href="/register?role=both">
            Create an account for both
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </p>
      </div>
    </section>
  )
}

function OrderFlow() {
  return (
    <section id="flow" className="mx-auto flex max-w-6xl scroll-mt-14 flex-col gap-8 px-4 py-12 md:py-16">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">Every order moves through five stages</h2>
        <p className="mt-2 leading-relaxed text-muted-foreground text-pretty">
          Both sides see the same status, so nobody has to phone to ask where the goods are.
        </p>
      </div>
      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <li className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border bg-card text-sm font-semibold">1</span>
            <span aria-hidden className="hidden h-px flex-1 bg-border lg:block" />
          </div>
          <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap border-tone-grey-line bg-tone-grey-soft text-tone-grey-ink w-fit">
            <span aria-hidden className="size-1.5 rounded-full bg-tone-grey" />
            Pending
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">The retailer places the order.</p>
        </li>
        <li className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border bg-card text-sm font-semibold">2</span>
            <span aria-hidden className="hidden h-px flex-1 bg-border lg:block" />
          </div>
          <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap border-tone-teal-line bg-tone-teal-soft text-tone-teal-ink w-fit">
            <span aria-hidden className="size-1.5 rounded-full bg-tone-teal" />
            Accepted
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">The supplier confirms items and price. Payment opens.</p>
        </li>
        <li className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border bg-card text-sm font-semibold">3</span>
            <span aria-hidden className="hidden h-px flex-1 bg-border lg:block" />
          </div>
          <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap border-tone-amber-line bg-tone-amber-soft text-tone-amber-ink w-fit">
            <span aria-hidden className="size-1.5 rounded-full bg-tone-amber" />
            Packed
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">Goods are packed at the godown.</p>
        </li>
        <li className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border bg-card text-sm font-semibold">4</span>
            <span aria-hidden className="hidden h-px flex-1 bg-border lg:block" />
          </div>
          <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap border-tone-blue-line bg-tone-blue-soft text-tone-blue-ink w-fit">
            <span aria-hidden className="size-1.5 rounded-full bg-tone-blue" />
            Dispatched
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">Van details or the bilti number are shared.</p>
        </li>
        <li className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border bg-card text-sm font-semibold">5</span>
          </div>
          <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap border-tone-green-line bg-tone-green-soft text-tone-green-ink w-fit">
            <span aria-hidden className="size-1.5 rounded-full bg-tone-green" />
            Delivered
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">The retailer confirms delivery and stock updates.</p>
        </li>
      </ol>
      <div className="grid gap-3 md:grid-cols-2">
        <p className="flex gap-3 rounded-xl border bg-background p-4 text-sm leading-relaxed">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          A retailer cannot pay before the supplier accepts the order.
        </p>
        <p className="flex gap-3 rounded-xl border bg-background p-4 text-sm leading-relaxed">
          <PackageCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Only the retailer can confirm delivery. Confirming adds the received quantity to stock.
        </p>
      </div>
    </section>
  )
}

function ShopTools() {
  return (
    <section id="tools" className="scroll-mt-14 border-y bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 md:py-16">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">The everyday tools of a shop, built in</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground text-pretty">
            The parts of a store system that help with restocking, without turning FeriStock into a billing counter.
          </p>
        </div>
        <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          <li className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky text-sky-foreground">
              <ArrowLeftRight className="size-4.5" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Stock movements</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Record sales, damage and counts. Every change is kept with who did it and when.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky text-sky-foreground">
              <CalendarX2 className="size-4.5" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Expiry tracker</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">See what expires this month before it turns into a loss.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky text-sky-foreground">
              <Barcode className="size-4.5" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Barcode and QR labels</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">Print shelf labels for any item straight from the browser.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky text-sky-foreground">
              <Undo2 className="size-4.5" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Returns</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">Send back damaged or expired goods and get the credit agreed in writing.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky text-sky-foreground">
              <ChartColumn className="size-4.5" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Reports</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">Monthly purchases, top items and stock value, with CSV export.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky text-sky-foreground">
              <Users className="size-4.5" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Team logins</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">Give staff their own login. Owners keep control of money and settings.</p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  )
}

function Payments() {
  return (
    <section id="payments" className="scroll-mt-14 bg-brand-navy text-brand-navy-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:py-16 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex max-w-md flex-col gap-4">
          <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">Money goes straight to the supplier</h2>
          <p className="leading-relaxed text-brand-navy-foreground/80 text-pretty">
            FeriStock is non-custodial. It never holds funds: the buyer pays the supplier directly, every time.
          </p>
          <p className="flex gap-3 text-sm leading-relaxed text-brand-navy-foreground/90">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            A wallet payment is marked Paid only after server-side verification of its status and the exact NPR amount.
          </p>
          <p className="flex gap-3 text-sm leading-relaxed text-brand-navy-foreground/90">
            <ReceiptText className="mt-0.5 size-4 shrink-0" aria-hidden />
            {"Every paid or confirmed order gets an Order & Payment Receipt with both PAN/VAT numbers, itemized SKUs and the payment reference."}
          </p>
        </div>
        <ul className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
          <li className="rounded-xl border border-sidebar-border bg-sidebar-accent p-4">
            <span className="grid size-9 place-items-center rounded-lg bg-brand-navy">
              <Wallet className="size-4.5" aria-hidden />
            </span>
            <h3 className="mt-3 font-semibold">eSewa</h3>
            <p className="mt-1 text-sm leading-relaxed text-brand-navy-foreground/80">Paid to the supplier’s own merchant account.</p>
          </li>
          <li className="rounded-xl border border-sidebar-border bg-sidebar-accent p-4">
            <span className="grid size-9 place-items-center rounded-lg bg-brand-navy">
              <Wallet className="size-4.5" aria-hidden />
            </span>
            <h3 className="mt-3 font-semibold">Khalti</h3>
            <p className="mt-1 text-sm leading-relaxed text-brand-navy-foreground/80">Paid to the supplier’s own merchant account.</p>
          </li>
          <li className="rounded-xl border border-sidebar-border bg-sidebar-accent p-4">
            <span className="grid size-9 place-items-center rounded-lg bg-brand-navy">
              <QrCode className="size-4.5" aria-hidden />
            </span>
            <h3 className="mt-3 font-semibold">QR / Bank transfer</h3>
            <p className="mt-1 text-sm leading-relaxed text-brand-navy-foreground/80">The retailer uploads proof and the supplier confirms it.</p>
          </li>
          <li className="rounded-xl border border-sidebar-border bg-sidebar-accent p-4">
            <span className="grid size-9 place-items-center rounded-lg bg-brand-navy">
              <HandCoins className="size-4.5" aria-hidden />
            </span>
            <h3 className="mt-3 font-semibold">Udharo (उधारो)</h3>
            <p className="mt-1 text-sm leading-relaxed text-brand-navy-foreground/80">Credit with a due date, settled later.</p>
          </li>
        </ul>
      </div>
    </section>
  )
}

function CallToAction() {
  return (
    <section className="bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Set up your shop or wholesale business</h2>
          <p className="mt-1 text-sm text-muted-foreground">You fill in your own business details. No admin creates accounts for you.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" nativeButton={false} render={<Link href="/register" />} className="h-10 px-4">
            Create account
            <ArrowRight aria-hidden />
          </Button>
          <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/login" />} className="h-10 px-4">Sign in</Button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm">
        <nav aria-label="Footer" className="flex flex-wrap gap-5 font-medium">
          <Link className="hover:underline" href="/login">Sign in</Link>
          <Link className="hover:underline" href="/register">Create account</Link>
          <Link className="hover:underline" href="/design-system">Design system</Link>
        </nav>
        <p className="flex flex-wrap items-center gap-3 text-muted-foreground">
          © 2026 FeriStock
          <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap border-tone-amber-line bg-tone-amber-soft text-tone-amber-ink">
            <span aria-hidden className="size-1.5 rounded-full bg-tone-amber" />
            Demo data
          </span>
          <span className="text-xs">Prototype by FastTech Nepal</span>
        </p>
      </div>
    </footer>
  )
}

/** `home` is the signed-in visitor's workspace, when there is one. */
export function Landing({ home }: { home?: string }) {
  return (
    <div className="bg-card">
      <Header home={home} />
      <main>
        <Hero />
        <Workspaces />
        <OrderFlow />
        <ShopTools />
        <Payments />
        <CallToAction />
      </main>
      <Footer />
    </div>
  )
}
