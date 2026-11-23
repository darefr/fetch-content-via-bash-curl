import type { Metadata } from 'next'
import { SchedulesView } from '@/components/screens/schedules'

export const metadata: Metadata = { title: 'Scheduled orders' }

export default function Page() {
  return <SchedulesView />
}
