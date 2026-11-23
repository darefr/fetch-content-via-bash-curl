'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, type ReactNode } from 'react'
import { takeScrollToTop } from '@/components/nav'
import { ActivityView, SettingsView, TeamView } from '@/components/screens/admin'
import { CartView } from '@/components/screens/cart'
import { CatalogView } from '@/components/screens/catalog'
import { InventoryView } from '@/components/screens/inventory'
import { MissingView } from '@/components/screens/missing'
import { PaymentsView, ReceiptsView, ReceiptView, UdharoView } from '@/components/screens/money'
import { OrderDetailView, OrdersView } from '@/components/screens/orders'
import { RetailersView, SuppliersView } from '@/components/screens/partners'
import { PayView } from '@/components/screens/pay'
import { QuotesView } from '@/components/screens/quotes'
import { ReportsView } from '@/components/screens/reports'
import { RetailerHome } from '@/components/screens/retailer-home'
import { ReturnsView } from '@/components/screens/returns'
import { SchedulesView } from '@/components/screens/schedules'
import { DispatchView, ShipmentsView } from '@/components/screens/shipments'
import { ExpiryView, LabelsView, StockMovesView } from '@/components/screens/stock-tools'
import { SupplierHome } from '@/components/screens/supplier-home'
import { useApp } from '@/lib/client'
import { matchRoute, segmentsOf, type Route, type Screen } from '@/lib/routes'
import type { Workspace as WorkspaceName } from '@/lib/types'

const SCREENS: Record<Screen, (route: Route, ws: WorkspaceName) => ReactNode> = {
  home: (_, ws) => (ws === 'retailer' ? <RetailerHome /> : <SupplierHome />),
  inventory: () => <InventoryView />,
  'stock-moves': () => <StockMovesView />,
  expiry: () => <ExpiryView />,
  labels: () => <LabelsView />,
  orders: () => <OrdersView />,
  cart: () => <CartView />,
  schedules: () => <SchedulesView />,
  quotes: () => <QuotesView />,
  order: (route) => <OrderDetailView id={route.id ?? ''} />,
  pay: (route) => <PayView id={route.id ?? ''} />,
  shipments: () => <ShipmentsView />,
  dispatch: () => <DispatchView />,
  returns: () => <ReturnsView />,
  suppliers: () => <SuppliersView />,
  retailers: () => <RetailersView />,
  catalog: () => <CatalogView />,
  payments: () => <PaymentsView />,
  udharo: () => <UdharoView />,
  receipts: () => <ReceiptsView />,
  receipt: (route) => <ReceiptView id={route.id ?? ''} />,
  reports: () => <ReportsView />,
  activity: () => <ActivityView />,
  team: () => <TeamView />,
  settings: () => <SettingsView />,
  missing: () => <MissingView />,
}

function Screen({ route, ws }: { route: Route; ws: WorkspaceName }) {
  return SCREENS[route.screen](route, ws)
}

/**
 * Shows the screen for the current address. The whole workspace and its data are loaded once,
 * so changing screen is a redraw in the browser and never waits on the network.
 */
export function Workspace() {
  const s = useApp()
  const pathname = usePathname()
  const route = matchRoute(s.ws, segmentsOf(pathname))

  useLayoutEffect(() => {
    if (takeScrollToTop()) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  useEffect(() => {
    document.title = `${route.title} | FeriStock`
  }, [route.title])

  return (
    <>
      {/* Read out by screen readers when the screen changes, as a page load would be. */}
      <p aria-live="polite" className="sr-only">{route.title}</p>
      {/* Keyed by address so a screen starts fresh, as a separate page would. */}
      <Screen key={pathname} route={route} ws={s.ws} />
    </>
  )
}
