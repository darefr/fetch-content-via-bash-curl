import { cookies } from 'next/headers'
import type { Org, User, Workspace } from '@/lib/types'
import { db, save } from './db'
import { digest, newToken } from './hash'

const COOKIE = 'fs_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export interface Ctx {
  user: User
  org: Org
  ws: Workspace
}

export function workspaceFor(org: Org, wanted?: Workspace): Workspace {
  if (org.role === 'both') return wanted ?? 'retailer'
  return org.role
}

export function homeFor(ws: Workspace) {
  return ws === 'supplier' ? '/supplier' : '/retailer'
}

/** The signed-in user, their business and the workspace in use, or null when signed out. */
export async function getCtx(wanted?: Workspace): Promise<Ctx | null> {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  const store = db()
  const session = store.sessions.find((s) => s.hash === digest(token))
  if (!session || session.expires < Date.now()) return null
  const user = store.users.find((u) => u.id === session.userId)
  if (!user || !user.active) return null
  const org = store.orgs.find((o) => o.id === user.orgId)
  if (!org) return null
  return { user, org, ws: workspaceFor(org, wanted ?? session.ws) }
}

export async function startSession(userId: string, ws?: Workspace) {
  const store = db()
  const token = newToken()
  const now = Date.now()
  store.sessions = store.sessions.filter((s) => s.expires > now)
  store.sessions.push({ hash: digest(token), userId, ws, expires: now + MAX_AGE_SECONDS * 1000 })
  save()
  const production = process.env.NODE_ENV === 'production'
  ;(await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    // The v0 preview shows the app inside a frame on another site, where a Lax cookie is not
    // sent. Deployed, the app is opened directly, so the stricter Lax setting applies.
    sameSite: production ? 'lax' : 'none',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function setSessionWorkspace(ws: Workspace) {
  const token = (await cookies()).get(COOKIE)?.value
  const session = token && db().sessions.find((s) => s.hash === digest(token))
  if (session) {
    session.ws = ws
    save()
  }
}

export async function endSession() {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (token) {
    const store = db()
    store.sessions = store.sessions.filter((s) => s.hash !== digest(token))
    save()
  }
  jar.delete(COOKIE)
}

export function endSessionsFor(userId: string) {
  const store = db()
  store.sessions = store.sessions.filter((s) => s.userId !== userId)
}
