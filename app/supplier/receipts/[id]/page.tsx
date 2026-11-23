import type { Metadata } from 'next'
import { ReceiptView } from '@/components/screens/money'

export const metadata: Metadata = { title: 'Receipt' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ReceiptView id={id} />
}
