import type { ItemId, Owned } from '../domain/types.ts'
import { useItemMap } from './useItemMap.ts'
import { isFiniteNumber } from './usePersistentState.ts'

/** What the player holds on one world. Whole units, one or more. */
export interface OwnedStock {
  counts: Owned
  save(itemId: ItemId, count: number | null): void
  resetAll(): void
}

export const MAX_OWNED = 999_999

export const isCount = (count: number) => Number.isInteger(count) && count >= 1 && count <= MAX_OWNED

export const parseCount = (value: unknown): number | null => (isFiniteNumber(value) && isCount(value) ? value : null)

export function useOwned(worldId: number): OwnedStock {
  const { values, save, resetAll } = useItemMap(`owned:${worldId}`, parseCount)
  return { counts: values, save, resetAll }
}
