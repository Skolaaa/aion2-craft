import { useEffect, useState } from 'react'
import type { ItemId } from '../domain/types.ts'
import { fetchExchangeCraft, type ExchangeCraft } from '../market/exchangeClient.ts'

const requests = new Map<string, Promise<ExchangeCraft | null>>()

function request(itemId: ItemId, worldId: number, key: string) {
  let pending = requests.get(key)
  if (!pending) {
    pending = fetchExchangeCraft(itemId, worldId).catch((error: unknown) => {
      requests.delete(key)
      throw error
    })
    requests.set(key, pending)
  }
  return pending
}

export function useExchangeEstimate(itemId: ItemId, worldId: number): ExchangeCraft | null {
  const key = `${worldId}:${itemId}`
  const [result, setResult] = useState<{ key: string; craft: ExchangeCraft | null } | null>(null)
  const answered = result?.key === key

  // Runs after every render until this key has an answer, so a failed request is retried on the next render.
  useEffect(() => {
    if (answered) return
    let live = true
    request(itemId, worldId, key).then(
      (craft) => {
        if (live) setResult({ key, craft })
      },
      () => undefined,
    )
    return () => {
      live = false
    }
  })

  return answered ? result.craft : null
}
