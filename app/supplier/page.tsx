import type { Metadata } from 'next'
import { SupplierHome } from '@/components/screens/supplier-home'

export const metadata: Metadata = { title: 'Dashboard' }

export default function Page() {
  return <SupplierHome />
}
