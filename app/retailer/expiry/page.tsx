import type { Metadata } from 'next'
import { ExpiryView } from '@/components/screens/stock-tools'

export const metadata: Metadata = { title: 'Expiry tracker' }

export default function Page() {
  return <ExpiryView />
}
