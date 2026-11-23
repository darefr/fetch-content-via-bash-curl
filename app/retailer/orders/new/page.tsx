import type { Metadata } from 'next'
import { CartView } from '@/components/screens/cart'

export const metadata: Metadata = { title: 'New order' }

export default function Page() {
  return <CartView />
}
