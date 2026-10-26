import { useMemo } from 'react'
import type { ItemId } from '../domain/types.ts'
import { isFiniteNumber, usePersistentState } from './usePersistentState.ts'

export interface PriceOverrides {
  prices: ReadonlyMap<ItemId, number>
  save(itemId: ItemId, price: number | null): void
  resetAll(): void
}

type Entries = [ItemId, number][]

const NONE: Entries = []

function parseEntries(raw: unknown): Entries | null {
  if (!Array.isArray(raw)) return null
  const entries: Entries = []
  for (const entry of raw) {
    if (Array.isArray(entry) && isFiniteNumber(entry[0]) && isFiniteNumber(entry[1]) && entry[1] > 0) entries.push([entry[0], entry[1]])
  }
  return entries
}

// Prices differ by world, so each world keeps its own list.
export function useOverrides(worldId: number): PriceOverrides {
  const [entries, update] = usePersistentState<Entries>(`overrides:${worldId}`, NONE, parseEntries)
  const prices = useMemo(() => new Map(entries), [entries])
  return {
    prices,
    save: (itemId, price) =>
      update((previous) => {
        const others = previous.filter(([id]) => id !== itemId)
        return price === null ? others : [...others, [itemId, price]]
      }),
    resetAll: () => update(() => NONE),
  }
}
