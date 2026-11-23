import type { Metadata } from 'next'
import { TeamView } from '@/components/screens/admin'

export const metadata: Metadata = { title: 'Team' }

export default function Page() {
  return <TeamView />
}
