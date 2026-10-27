import { useMemo } from 'react'
import type { ItemId } from '../domain/types.ts'
import { isFiniteNumber, usePersistentState } from './usePersistentState.ts'

/** A number per item that the player entered, kept per world in localStorage. */
export interface ItemMap {
  values: ReadonlyMap<ItemId, number>
  save(itemId: ItemId, value: number | null): void
  resetAll(): void
}

type Entries = [ItemId, number][]

const NONE: Entries = []

const parser = (accept: (value: number) => boolean) => (raw: unknown): Entries | null => {
  if (!Array.isArray(raw)) return null
  const entries: Entries = []
  for (const entry of raw) {
    if (Array.isArray(entry) && isFiniteNumber(entry[0]) && isFiniteNumber(entry[1]) && accept(entry[1])) entries.push([entry[0], entry[1]])
  }
  return entries
}

export function useItemMap(key: string, accept: (value: number) => boolean): ItemMap {
  const parse = useMemo(() => parser(accept), [accept])
  const [entries, update] = usePersistentState<Entries>(key, NONE, parse)
  const values = useMemo(() => new Map(entries), [entries])
  return {
    values,
    save: (itemId, value) =>
      update((previous) => {
        const others = previous.filter(([id]) => id !== itemId)
        return value === null || !accept(value) ? others : [...others, [itemId, value]]
      }),
    resetAll: () => update(() => NONE),
  }
}
