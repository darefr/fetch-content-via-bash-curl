import type { Metadata } from 'next'
import { DispatchView } from '@/components/screens/shipments'

export const metadata: Metadata = { title: 'Dispatch' }

export default function Page() {
  return <DispatchView />
}
