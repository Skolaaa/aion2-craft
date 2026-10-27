import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DepthLadder, ItemId, PlanResult, PriceBook } from '../domain/types.ts'
import { loadLadders, refreshLadders } from '../market/exchangeClient.ts'
import { bulkBuys } from './answer.ts'
import type { Freshness } from './useFreshness.ts'

export interface LadderFeed {
  ladders: ReadonlyMap<ItemId, DepthLadder>
  request(itemIds: readonly ItemId[]): void
}

export function useLadders(worldId: number): LadderFeed {
  const [state, setState] = useState(() => ({ worldId, ladders: loadLadders(worldId) }))
  if (state.worldId !== worldId) setState({ worldId, ladders: loadLadders(worldId) })

  const request = useCallback(
    (itemIds: readonly ItemId[]) => {
      refreshLadders(worldId, itemIds).then(
        (ladders) => {
          if (ladders) setState((current) => (current.worldId === worldId ? { worldId, ladders } : current))
        },
        // A failed ladder leaves the flat price in place; the next plan asks again.
        () => undefined,
      )
    },
    [worldId],
  )

  return useMemo(() => ({ ladders: state.ladders, request }), [state.ladders, request])
}

/** Asks for the ladders of what `plan` buys in bulk. The plan then re-runs with them and may ask for more. */
export function useBulkLadders(plan: PlanResult | null, prices: PriceBook, freshness: Freshness, request: LadderFeed['request']) {
  useEffect(() => {
    if (plan && !freshness.refreshing) request(bulkBuys(plan, prices))
  }, [plan, prices, freshness.refreshing, request])
}
