import type { Metadata } from 'next'
import { OrdersView } from '@/components/screens/orders'

export const metadata: Metadata = { title: 'My orders' }

export default function Page() {
  return <OrdersView />
}
