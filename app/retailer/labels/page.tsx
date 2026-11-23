import type { Metadata } from 'next'
import { LabelsView } from '@/components/screens/stock-tools'

export const metadata: Metadata = { title: 'Print labels' }

export default function Page() {
  return <LabelsView />
}
