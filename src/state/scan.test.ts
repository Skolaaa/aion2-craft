import { describe, expect, it } from 'vitest'
import { bestMargins, DEFAULT_SCAN_SORT, nextSort, sortScan, viewScan, type ScanQuery } from './scan.ts'
import { scanRow } from './scanRow.fixture.ts'

const ROWS = [
  scanRow({ name: 'Iron Sword', margin: 300 }),
  scanRow({ name: 'Silk Robe', profession: 'Tailoring', margin: -50 }),
  scanRow({ name: 'Steel Sword', margin: 900 }),
  scanRow({ name: 'Healing Potion', profession: 'Alchemy', margin: null, status: 'unpriced', cost: null }),
  scanRow({ name: 'Dragon Sword', margin: null, status: 'locked', cost: null }),
  scanRow({ name: 'Bread', profession: 'Cooking', margin: null }),
]

const query = (change: Partial<ScanQuery> = {}): ScanQuery => ({ profession: null, name: '', showHidden: false, sort: DEFAULT_SCAN_SORT, ...change })
const names = (change: Partial<ScanQuery> = {}) => viewScan(ROWS, query(change)).rows.map((r) => r.item.name)

describe('viewScan', () => {
  it('sorts by margin high to low by default and puts rows without a margin last', () => {
    expect(names()).toEqual(['Steel Sword', 'Iron Sword', 'Silk Robe', 'Bread'])
  })

  it('hides rows that need a price or mastery, counts them, and shows them on request', () => {
    expect(viewScan(ROWS, query()).hidden).toBe(2)
    expect(names({ showHidden: true })).toHaveLength(6)
    expect(viewScan(ROWS, query({ showHidden: true })).hidden).toBe(2)
  })

  it('filters by profession and by every word of the name', () => {
    expect(names({ profession: 'Blacksmithing' })).toEqual(['Steel Sword', 'Iron Sword'])
    expect(viewScan(ROWS, query({ profession: 'Blacksmithing' })).hidden).toBe(1)
    expect(names({ name: 'sword steel' })).toEqual(['Steel Sword'])
  })

  it('counts the rows each profession would show under the same name filter', () => {
    const { counts } = viewScan(ROWS, query({ profession: 'Tailoring' }))
    expect(counts.get(null)).toBe(4)
    expect(counts.get('Blacksmithing')).toBe(2)
    expect(viewScan(ROWS, query({ showHidden: true })).counts.get('Blacksmithing')).toBe(3)
    expect(viewScan(ROWS, query({ name: 'sword' })).counts.get('Cooking')).toBeUndefined()
  })

  it('keeps rows without a value last in both directions', () => {
    expect(names({ sort: { key: 'margin', direction: 'asc' } })).toEqual(['Silk Robe', 'Iron Sword', 'Steel Sword', 'Bread'])
    expect(names({ sort: { key: 'item', direction: 'asc' } })).toEqual(['Bread', 'Iron Sword', 'Silk Robe', 'Steel Sword'])
  })
})

describe('sortScan', () => {
  it('orders a copy by the sort, hidden rows included, and leaves the input alone', () => {
    const before = ROWS.map((r) => r.item.name)
    expect(sortScan(ROWS, { key: 'margin', direction: 'asc' }).map((r) => r.item.name)).toEqual([
      'Silk Robe',
      'Iron Sword',
      'Steel Sword',
      'Bread',
      'Dragon Sword',
      'Healing Potion',
    ])
    expect(ROWS.map((r) => r.item.name)).toEqual(before)
  })
})

describe('nextSort', () => {
  it('flips the sorted column and starts a new numeric column high to low', () => {
    expect(nextSort(DEFAULT_SCAN_SORT, 'margin')).toEqual({ key: 'margin', direction: 'asc' })
    expect(nextSort(DEFAULT_SCAN_SORT, 'cost')).toEqual({ key: 'cost', direction: 'desc' })
    expect(nextSort(DEFAULT_SCAN_SORT, 'item')).toEqual({ key: 'item', direction: 'asc' })
  })
})

describe('bestMargins', () => {
  it('takes the highest margins among rows that have one', () => {
    expect(bestMargins(ROWS, 2).map((r) => r.item.name)).toEqual(['Steel Sword', 'Iron Sword'])
    expect(bestMargins(ROWS, 5).map((r) => r.item.name)).toEqual(['Steel Sword', 'Iron Sword', 'Silk Robe'])
  })
})
