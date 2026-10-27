import { useCallback, useMemo, useState } from 'react'
import type { DepthLadder, ItemId } from '../domain/types.ts'
import { loadLadders, refreshLadders } from '../market/exchangeClient.ts'

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
