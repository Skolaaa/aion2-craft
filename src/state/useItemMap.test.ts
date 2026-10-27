import { describe, expect, it } from 'vitest'
import { parseEntries, withEntry } from './useItemMap.ts'
import { parsePrice } from './useOverrides.ts'
import { MAX_OWNED, parseCount } from './useOwned.ts'
import { parseMethod } from './useSources.ts'

describe('withEntry', () => {
  it('keeps an edited entry in place, appends a new one, and removes on null', () => {
    const entries: [number, number][] = [[1, 3], [2, 5]]
    expect(withEntry(entries, 1, 7)).toEqual([[1, 7], [2, 5]])
    expect(withEntry(entries, 3, 1)).toEqual([[1, 3], [2, 5], [3, 1]])
    expect(withEntry(entries, 1, null)).toEqual([[2, 5]])
    expect(withEntry(entries, 9, null)).toBe(entries)
  })
})

describe('parseEntries', () => {
  it('keeps the pairs whose value the parser accepts and rejects anything but a list', () => {
    const prices = parseEntries(parsePrice)
    expect(prices([[1, 100], [2, 0], [3, -5], [4, '100'], [5, NaN], ['6', 10], [7], 8, null])).toEqual([[1, 100]])
    expect(prices([])).toEqual([])
    expect(prices({ 1: 100 })).toBeNull()
    expect(prices(null)).toBeNull()
  })

  it('keeps only whole counts from one up to the limit', () => {
    const counts = parseEntries(parseCount)
    expect(counts([[1, 3], [2, 0], [3, 2.5], [4, MAX_OWNED + 1], [5, MAX_OWNED]])).toEqual([[1, 3], [5, MAX_OWNED]])
  })

  it('keeps only the three method words for sources', () => {
    const sources = parseEntries(parseMethod)
    expect(sources([[1, 'buy'], [2, 'craft'], [3, 'morph'], [4, 'owned'], [5, 'Buy'], [6, 1], [7, null]])).toEqual([
      [1, 'buy'],
      [2, 'craft'],
      [3, 'morph'],
    ])
  })
})
