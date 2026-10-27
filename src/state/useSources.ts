import type { Forced, ItemId, Method } from '../domain/types.ts'
import { useItemMap } from './useItemMap.ts'

/** How the player insists each item is obtained on one world. The plan honours a choice wherever the item appears. */
export interface Sources {
  choices: Forced
  save(itemId: ItemId, method: Method | null): void
  resetAll(): void
}

const METHODS: readonly Method[] = ['buy', 'craft', 'morph']

export const parseMethod = (value: unknown): Method | null => METHODS.find((method) => method === value) ?? null

export function useSources(worldId: number): Sources {
  const { values, save, resetAll } = useItemMap(`sources:${worldId}`, parseMethod)
  return { choices: values, save, resetAll }
}
