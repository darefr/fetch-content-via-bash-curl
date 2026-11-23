import type { Metadata } from 'next'
import { RetailerHome } from '@/components/screens/retailer-home'

export const metadata: Metadata = { title: 'Dashboard' }

export default function Page() {
  return <RetailerHome />
}
