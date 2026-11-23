import type { Workspace } from '@/lib/types'

export type Screen =
  | 'home' | 'inventory' | 'stock-moves' | 'expiry' | 'labels' | 'orders' | 'cart' | 'schedules' | 'quotes' | 'order' | 'pay'
  | 'shipments' | 'dispatch' | 'returns' | 'suppliers' | 'retailers' | 'catalog' | 'payments' | 'udharo' | 'receipts' | 'receipt'
  | 'reports' | 'activity' | 'team' | 'settings' | 'missing'

export interface Route {
  screen: Screen
  title: string
  id?: string
}

const SHARED: Record<string, Route> = {
  '': { screen: 'home', title: 'Dashboard' },
  returns: { screen: 'returns', title: 'Returns' },
  payments: { screen: 'payments', title: 'Payments' },
  receipts: { screen: 'receipts', title: 'Receipts' },
  reports: { screen: 'reports', title: 'Reports' },
  activity: { screen: 'activity', title: 'Activity log' },
  team: { screen: 'team', title: 'Team' },
  settings: { screen: 'settings', title: 'Settings' },
}

const PAGES: Record<Workspace, Record<string, Route>> = {
  retailer: {
    ...SHARED,
    inventory: { screen: 'inventory', title: 'Inventory' },
    'stock-moves': { screen: 'stock-moves', title: 'Stock movements' },
    expiry: { screen: 'expiry', title: 'Expiry tracker' },
    labels: { screen: 'labels', title: 'Print labels' },
    orders: { screen: 'orders', title: 'My orders' },
    'orders/new': { screen: 'cart', title: 'New order' },
    'orders/schedules': { screen: 'schedules', title: 'Scheduled orders' },
    'orders/quotes': { screen: 'quotes', title: 'Quote requests' },
    shipments: { screen: 'shipments', title: 'Shipments' },
    suppliers: { screen: 'suppliers', title: 'Suppliers' },
    udharo: { screen: 'udharo', title: 'Udharo' },
  },
  supplier: {
    ...SHARED,
    catalog: { screen: 'catalog', title: 'Product catalog' },
    orders: { screen: 'orders', title: 'Incoming orders' },
    quotes: { screen: 'quotes', title: 'Quotes' },
    dispatch: { screen: 'dispatch', title: 'Dispatch' },
    retailers: { screen: 'retailers', title: 'Retailers' },
    udharo: { screen: 'udharo', title: 'Udharo due' },
  },
}

const MISSING: Route = { screen: 'missing', title: 'Page not found' }

/** The screen for a path inside a workspace, given as the segments after its root: ["orders", "o_1032", "pay"]. */
export function matchRoute(ws: Workspace, segments: string[]): Route {
  const pages = PAGES[ws]
  const path = segments.join('/')
  if (Object.hasOwn(pages, path)) return pages[path]
  const [section, id, action] = segments
  if (section === 'orders' && id && segments.length === 2) return { screen: 'order', title: 'Order', id }
  if (ws === 'retailer' && section === 'orders' && id && action === 'pay' && segments.length === 3) return { screen: 'pay', title: 'Pay order', id }
  if (section === 'receipts' && id && segments.length === 2) return { screen: 'receipt', title: 'Receipt', id }
  return MISSING
}

/** "/retailer/orders/o_1032" -> ["orders", "o_1032"]. */
export function segmentsOf(pathname: string) {
  return pathname.split('/').filter(Boolean).slice(1).map((part) => {
    try {
      return decodeURIComponent(part)
    } catch {
      return part
    }
  })
}
