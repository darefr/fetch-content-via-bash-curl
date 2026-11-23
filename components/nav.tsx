'use client'

import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, type ComponentProps } from 'react'

const WORKSPACES = ['/retailer', '/supplier']

function workspaceOf(pathname: string) {
  return WORKSPACES.find((root) => pathname === root || pathname.startsWith(`${root}/`))
}

/**
 * Every screen of a workspace is already in the browser together with its data, so moving
 * between them needs no trip to the server. Links that leave the workspace still take one.
 */
function staysInWorkspace(href: string) {
  const url = new URL(href, window.location.href)
  const root = workspaceOf(url.pathname)
  return url.origin === window.location.origin && root !== undefined && root === workspaceOf(window.location.pathname)
}

let scrollToTop = false

/** True once after a move to another screen, so the new screen can open at its top. */
export function takeScrollToTop() {
  const wanted = scrollToTop
  scrollToTop = false
  return wanted
}

function show(href: string, mode: 'push' | 'replace') {
  const url = new URL(href, window.location.href)
  const moved = url.pathname !== window.location.pathname
  const unchanged = !moved && url.search === window.location.search
  if (moved) scrollToTop = true
  // Next.js keeps usePathname and useSearchParams in step with the History API.
  if (mode === 'replace' || unchanged) window.history.replaceState(null, '', url)
  else window.history.pushState(null, '', url)
}

export function Link({ href, onNavigate, ...props }: ComponentProps<typeof NextLink>) {
  return (
    <NextLink
      href={href}
      prefetch={false}
      onNavigate={(event) => {
        onNavigate?.(event)
        if (typeof href === 'string' && staysInWorkspace(href)) {
          event.preventDefault()
          show(href, 'push')
        }
      }}
      {...props}
    />
  )
}

/** The same calls as the Next.js router, without the server trip for screens of this workspace. */
export function useNav() {
  const router = useRouter()
  return useMemo(
    () => ({
      push(href: string) {
        if (staysInWorkspace(href)) show(href, 'push')
        else router.push(href)
      },
      replace(href: string) {
        if (staysInWorkspace(href)) show(href, 'replace')
        else router.replace(href)
      },
      refresh() {
        router.refresh()
      },
    }),
    [router],
  )
}
