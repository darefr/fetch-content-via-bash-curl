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

const REQUEST_TIMEOUT_MS = 45_000

/** Calls one server action. Every mutation in the app goes through here. */
export async function rpc<T = unknown>(action: string, input: object = {}, ws?: Workspace): Promise<T> {
  let response: Response
  try {
    response = await fetch('/api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, input, ws }),
      // A request that never comes back would otherwise leave its button spinning for good.
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(REQUEST_TIMEOUT_MS) : undefined,
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

type Predict = (s: AppState, input: Record<string, unknown>) => AppState

/**
 * Actions whose outcome is known before the server answers. The screen changes on the tap, and
 * the server's answer then confirms it or puts the old value back.
 */
const PREDICT: Record<string, Predict> = {
  'item.set': (s, { id, qty }) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, qty: Number(qty) } : i)) }),
  'cart.set': (s, { productId, qty }) => {
    const amount = Number(qty)
    if (amount <= 0) return { ...s, cart: s.cart.filter((l) => l.productId !== productId) }
    if (s.cart.some((l) => l.productId === productId)) return { ...s, cart: s.cart.map((l) => (l.productId === productId ? { ...l, qty: amount } : l)) }
    return { ...s, cart: [...s.cart, { productId: String(productId), qty: amount }] }
  },
  'cart.clear': (s) => ({ ...s, cart: [] }),
  'notice.read': (s, { id }) => ({ ...s, notices: s.notices.map((n) => (!id || n.id === id ? { ...n, read: true } : n)) }),
}

// Actions reach the server one at a time, in the order they were made, so a quick run of taps
// cannot arrive out of order. While any are on their way, the screen keeps what the user did
// instead of taking a slower answer that predates it.
let queue: Promise<unknown> = Promise.resolve()
let inFlight = 0
const waiting: (() => void)[] = []

function inOrder<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task)
  queue = run.catch(() => undefined)
  return run
}

/** Resolves once the workspace data on screen includes everything sent so far. */
async function caughtUp(revalidate: () => Promise<unknown>) {
  if (inFlight === 0) await revalidate().catch(() => undefined)
  // Another action started meanwhile: it brings the fresh data when it finishes.
  if (inFlight > 0) return new Promise<void>((resolve) => waiting.push(resolve))
  for (const resume of waiting.splice(0)) resume()
}

const WorkspaceContext = createContext<AppState | null>(null)

/** Holds the server-rendered state for the first paint; SWR keeps it fresh afterwards. */
export function AppProvider({ initial, children }: { initial: AppState; children: ReactNode }) {
  return <WorkspaceContext.Provider value={initial}>{children}</WorkspaceContext.Provider>
}

export function useApp(): AppState {
  const initial = useContext(WorkspaceContext)
  if (!initial) throw new Error('useApp must be used inside a workspace layout.')
  const { data } = useSWR(stateKey(initial.ws), fetchState, {
    fallbackData: initial,
    refreshInterval: 15_000,
    keepPreviousData: true,
    isPaused: () => inFlight > 0,
  })
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
      const key = ws ? stateKey(ws) : undefined
      if (key && initial && Object.hasOwn(PREDICT, action)) {
        void mutate<AppState>(key, (current) => PREDICT[action](current ?? initial, input as Record<string, unknown>), { revalidate: false })
      }

      inFlight += 1
      let outcome: ActResult<T>
      try {
        outcome = { ok: true, result: await inOrder(() => rpc<T>(action, input, ws)) }
      } catch (error) {
        const failure = error instanceof RpcError ? error : new RpcError('Something went wrong. Try again.', 0)
        outcome = { ok: false, error: failure.message, field: failure.field }
      }
      inFlight -= 1
      // Also after a failure, so anything shown ahead of the server goes back to what it holds.
      if (key) await caughtUp(() => mutate(key))

      if (!outcome.ok) {
        if (!options.quiet) toast.error(outcome.error)
      } else if (options.success) {
        toast.success(typeof options.success === 'function' ? options.success(outcome.result) : options.success)
      }
      return outcome
    },
    [mutate, ws, initial],
  )
}
