import { useState } from 'react'
import { age, isStale } from './format.ts'
import { useNow } from './useNow.ts'
import type { PriceFeed } from './usePrices.ts'

const NEWEST = 'These are the newest. aion2.exchange updates each world once an hour.'

export interface Freshness {
  pending: boolean
  capturedAt: string | null
  age: string | null
  stale: boolean
  refreshing: boolean
  note: string | null
  refresh(): Promise<void>
}

export function useFreshness(feed: PriceFeed): Freshness {
  const now = useNow()
  const [note, setNote] = useState<string | null>(null)
  const captured = feed.snapshot?.capturedAt ?? null
  return {
    pending: feed.pending,
    capturedAt: captured,
    age: captured === null ? null : age(captured, now),
    stale: captured !== null && isStale(captured, now),
    refreshing: feed.status === 'loading',
    note,
    refresh: async () => {
      setNote(null)
      if ((await feed.refresh()) === 'recent') setNote(NEWEST)
    },
  }
}
