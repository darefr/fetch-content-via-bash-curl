'use client'

import { SearchX } from 'lucide-react'
import { EmptyState } from '@/components/kit'
import { Link } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { useApp } from '@/lib/client'

export function MissingView({ what = 'page' }: { what?: string }) {
  const s = useApp()
  return (
    <div className="rounded-xl border bg-card">
      <EmptyState
        icon={SearchX}
        title={`This ${what} could not be found`}
        text="It may belong to another business, or the link may be out of date."
        action={<Button nativeButton={false} render={<Link href={`/${s.ws}`} />}>Back to the dashboard</Button>}
      />
    </div>
  )
}
