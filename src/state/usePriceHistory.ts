import { useEffect, useState } from 'react'
import type { ItemId } from '../domain/types.ts'
import { fetchPriceHistory, type PricePoint } from '../market/exchangeClient.ts'
import { RANGES, type Range } from './history.ts'

const requests = new Map<string, Promise<PricePoint[]>>()

function request(itemId: ItemId, worldId: number, range: Range, key: string) {
  let pending = requests.get(key)
  if (!pending) {
    pending = fetchPriceHistory(itemId, worldId, range, RANGES[range].bucket).catch((error: unknown) => {
      requests.delete(key)
      throw error
    })
    requests.set(key, pending)
  }
  return pending
}

/** A range of an item on a world in the range's buckets: empty when the exchange has none, null until it answers. */
export function usePriceHistory(itemId: ItemId, worldId: number, range: Range = '7d'): PricePoint[] | null {
  const key = `${worldId}:${itemId}:${range}`
  const [result, setResult] = useState<{ key: string; points: PricePoint[] } | null>(null)
  const answered = result?.key === key

  // Runs after every render until this key has an answer, so a failed request is retried on the next render.
  useEffect(() => {
    if (answered) return
    let live = true
    request(itemId, worldId, range, key).then(
      (points) => {
        if (live) setResult({ key, points })
      },
      () => undefined,
    )
    return () => {
      live = false
    }
  })

  return answered ? result.points : null
}
