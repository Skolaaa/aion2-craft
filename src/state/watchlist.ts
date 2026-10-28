import { useMemo } from 'react'
import type { ItemId } from '../domain/types.ts'
import type { WorldId } from '../market/worlds.ts'
import { sortScan, type ScanRow, type ScanSort } from './scan.ts'
import { useItemMap } from './useItemMap.ts'

/** The items the player keeps an eye on, on one world, in the order pinned. */
export interface Watchlist {
  watched: ReadonlySet<ItemId>
  toggle(itemId: ItemId): void
  resetAll(): void
}

export const parseWatched = (value: unknown): true | null => (value === true ? true : null)

export function useWatchlist(worldId: WorldId): Watchlist {
  const { values, save, resetAll } = useItemMap(`watch:${worldId}`, parseWatched)
  const watched = useMemo(() => new Set(values.keys()), [values])
  return { watched, toggle: (itemId) => save(itemId, watched.has(itemId) ? null : true), resetAll }
}

/** The scan rows of the watched items, in `sort` order, hidden ones included so a watched item that lost its price stays visible with its pill. */
export function watchedRows(rows: readonly ScanRow[], watched: ReadonlySet<ItemId>, sort: ScanSort): ScanRow[] {
  return sortScan(rows.filter((row) => watched.has(row.item.id)), sort)
}
