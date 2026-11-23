import type { Metadata } from 'next'
import { Workspace } from '@/components/workspace'
import { matchRoute } from '@/lib/routes'

export async function generateMetadata({ params }: { params: Promise<{ path?: string[] }> }): Promise<Metadata> {
  const { path = [] } = await params
  return { title: matchRoute('supplier', path).title }
}

export default function Page() {
  return <Workspace />
}
