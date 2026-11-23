import type { Metadata } from 'next'
import { SuppliersView } from '@/components/screens/partners'

export const metadata: Metadata = { title: 'Suppliers' }

export default function Page() {
  return <SuppliersView />
}
