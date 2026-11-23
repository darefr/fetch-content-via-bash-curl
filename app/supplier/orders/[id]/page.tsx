import type { Metadata } from 'next'
import { OrderDetailView } from '@/components/screens/orders'

export const metadata: Metadata = { title: 'Order' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OrderDetailView id={id} />
}
