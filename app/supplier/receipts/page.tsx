import type { Metadata } from 'next'
import { ReceiptsView } from '@/components/screens/money'

export const metadata: Metadata = { title: 'Receipts' }

export default function Page() {
  return <ReceiptsView />
}
