import { describe, expect, it } from 'vitest'
import { ladderOf } from './depth.fixture.ts'
import { ladderCost, makePriceBook } from './priceBook.ts'
import type { DepthLadder, MarketQuote } from './types.ts'

const AT = '2026-10-27T04:00:00Z'
const quote = (lowest: number, listings = 5): MarketQuote => ({ lowest, listings, soldAvg: null, capturedAt: AT })
const ladder = (levels: [number, number, number][], more: Partial<DepthLadder> = {}) => ladderOf(levels, { capturedAt: AT, ...more })

const book = (market: Record<number, MarketQuote>, ladders: Record<number, DepthLadder> = {}, manual: Record<number, number> = {}) =>
  makePriceBook({
    manual: new Map(Object.entries(manual).map(([id, p]) => [Number(id), p])),
    market: new Map(Object.entries(market).map(([id, q]) => [Number(id), q])),
    npc: new Map(),
    ladders: new Map(Object.entries(ladders).map(([id, l]) => [Number(id), l])),
  })

describe('ladderCost', () => {
  const thin = ladder([[100, 1, 1], [150, 2, 2], [400, 1, 10]])

  it('prices units inside the cheapest level at that price', () => {
    expect(ladderCost(thin, 1)).toMatchObject({ cost: 100, listings: 1, levels: 1 })
  })

  it('climbs the ladder as the cheap listings run out', () => {
    expect(ladderCost(thin, 3)).toMatchObject({ cost: 400, listings: 3, levels: 2 })
    expect(ladderCost(thin, 5)).toMatchObject({ cost: 1200, listings: 4, levels: 3 })
  })

  it('takes a fraction of a level for a fractional expected quantity', () => {
    expect(ladderCost(thin, 1.5).cost).toBeCloseTo(175)
    expect(ladderCost(thin, 2).listings).toBe(2)
  })

  it('prices the units beyond the last listing at the top rung and reports the shortfall', () => {
    const depth = ladderCost(thin, 20)
    expect(depth.cost).toBe(100 + 300 + 4000 + 7 * 400)
    expect(depth).toMatchObject({ units: 20, available: 13, listings: 4, levels: 3, complete: true })
  })
})

describe('makePriceBook with ladders', () => {
  const thin = ladder([[100, 1, 1], [150, 2, 2], [400, 1, 10]])

  it('quotes the lowest listing for one unit, with no depth', () => {
    const q = book({ 1: quote(100) }, { 1: thin }).quote(1)
    expect(q).toMatchObject({ kind: 'market', unit: 100, lowest: 100, listings: 5, depth: null })
    expect(book({ 1: quote(100) }, { 1: thin }).quote(1, 1)).toMatchObject({ unit: 100, depth: null })
  })

  it('quotes the average unit cost of the units asked for', () => {
    const q = book({ 1: quote(100) }, { 1: thin }).quote(1, 5)
    expect(q.kind).toBe('market')
    if (q.kind !== 'market') return
    expect(q.unit).toBeCloseTo(240)
    expect(q.lowest).toBe(100)
    expect(q.depth).toMatchObject({ units: 5, cost: 1200, listings: 4, levels: 3, available: 13, capturedAt: AT })
  })

  it('scales an older ladder to the lowest listing of the quote', () => {
    const stale = ladder([[200, 1, 1], [300, 2, 2]], { capturedAt: '2026-10-06T11:53:19Z' })
    const q = book({ 1: quote(100) }, { 1: stale }).quote(1, 3)
    if (q.kind !== 'market') throw new Error('expected a market quote')
    expect(q.depth?.cost).toBeCloseTo(100 + 2 * 150)
    expect(q.unit).toBeCloseTo(400 / 3)
    expect(q.depth?.capturedAt).toBe('2026-10-06T11:53:19Z')
  })

  it('falls back to the flat price without a ladder, and ignores ladders for manual and empty quotes', () => {
    expect(book({ 1: quote(100) }).quote(1, 5)).toMatchObject({ unit: 100, depth: null })
    expect(book({ 1: quote(100) }, { 1: thin }, { 1: 90 }).quote(1, 5)).toEqual({ kind: 'manual', unit: 90 })
    expect(book({}, { 1: thin }).quote(1, 5)).toEqual({ kind: 'none' })
    expect(book({ 1: quote(100) }, { 1: ladder([]) }).quote(1, 5)).toMatchObject({ unit: 100, depth: null })
  })
})
