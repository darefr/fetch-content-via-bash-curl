import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthFrame, LoginForm } from '@/components/auth'
import { getCtx, homeFor } from '@/lib/server/auth'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const ctx = await getCtx()
  if (ctx) redirect(homeFor(ctx.ws))
  const { expired } = await searchParams
  return (
    <AuthFrame>
      <LoginForm expired={expired === '1'} />
    </AuthFrame>
  )
}
