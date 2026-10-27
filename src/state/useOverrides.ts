import type { ItemId } from '../domain/types.ts'
import { useItemMap } from './useItemMap.ts'
import { isFiniteNumber } from './usePersistentState.ts'

export interface PriceOverrides {
  prices: ReadonlyMap<ItemId, number>
  save(itemId: ItemId, price: number | null): void
  resetAll(): void
}

/** A price the player typed: Kina above zero. */
export const parsePrice = (value: unknown): number | null => (isFiniteNumber(value) && value > 0 ? value : null)

export function useOverrides(worldId: number): PriceOverrides {
  const { values, save, resetAll } = useItemMap(`overrides:${worldId}`, parsePrice)
  return { prices: values, save, resetAll }
}
