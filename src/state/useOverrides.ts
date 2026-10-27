import type { ItemId } from '../domain/types.ts'
import { useItemMap } from './useItemMap.ts'

export interface PriceOverrides {
  prices: ReadonlyMap<ItemId, number>
  save(itemId: ItemId, price: number | null): void
  resetAll(): void
}

const positive = (price: number) => price > 0

export function useOverrides(worldId: number): PriceOverrides {
  const { values, save, resetAll } = useItemMap(`overrides:${worldId}`, positive)
  return { prices: values, save, resetAll }
}
