import type { Metadata } from 'next'
import { SettingsView } from '@/components/screens/admin'

export const metadata: Metadata = { title: 'Settings' }

export default function Page() {
  return <SettingsView />
}
