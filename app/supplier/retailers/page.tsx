import type { Metadata } from 'next'
import { RetailersView } from '@/components/screens/partners'

export const metadata: Metadata = { title: 'Retailers' }

export default function Page() {
  return <RetailersView />
}
