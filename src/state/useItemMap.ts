import { useMemo } from 'react'
import type { ItemId } from '../domain/types.ts'
import { isFiniteNumber, usePersistentState, type Parse } from './usePersistentState.ts'

/** A value per item that the player entered, kept per world in localStorage. */
export interface ItemMap<T> {
  values: ReadonlyMap<ItemId, T>
  save(itemId: ItemId, value: T | null): void
  resetAll(): void
}

type Entries<T> = [ItemId, T][]

const NONE: Entries<never> = []

/** The stored pairs, keeping each one whose value `parse` accepts. */
export const parseEntries = <T>(parse: Parse<T>): Parse<Entries<T>> => (raw) => {
  if (!Array.isArray(raw)) return null
  const entries: Entries<T> = []
  for (const entry of raw) {
    if (!Array.isArray(entry) || !isFiniteNumber(entry[0])) continue
    const value = parse(entry[1])
    if (value !== null) entries.push([entry[0], value])
  }
  return entries
}

export function useItemMap<T>(key: string, parse: Parse<T>): ItemMap<T> {
  const parseAll = useMemo(() => parseEntries(parse), [parse])
  const [entries, update] = usePersistentState<Entries<T>>(key, NONE, parseAll)
  const values = useMemo(() => new Map(entries), [entries])
  return {
    values,
    save: (itemId, value) =>
      update((previous) => {
        const others = previous.filter(([id]) => id !== itemId)
        const kept = value === null ? null : parse(value)
        return kept === null ? others : [...others, [itemId, kept]]
      }),
    resetAll: () => update(() => NONE),
  }
}
