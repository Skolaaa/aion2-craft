import { useEffect, useState } from 'react'
import type { Item } from '../domain/types.ts'
import { fetchExchangeCraft, type ExchangeCraft } from '../market/exchangeClient.ts'

export type Estimate = { status: 'none' } | { status: 'loading' } | { status: 'ready'; craft: ExchangeCraft }

const requests = new Map<string, Promise<ExchangeCraft | null>>()

// aion2.exchange models the Artisan's Splendent items only; asking for anything else is a 404.
const modelled = (item: Item | undefined): item is Item => item?.name.startsWith("Artisan's Splendent ") === true

export function useExchangeEstimate(item: Item | undefined, worldId: number, enabled: boolean): Estimate {
  const key = `${worldId}:${item?.id}`
  const [result, setResult] = useState<{ key: string; craft: ExchangeCraft | null } | null>(null)
  const wanted = enabled && modelled(item)
  const itemId = item?.id

  useEffect(() => {
    if (!wanted || itemId === undefined) return
    let live = true
    let request = requests.get(key)
    if (!request) {
      request = fetchExchangeCraft(itemId, worldId).catch(() => null)
      requests.set(key, request)
    }
    void request.then((craft) => {
      if (live) setResult({ key, craft })
    })
    return () => {
      live = false
    }
  }, [wanted, key, itemId, worldId])

  if (!wanted) return { status: 'none' }
  if (result?.key !== key) return { status: 'loading' }
  return result.craft ? { status: 'ready', craft: result.craft } : { status: 'none' }
}
