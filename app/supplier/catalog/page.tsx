import type { Metadata } from 'next'
import { CatalogView } from '@/components/screens/catalog'

export const metadata: Metadata = { title: 'Product catalog' }

export default function Page() {
  return <CatalogView />
}
