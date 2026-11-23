import type { Metadata } from 'next'
import { UdharoView } from '@/components/screens/money'

export const metadata: Metadata = { title: 'Udharo due' }

export default function Page() {
  return <UdharoView />
}
