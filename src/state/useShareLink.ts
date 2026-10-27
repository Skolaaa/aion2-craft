import { useEffect, useState } from 'react'
import { peekSetup } from './setup.ts'
import { openLink, type Opened } from './shareLink.ts'
import { readyDirectory, type WorldsState } from './useWorlds.ts'

/**
 * The plan this page load opens, or 'waiting' while it needs the world list. The first answer
 * sticks, because a later retry flips the world list back to loading and must not unmount the session.
 */
export function useLinkOpening(worlds: WorldsState): Opened | 'waiting' {
  const [search] = useState(() => window.location.search)
  const [stored] = useState(peekSetup)
  const [latched, setLatched] = useState<Opened | null>(null)
  const opened = latched ?? openLink(search, stored, readyDirectory(worlds))
  if (latched === null && opened !== 'waiting') setLatched(opened)
  return opened
}

// WebKit throws after 100 replaceState calls in 30 seconds and the mastery slider changes per pixel,
// so the address bar trails the plan by half a second. Copy link reads the returned URL instead.
const SETTLE_MS = 500

/** Keeps the address bar on `query` and returns the absolute link for it. */
export function useAddressBar(query: string): string {
  useEffect(() => {
    const write = () => {
      const { pathname, search, hash } = window.location
      if (search === query) return
      try {
        history.replaceState(history.state, '', pathname + query + hash)
      } catch {
        // A frame that refuses replaceState only costs the live address bar.
      }
    }
    const timer = setTimeout(write, SETTLE_MS)
    window.addEventListener('pagehide', write)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pagehide', write)
    }
  }, [query])
  return window.location.origin + window.location.pathname + query
}
