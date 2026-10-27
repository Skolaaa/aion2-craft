import { useEffect, useReducer } from 'react'
import type { ItemId } from '../domain/types.ts'
import { fetchPriceHistory, type PricePoint } from '../market/exchangeClient.ts'
import { RANGES, type Range } from './history.ts'

const answers = new Map<string, PricePoint[]>()
const requests = new Map<string, Promise<PricePoint[]>>()

function request(itemId: ItemId, worldId: number, range: Range, key: string) {
  let pending = requests.get(key)
  if (!pending) {
    pending = fetchPriceHistory(itemId, worldId, range, RANGES[range].bucket)
      .then((points) => {
        answers.set(key, points)
        return points
      })
      .catch((error: unknown) => {
        requests.delete(key)
        throw error
      })
    requests.set(key, pending)
  }
  return pending
}

/**
 * A range of an item on a world in the range's buckets: empty when the exchange has none, null until it answers. One
 * request per world, item and range, whose answer stays for the session, so the chart opens on the sparkline's seven
 * days in the same render.
 */
export function usePriceHistory(itemId: ItemId, worldId: number, range: Range = '7d'): PricePoint[] | null {
  const key = `${worldId}:${itemId}:${range}`
  const [, answered] = useReducer((count: number) => count + 1, 0)
  const points = answers.get(key) ?? null

  // Runs after every render until this key has an answer, so a failed request is retried on the next render.
  useEffect(() => {
    if (points !== null) return
    let live = true
    request(itemId, worldId, range, key).then(
      () => {
        if (live) answered()
      },
      () => undefined,
    )
    return () => {
      live = false
    }
  })

  return points
}
