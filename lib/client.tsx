'use client'

import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { toast } from 'sonner'
import useSWR, { useSWRConfig } from 'swr'
import type { AppState, Workspace } from '@/lib/types'

export class RpcError extends Error {
  constructor(message: string, public status: number, public field?: string) {
    super(message)
  }
}

/** Calls one server action. Every mutation in the app goes through here. */
export async function rpc<T = unknown>(action: string, input: object = {}, ws?: Workspace): Promise<T> {
  let response: Response
  try {
    response = await fetch('/api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, input, ws }),
    })
  } catch {
    throw new RpcError('No connection. Check your internet and try again.', 0)
  }
  const body = await response.json().catch(() => null)
  if (response.status === 401 && body?.code === 'auth') {
    window.location.assign('/login?expired=1')
    throw new RpcError(body.error, 401)
  }
  if (!response.ok || !body?.ok) throw new RpcError(body?.error ?? 'Something went wrong. Try again.', response.status, body?.field)
  return body.result as T
}

const stateKey = (ws: Workspace) => `/api/state?ws=${ws}`

async function fetchState(url: string): Promise<AppState> {
  const response = await fetch(url, { credentials: 'same-origin' })
  if (response.status === 401) {
    window.location.assign('/login?expired=1')
    throw new Error('Your session has ended.')
  }
  if (!response.ok) throw new Error('Could not load your workspace.')
  return response.json()
}

const WorkspaceContext = createContext<AppState | null>(null)

/** Holds the server-rendered state for the first paint; SWR keeps it fresh afterwards. */
export function AppProvider({ initial, children }: { initial: AppState; children: ReactNode }) {
  return <WorkspaceContext.Provider value={initial}>{children}</WorkspaceContext.Provider>
}

export function useApp(): AppState {
  const initial = useContext(WorkspaceContext)
  if (!initial) throw new Error('useApp must be used inside a workspace layout.')
  const { data } = useSWR(stateKey(initial.ws), fetchState, { fallbackData: initial, refreshInterval: 15_000, keepPreviousData: true })
  return data ?? initial
}

export type ActResult<T> = { ok: true; result: T } | { ok: false; error: string; field?: string }

/** Runs an action, refreshes the workspace data and reports the outcome in a toast. */
export function useAct() {
  const initial = useContext(WorkspaceContext)
  const { mutate } = useSWRConfig()
  const ws = initial?.ws
  return useCallback(
    async function act<T = unknown>(
      action: string,
      input: object = {},
      options: { success?: string | ((result: T) => string); quiet?: boolean } = {},
    ): Promise<ActResult<T>> {
      try {
        const result = await rpc<T>(action, input, ws)
        if (ws) await mutate(stateKey(ws))
        if (options.success) toast.success(typeof options.success === 'function' ? options.success(result) : options.success)
        return { ok: true, result }
      } catch (error) {
        const failure = error instanceof RpcError ? error : new RpcError('Something went wrong. Try again.', 0)
        if (!options.quiet) toast.error(failure.message)
        return { ok: false, error: failure.message, field: failure.field }
      }
    },
    [mutate, ws],
  )
}
