import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthFrame, RegisterForm } from '@/components/auth'
import { getCtx, homeFor } from '@/lib/server/auth'
import type { Role } from '@/lib/types'

export const metadata: Metadata = { title: 'Create account' }

const ROLES: Role[] = ['retailer', 'supplier', 'both']

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const ctx = await getCtx()
  if (ctx) redirect(homeFor(ctx.ws))
  const { role } = await searchParams
  return (
    <AuthFrame>
      <RegisterForm initialRole={ROLES.find((r) => r === role)} />
    </AuthFrame>
  )
}
