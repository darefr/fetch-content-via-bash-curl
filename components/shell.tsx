'use client'

import {
  ArrowLeftRight, Barcode, Bell, Boxes, CalendarClock, CalendarX2, ChartColumn, ClipboardList, HandCoins, History, LayoutDashboard,
  LogOut, Menu, MessageSquareQuote, Package, Plus, ReceiptText, RotateCcw, Search, Settings, ShoppingCart, Store, Truck, Undo2,
  Users, Wallet, Warehouse, type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppFooter, Brand, useConfirm } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AppProvider, rpc, useAct, useApp } from '@/lib/client'
import { ago, initials } from '@/lib/format'
import { expiryState, stockStatus } from '@/lib/logic'
import type { AppState } from '@/lib/types'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: (s: AppState) => number
}

const RETAILER_NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Main', items: [{ href: '/retailer', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    group: 'Stock',
    items: [
      { href: '/retailer/inventory', label: 'Inventory', icon: Boxes, badge: (s) => s.items.filter((i) => stockStatus(i).key !== 'ok').length },
      { href: '/retailer/stock-moves', label: 'Stock movements', icon: ArrowLeftRight },
      { href: '/retailer/expiry', label: 'Expiry tracker', icon: CalendarX2, badge: (s) => s.items.filter((i) => i.qty > 0 && (expiryState(i, s.now)?.days ?? 99) <= 30).length },
      { href: '/retailer/labels', label: 'Print labels', icon: Barcode },
    ],
  },
  {
    group: 'Purchasing',
    items: [
      { href: '/retailer/orders/new', label: 'Reorder cart', icon: ShoppingCart, badge: (s) => s.cart.length },
      { href: '/retailer/orders', label: 'My orders', icon: ClipboardList, badge: (s) => s.orders.filter((o) => o.status === 'dispatched').length },
      { href: '/retailer/orders/schedules', label: 'Scheduled orders', icon: CalendarClock },
      { href: '/retailer/orders/quotes', label: 'Quote requests', icon: MessageSquareQuote, badge: (s) => s.quotes.filter((q) => q.status === 'offered').length },
      { href: '/retailer/shipments', label: 'Shipments', icon: Truck },
      { href: '/retailer/returns', label: 'Returns', icon: Undo2 },
      { href: '/retailer/suppliers', label: 'Suppliers', icon: Warehouse },
    ],
  },
  {
    group: 'Money',
    items: [
      { href: '/retailer/payments', label: 'Payments', icon: Wallet },
      { href: '/retailer/udharo', label: 'Udharo (उधारो)', icon: HandCoins, badge: (s) => s.orders.filter((o) => o.payStatus === 'udharo').length },
      { href: '/retailer/receipts', label: 'Receipts', icon: ReceiptText },
    ],
  },
  {
    group: 'Insights',
    items: [
      { href: '/retailer/reports', label: 'Reports', icon: ChartColumn },
      { href: '/retailer/activity', label: 'Activity log', icon: History },
    ],
  },
  {
    group: 'Admin',
    items: [
      { href: '/retailer/team', label: 'Team', icon: Users },
      { href: '/retailer/settings', label: 'Settings', icon: Settings },
    ],
  },
]

const SUPPLIER_NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Main', items: [{ href: '/supplier', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    group: 'Sales',
    items: [
      { href: '/supplier/orders', label: 'Incoming orders', icon: ClipboardList, badge: (s) => s.orders.filter((o) => o.status === 'pending').length },
      { href: '/supplier/quotes', label: 'Quotes', icon: MessageSquareQuote, badge: (s) => s.quotes.filter((q) => q.status === 'requested').length },
      { href: '/supplier/dispatch', label: 'Dispatch', icon: Truck, badge: (s) => s.orders.filter((o) => o.status === 'packed').length },
      { href: '/supplier/returns', label: 'Returns', icon: Undo2, badge: (s) => s.returns.filter((r) => r.status === 'requested').length },
      { href: '/supplier/retailers', label: 'Retailers', icon: Store },
    ],
  },
  { group: 'Catalog', items: [{ href: '/supplier/catalog', label: 'Product catalog', icon: Package }] },
  {
    group: 'Money',
    items: [
      { href: '/supplier/payments', label: 'Payments', icon: Wallet, badge: (s) => s.payments.filter((p) => p.status === 'submitted').length },
      { href: '/supplier/udharo', label: 'Udharo due (उधारो)', icon: HandCoins, badge: (s) => s.orders.filter((o) => o.payStatus === 'udharo').length },
      { href: '/supplier/receipts', label: 'Receipts', icon: ReceiptText },
    ],
  },
  {
    group: 'Insights',
    items: [
      { href: '/supplier/reports', label: 'Reports', icon: ChartColumn },
      { href: '/supplier/activity', label: 'Activity log', icon: History },
    ],
  },
  {
    group: 'Admin',
    items: [
      { href: '/supplier/team', label: 'Team', icon: Users },
      { href: '/supplier/settings', label: 'Settings', icon: Settings },
    ],
  },
]

