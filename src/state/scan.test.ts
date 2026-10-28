import { describe, expect, it } from 'vitest'
import type { PlanResult, Profession } from '../domain/types.ts'
import type { TargetStatus, Verdict } from './answer.ts'
import { bestMargins, DEFAULT_SCAN_SORT, nextSort, sortScan, viewScan, type ScanQuery, type ScanRow } from './scan.ts'

const VERDICT: Record<TargetStatus, Verdict> = {
  ready: { kind: 'even' },
  unpriced: { kind: 'missing', items: [] },
  locked: { kind: 'blocked', itemId: 0, profession: 'Blacksmithing', level: 50, mastery: 10 },
}

let nextId = 1
function row(name: string, profession: Profession, margin: number | null, status: TargetStatus = 'ready', cost: number | null = 1000): ScanRow {
  return {
    item: { id: nextId++, name, grade: 'Rare', icon: null },
    profession,
    level: 10,
    plan: {} as PlanResult,
    verdict: VERDICT[status],
    status,
    cost,
    lowest: margin === null ? null : cost === null ? null : cost + margin,
    sold: null,
    listings: 1,
    margin,
    marginPct: margin === null || cost === null ? null : margin / cost,
  }
}

const ROWS = [
  row('Iron Sword', 'Blacksmithing', 300),
  row('Silk Robe', 'Tailoring', -50),
  row('Steel Sword', 'Blacksmithing', 900),
  row('Healing Potion', 'Alchemy', null, 'unpriced', null),
  row('Dragon Sword', 'Blacksmithing', null, 'locked', null),
  row('Bread', 'Cooking', null),
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
