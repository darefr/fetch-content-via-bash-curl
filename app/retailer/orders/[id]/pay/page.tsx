import type { Metadata } from 'next'
import { PayView } from '@/components/screens/pay'

export const metadata: Metadata = { title: 'Pay order' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PayView id={id} />
}
