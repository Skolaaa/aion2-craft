import { describe, expect, it } from 'vitest'
import { DEFAULT_SCAN_SORT } from './scan.ts'
import { scanRow } from './scanRow.fixture.ts'
import { parseEntries } from './useItemMap.ts'
import { parseWatched, watchedRows } from './watchlist.ts'

const ROWS = [
  scanRow({ id: 1, name: 'Iron Sword', margin: 300 }),
  scanRow({ id: 2, name: 'Silk Robe', margin: -50 }),
  scanRow({ id: 3, name: 'Steel Sword', margin: 900 }),
  scanRow({ id: 4, name: 'Healing Potion', margin: null, status: 'unpriced' }),
]

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
