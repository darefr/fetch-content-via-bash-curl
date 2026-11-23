import type { Metadata } from 'next'
import { QuotesView } from '@/components/screens/quotes'

export const metadata: Metadata = { title: 'Quotes' }

export default function Page() {
  return <QuotesView />
}