const QUICK_ADD: Record<AppState['ws'], { href: string; label: string; icon: LucideIcon }[]> = {
  retailer: [
    { href: '/retailer/inventory?new=1', label: 'Add stock item', icon: Boxes },
    { href: '/retailer/stock-moves?new=1', label: 'Record a stock change', icon: ArrowLeftRight },
    { href: '/retailer/orders/new', label: 'New order', icon: ShoppingCart },
    { href: '/retailer/orders/quotes?new=1', label: 'Request a quote', icon: MessageSquareQuote },
    { href: '/retailer/orders/schedules?new=1', label: 'Scheduled order', icon: CalendarClock },
  ],
  supplier: [
    { href: '/supplier/catalog?new=1', label: 'Add product', icon: Package },
    { href: '/supplier/orders', label: 'Review incoming orders', icon: ClipboardList },
    { href: '/supplier/dispatch', label: 'Dispatch an order', icon: Truck },
  ],
}

const TABS: Record<AppState['ws'], { href: string; label: string; icon: LucideIcon }[]> = {
  retailer: [
    { href: '/retailer', label: 'Home', icon: LayoutDashboard },
    { href: '/retailer/inventory', label: 'Inventory', icon: Boxes },
    { href: '/retailer/orders', label: 'Orders', icon: ClipboardList },
    { href: '/retailer/udharo', label: 'Udharo', icon: HandCoins },
  ],
  supplier: [
    { href: '/supplier', label: 'Home', icon: LayoutDashboard },
    { href: '/supplier/orders', label: 'Orders', icon: ClipboardList },
    { href: '/supplier/dispatch', label: 'Dispatch', icon: Truck },
    { href: '/supplier/payments', label: 'Payments', icon: Wallet },
  ],
}

const navFor = (ws: AppState['ws']) => (ws === 'retailer' ? RETAILER_NAV : SUPPLIER_NAV)
const navHrefs = (ws: AppState['ws']) => navFor(ws).flatMap((g) => g.items.map((i) => i.href))

/**
 * The nav entry for the current page: the longest entry that is a prefix of the path. The
 * workspace home is a prefix of every page in it, so it only counts on an exact match.
 */
