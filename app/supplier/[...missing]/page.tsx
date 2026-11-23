import type { Metadata } from 'next'
import { MissingView } from '@/components/screens/missing'

export const metadata: Metadata = { title: 'Page not found' }

export default function Page() {
  return <MissingView />
}
