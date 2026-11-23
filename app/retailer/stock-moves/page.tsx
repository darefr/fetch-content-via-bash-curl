import type { Metadata } from 'next'
import { StockMovesView } from '@/components/screens/stock-tools'

export const metadata: Metadata = { title: 'Stock movements' }

export default function Page() {
  return <StockMovesView />
}
