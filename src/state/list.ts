import { useMemo } from 'react'
import type { ItemId, Wanted } from '../domain/types.ts'
import type { WorldId } from '../market/worlds.ts'
import type { CraftIndex } from './craftables.ts'
import { parseQuantity } from './target.ts'
import { useItemMap } from './useItemMap.ts'

/** What the player means to craft on one world, in the order added. The planner takes it as is. */
export type List = Wanted

/**
 * Bounds the link (about 20 characters a line), the ladder queue (one request per bulk item, 150 ms apart)
 * and the plan tree. Two dozen distinct crafts is more than a player makes in a sitting.
 */
export const MAX_LINES = 24

/** Whether `itemId` can be set on `list`: it is already there, or the list is not full. */
export const hasRoom = (list: List, itemId: ItemId): boolean => list.has(itemId) || list.size < MAX_LINES

/** The lines this side can craft. The one place a stale id (a recipe a data refresh removed) is dropped. */
export const makeable = (list: List, index: CraftIndex): List => new Map([...list].filter(([itemId]) => index.byId.has(itemId)))

/** The player's list on one world. Same shape as `OwnedStock`: a map out, `save` in, `null` removes. */
export interface ListState {
  wanted: List
  save(itemId: ItemId, quantity: number | null): void
  resetAll(): void
}

/**
 * Kept per world like stock. `seed` is a link's list for the world it opened on: it shows in place of
 * storage and reaches storage once the player edits a line. A new line past MAX_LINES is ignored.
 */
export function useList(worldId: WorldId, index: CraftIndex, seed: List | null): ListState {
  const items = useItemMap(`list:${worldId}`, parseQuantity, seed ?? undefined)
  const wanted = useMemo(() => makeable(items.values, index), [items.values, index])
  return {
    wanted,
    save: (itemId, quantity) => {
      if (quantity === null || hasRoom(items.values, itemId)) items.save(itemId, quantity)
    },
    resetAll: items.resetAll,
  }
}
