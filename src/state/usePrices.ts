import { useCallback, useEffect, useMemo, useState } from 'react'
import { tradeableItems } from '../domain/catalog.ts'
import type { Catalog } from '../domain/types.ts'
import { loadSnapshot, refreshSnapshot, type QuoteSnapshot } from '../market/exchangeClient.ts'
import type { World } from '../market/worlds.ts'
import { messageOf } from './feedError.ts'

export type RefreshOutcome = 'updated' | 'recent' | 'failed'

export interface PriceFeed {
  status: 'loading' | 'ready' | 'failed'
  snapshot: QuoteSnapshot | null
  pending: boolean
  message: string | null
  refresh(): Promise<RefreshOutcome>
}

interface Feed {
  worldId: number
  status: PriceFeed['status']
  snapshot: QuoteSnapshot | null
  message: string | null
}

export function usePrices(world: World, catalog: Catalog): PriceFeed {
  const itemIds = useMemo(() => tradeableItems(catalog), [catalog])
  const [feed, setFeed] = useState<Feed>(() => ({ worldId: world.id, status: 'loading', snapshot: loadSnapshot(world.id), message: null }))

  useEffect(() => {
    let live = true
    setFeed({ worldId: world.id, status: 'loading', snapshot: loadSnapshot(world.id), message: null })
    refreshSnapshot(world.id, itemIds).then(
      (snapshot) => {
        if (live) setFeed({ worldId: world.id, status: 'ready', snapshot, message: null })
      },
      (error: unknown) => {
        if (live) setFeed({ worldId: world.id, status: 'failed', snapshot: loadSnapshot(world.id), message: messageOf(error) })
      },
    )
    return () => {
      live = false
    }
  }, [world.id, itemIds])

  const current = feed.worldId === world.id ? feed : { ...feed, status: 'loading' as const, snapshot: loadSnapshot(world.id), message: null }

  const refresh = useCallback(async (): Promise<RefreshOutcome> => {
    const before = current.snapshot?.fetchedAt
    setFeed({ ...current, worldId: world.id, status: 'loading' })
    try {
      const snapshot = await refreshSnapshot(world.id, itemIds)
      setFeed({ worldId: world.id, status: 'ready', snapshot, message: null })
      return snapshot.fetchedAt === before ? 'recent' : 'updated'
    } catch (error) {
      setFeed({ worldId: world.id, status: 'failed', snapshot: loadSnapshot(world.id), message: messageOf(error) })
      return 'failed'
    }
  }, [current, world.id, itemIds])

  const { status, snapshot, message } = current
  return { status, snapshot, pending: status === 'loading' && snapshot === null, message, refresh }
}
