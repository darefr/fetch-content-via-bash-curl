import type { Metadata } from 'next'
import { ReturnsView } from '@/components/screens/returns'

export const metadata: Metadata = { title: 'Returns' }

export default function Page() {
  return <ReturnsView />
}
