import type { Metadata } from 'next'
import { PaymentsView } from '@/components/screens/money'

export const metadata: Metadata = { title: 'Payments' }

export default function Page() {
  return <PaymentsView />
}
