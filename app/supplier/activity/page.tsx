import type { Metadata } from 'next'
import { ActivityView } from '@/components/screens/admin'

export const metadata: Metadata = { title: 'Activity log' }

export default function Page() {
  return <ActivityView />
}