function activeHref(pathname: string, hrefs: string[], home: string) {
  return hrefs.filter((h) => pathname === h || (h !== home && pathname.startsWith(`${h}/`))).sort((a, b) => b.length - a.length)[0]
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const s = useApp()
  const pathname = usePathname()
  const nav = navFor(s.ws)
  const active = activeHref(pathname, navHrefs(s.ws), `/${s.ws}`)
  return (
    <nav aria-label="Workspace" className="flex flex-col gap-4">
      {nav.map((section) => (
        <div key={section.group} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 text-xs font-semibold tracking-wider text-sidebar-foreground/60 uppercase">{section.group}</p>
          {section.items.map((item) => {
            const count = item.badge?.(s) ?? 0
            const current = item.href === active
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={current ? 'page' : undefined}
                // Keeps the current page's entry in view when the list is longer than the screen.
                ref={current ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                className={cn(
                  'flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-sidebar-ring max-md:h-11',
                  current ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{item.label}</span>
                {count > 0 && (
                  <span className={cn('ml-auto rounded-full px-1.5 text-xs font-semibold tabular-nums', current ? 'bg-sidebar-primary-foreground/20' : 'bg-sidebar-accent text-sidebar-accent-foreground')}>
                    {count}
                    <span className="sr-only"> need attention</span>
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function OrgCard() {
  const s = useApp()
  return (
    <div className="border-t border-sidebar-border px-4 py-3">
      <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{s.org.name}</p>
      <p className="truncate text-xs text-sidebar-foreground/70">{`${s.ws === 'retailer' ? 'Retailer' : 'Supplier'} workspace · ${s.org.city}`}</p>
    </div>
  )
}

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const s = useApp()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const base = `/${s.ws}`

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pages = (s.ws === 'retailer' ? RETAILER_NAV : SUPPLIER_NAV).flatMap((g) => g.items.map((i) => ({ href: i.href, label: i.label, kind: 'Page' })))
    const all = [
      ...pages,
      ...s.items.map((i) => ({ href: `${base}/inventory?q=${encodeURIComponent(i.sku)}`, label: `${i.name} · ${i.sku}`, kind: 'Stock item' })),
      ...s.orders.map((o) => ({ href: `${base}/orders/${o.id}`, label: `${o.no} · ${s.partners.find((p) => p.id === (s.ws === 'retailer' ? o.supplierId : o.retailerId))?.name ?? ''}`, kind: 'Order' })),
      ...(s.ws === 'supplier' ? s.products.filter((p) => !p.archived).map((p) => ({ href: `${base}/catalog?q=${encodeURIComponent(p.sku)}`, label: `${p.name} · ${p.sku}`, kind: 'Product' })) : []),
      ...s.partners.map((p) => ({ href: `${base}/${s.ws === 'retailer' ? 'suppliers' : 'retailers'}`, label: p.name, kind: s.ws === 'retailer' ? 'Supplier' : 'Retailer' })),
    ]
    return (q ? all.filter((r) => r.label.toLowerCase().includes(q)) : pages).slice(0, 9)
  }, [query, s, base])

  useEffect(() => setCursor(0), [query, open])
  const go = (href: string) => {
    onOpenChange(false)
    setQuery('')
    router.push(href)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[12%] translate-y-0 gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Search FeriStock</DialogTitle>
          <DialogDescription>Find pages, stock items, orders and partners.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return
              if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)) }
              if (e.key === 'Enter' && results[cursor]) go(results[cursor].href)
            }}
            placeholder="Search items, orders, pages"
            aria-label="Search items, orders, pages"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={results[cursor] ? `palette-${cursor}` : undefined}
            className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul id="palette-results" role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{`Nothing matches “${query}”.`}</li>}
          {results.map((r, i) => (
            <li key={`${r.kind}-${r.href}-${r.label}`} id={`palette-${i}`} role="option" aria-selected={i === cursor}>
              <button
                type="button"
                onClick={() => go(r.href)}
                onMouseEnter={() => setCursor(i)}
                className={cn('flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm', i === cursor && 'bg-accent text-accent-foreground')}
              >
                <span className="truncate font-medium">{r.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

function Notifications() {
  const s = useApp()
  const act = useAct()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const unread = s.notices.filter((n) => !n.read).length
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="icon-lg" className="relative" />}>
        <Bell aria-hidden />
        <span className="sr-only">{unread ? `Notifications, ${unread} unread` : 'Notifications'}</span>
        {unread > 0 && <span aria-hidden className="absolute -top-0.5 -right-0.5 grid min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[0.65rem] leading-4.5 font-semibold text-primary-foreground">{unread}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] gap-0 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && <Button variant="ghost" size="sm" onClick={() => act('notice.read')}>Mark all read</Button>}
        </div>
        {s.notices.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing new. Order and payment updates show up here.</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {s.notices.map((n) => (
              <li key={n.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  className="flex w-full gap-2.5 px-3 py-2.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
                  onClick={() => {
                    setOpen(false)
                    if (!n.read) void act('notice.read', { id: n.id })
                    router.push(n.href)
                  }}
                >
                  <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className={cn('text-sm leading-snug', !n.read && 'font-medium')}>{n.text}</span>
                    <span className="text-xs text-muted-foreground">{ago(n.at, s.now)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}

function ProfileMenu() {
  const s = useApp()
  const act = useAct()
  const router = useRouter()
  const [confirm, dialog] = useConfirm()
  const leave = async (action: string, input: object = {}) => {
    try {
      const result = await rpc<{ home: string }>(action, input, s.ws)
      window.location.assign(result.home)
    } catch {
      router.refresh()
    }
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" className="rounded-full bg-brand-navy text-xs font-semibold text-brand-navy-foreground hover:bg-brand-navy/90 hover:text-brand-navy-foreground" />}>
          <span aria-hidden>{initials(s.user.name)}</span>
          <span className="sr-only">Account menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">{s.user.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{`${s.user.role === 'owner' ? 'Owner' : s.user.role === 'manager' ? 'Manager' : 'Staff'} · ${s.org.name}`}</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {s.canSwitch && (
              <DropdownMenuItem onClick={() => leave('ws.switch', { ws: s.ws === 'retailer' ? 'supplier' : 'retailer' })}>
                <ArrowLeftRight aria-hidden />
                {`Switch to ${s.ws === 'retailer' ? 'supplier' : 'retailer'} workspace`}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => router.push(`/${s.ws}/settings`)}>
              <Settings aria-hidden />
              Settings
            </DropdownMenuItem>
            {s.canReset && (
              <DropdownMenuItem
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Reset the sample data?',
                    text: 'The six sample businesses go back to their starting stock, orders and payments. Businesses that people registered themselves are kept.',
                    action: 'Reset sample data',
                    destructive: true,
                  })
                  if (ok) await act('demo.reset', {}, { success: 'Sample data is back to its starting state.' })
                }}
              >
                <RotateCcw aria-hidden />
                Reset sample data
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => leave('auth.logout')}>
              <LogOut aria-hidden />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog}
    </>
  )
}

function Frame({ children }: { children: ReactNode }) {
  const s = useApp()
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const tabs = TABS[s.ws]
  const home = `/${s.ws}`
  const activeTab = activeHref(pathname, tabs.map((t) => t.href), home)
  // A page with no tab of its own is reached through the More menu.
  const inMore = !activeTab && Boolean(activeHref(pathname, navHrefs(s.ws), home))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div data-app-shell className="min-h-dvh md:pl-60">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Link href={`/${s.ws}`} aria-label="FeriStock dashboard" className="flex h-14 shrink-0 items-center px-4 outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring">
          <Brand inverse />
        </Link>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <NavList />
        </div>
        <OrgCard />
      </aside>

      <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card px-3 md:px-5">
        <Button variant="ghost" size="icon-lg" className="md:hidden" onClick={() => setMenuOpen(true)}>
          <Menu aria-hidden />
          <span className="sr-only">Open menu</span>
        </Button>
        <Link href={`/${s.ws}`} aria-label="FeriStock dashboard" className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden">
          <Brand compact />
        </Link>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg border bg-background px-3 text-sm text-muted-foreground outline-none hover:border-input focus-visible:ring-3 focus-visible:ring-ring/50 md:flex"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Search items, orders, pages</span>
          <kbd className="rounded border bg-card px-1.5 font-mono text-xs">Ctrl K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="icon-lg" className="md:hidden" onClick={() => setSearchOpen(true)}>
            <Search aria-hidden />
            <span className="sr-only">Search</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="lg" />}>
              <Plus data-icon="inline-start" aria-hidden />
              <span className="max-md:sr-only">New</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Create</DropdownMenuLabel>
                {QUICK_ADD[s.ws].map((q) => (
                  <DropdownMenuItem key={q.href} onClick={() => router.push(q.href)}>
                    <q.icon aria-hidden />
                    {q.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Notifications />
          <ProfileMenu />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 py-5 pb-24 md:px-6 md:py-6 md:pb-8 print:p-0">
        <Suspense>{children}</Suspense>
        <AppFooter demo={s.demo} />
      </main>

      <nav aria-label="Main tabs" className="no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-card md:hidden">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.href === activeTab ? 'page' : undefined}
            className={cn('flex h-14 flex-col items-center justify-center gap-1 text-xs font-medium outline-none focus-visible:bg-muted', t.href === activeTab ? 'text-primary' : 'text-muted-foreground')}
          >
            <t.icon className="size-5" aria-hidden />
            {t.label}
          </Link>
        ))}
        <button type="button" onClick={() => setMenuOpen(true)} className={cn('flex h-14 flex-col items-center justify-center gap-1 text-xs font-medium outline-none focus-visible:bg-muted', inMore ? 'text-primary' : 'text-muted-foreground')}>
          <Menu className="size-5" aria-hidden />
          More
        </button>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="h-14 justify-center px-4 py-0">
            <SheetTitle className="text-left">
              <Brand inverse />
            </SheetTitle>
            <SheetDescription className="sr-only">Workspace navigation</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <NavList onNavigate={() => setMenuOpen(false)} />
          </div>
          <OrgCard />
        </SheetContent>
      </Sheet>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}

export function Shell({ initial, children }: { initial: AppState; children: ReactNode }) {
  return (
    <AppProvider initial={initial}>
      <Frame>{children}</Frame>
    </AppProvider>
  )
}
