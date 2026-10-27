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

/** `entries` with `itemId` set to `value` where it already sits, appended when new, or removed when `value` is null. */
export function withEntry<T>(entries: Entries<T>, itemId: ItemId, value: T | null): Entries<T> {
  const at = entries.findIndex(([id]) => id === itemId)
  if (value === null) return at === -1 ? entries : entries.filter(([id]) => id !== itemId)
  if (at === -1) return [...entries, [itemId, value]]
  return entries.map((entry, index) => (index === at ? [itemId, value] : entry))
}

/** A `seed` shows in place of the stored map until the player edits an entry, which stores the whole map, as the slot is one value. */
export function useItemMap<T>(key: string, parse: Parse<T>, seed?: ReadonlyMap<ItemId, T>): ItemMap<T> {
  const parseAll = useMemo(() => parseEntries(parse), [parse])
  const [entries, update] = usePersistentState<Entries<T>>(key, NONE, parseAll, seed && [...seed])
  const values = useMemo(() => new Map(entries), [entries])
  return {
    values,
    save: (itemId, value) => update((previous) => withEntry(previous, itemId, value === null ? null : parse(value))),
    resetAll: () => update(() => NONE),
  }
}
