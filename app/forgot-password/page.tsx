import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthFrame } from '@/components/auth'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Password help' }

export default function ForgotPasswordPage() {
  return (
    <AuthFrame>
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">Reset by email is not switched on yet. Here is how to get back in today.</p>
        </div>
        <ul className="flex flex-col gap-3">
          <li className="rounded-xl border bg-background p-4">
            <p className="text-sm font-semibold">You are a manager or staff member</p>
            <p className="text-sm leading-relaxed text-muted-foreground">Ask the owner of your business. They can set a new password for you from Team in their workspace.</p>
          </li>
          <li className="rounded-xl border bg-background p-4">
            <p className="text-sm font-semibold">You are the owner</p>
            <p className="text-sm leading-relaxed text-muted-foreground">Owner reset by email arrives when FeriStock moves to its production database and mail service. Until then, keep your password somewhere safe.</p>
          </li>
          <li className="rounded-xl border bg-background p-4">
            <p className="text-sm font-semibold">You only want to look around</p>
            <p className="text-sm leading-relaxed text-muted-foreground">The demo accounts on the sign-in page open with one tap and need no password.</p>
          </li>
        </ul>
        <Button variant="outline" nativeButton={false} render={<Link href="/login" />} className="h-10 w-full">
          <ArrowLeft data-icon="inline-start" aria-hidden />
          Back to sign in
        </Button>
      </div>
    </AuthFrame>
  )
}
