import { describe, expect, it } from 'vitest'
import type { PlanResult } from '../domain/types.ts'
import type { TargetStatus, Verdict } from './answer.ts'
import { DEFAULT_SCAN_SORT, type ScanRow } from './scan.ts'
import { parseEntries } from './useItemMap.ts'
import { parseWatched, watchedRows } from './watchlist.ts'

const VERDICT: Record<TargetStatus, Verdict> = {
  ready: { kind: 'even' },
  unpriced: { kind: 'missing', items: [] },
  locked: { kind: 'blocked', itemId: 0, profession: 'Blacksmithing', level: 50, mastery: 10 },
}

function row(id: number, name: string, margin: number | null, status: TargetStatus = 'ready'): ScanRow {
  return {
    item: { id, name, grade: 'Rare', icon: null },
    profession: 'Blacksmithing',
    level: 10,
    plan: {} as PlanResult,
    verdict: VERDICT[status],
    status,
    cost: 1000,
    lowest: margin === null ? null : 1000 + margin,
    sold: null,
    listings: 1,
    margin,
    marginPct: margin === null ? null : margin / 1000,
  }
}

const ROWS = [row(1, 'Iron Sword', 300), row(2, 'Silk Robe', -50), row(3, 'Steel Sword', 900), row(4, 'Healing Potion', null, 'unpriced')]

describe('parseWatched', () => {
  it('accepts only true', () => {
    expect(parseWatched(true)).toBe(true)
    for (const value of [false, 1, 'true', null, undefined, {}, []]) expect(parseWatched(value)).toBeNull()
  })

  it('keeps only the pairs stored as true', () => {
    const watched = parseEntries(parseWatched)
    expect(watched([[1, true], [2, false], [3, 1], [4, true], ['5', true], [6], null])).toEqual([[1, true], [4, true]])
  })
})

describe('watchedRows', () => {
  const names = (watched: number[], sort = DEFAULT_SCAN_SORT) => watchedRows(ROWS, new Set(watched), sort).map((r) => r.item.name)

  it('keeps only the watched rows and sorts them by the given sort', () => {
    expect(names([2, 3, 1])).toEqual(['Steel Sword', 'Iron Sword', 'Silk Robe'])
    expect(names([2, 3, 1], { key: 'item', direction: 'asc' })).toEqual(['Iron Sword', 'Silk Robe', 'Steel Sword'])
  })

  it('keeps a watched row that is not ready, after the rows with a margin', () => {
    expect(names([4, 1])).toEqual(['Iron Sword', 'Healing Potion'])
  })

  it('drops an id with no scan row and shows nothing for an empty set', () => {
    expect(names([1, 99])).toEqual(['Iron Sword'])
    expect(names([])).toEqual([])
  })
})
