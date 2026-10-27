import type { Depth, DepthLadder, ItemId, MarketQuote, PriceBook } from './types.ts'

export interface PriceSources {
  manual: ReadonlyMap<ItemId, number>
  market: ReadonlyMap<ItemId, MarketQuote>
  npc: ReadonlyMap<ItemId, number>
  ladders?: ReadonlyMap<ItemId, DepthLadder>
}

const NO_LADDERS: ReadonlyMap<ItemId, DepthLadder> = new Map()

// Units past the last listing cost the top rung, so the plan stays finite while `available` shows the gap.
export function ladderCost(ladder: DepthLadder, units: number): Depth {
  let left = units
  let cost = 0
  let listings = 0
  let levels = 0
  for (const level of ladder.levels) {
    if (left <= 0) break
    const taken = Math.min(left, level.units)
    cost += taken * level.unitPrice
    listings += Math.ceil((taken / level.units) * level.listings)
    levels++
    left -= taken
  }
  if (left > 0) cost += left * ladder.levels[ladder.levels.length - 1].unitPrice
  const { complete, capturedAt } = ladder
  return { units, cost, listings, levels, available: ladder.units, complete, capturedAt }
}

// The exchange polls depth less often than prices, so the ladder's shape is kept but anchored to today's lowest listing.
function anchored(ladder: DepthLadder, lowest: number): DepthLadder {
  const first = ladder.levels[0].unitPrice
  if (first === lowest || first <= 0) return ladder
  const scale = lowest / first
  return { ...ladder, levels: ladder.levels.map((level) => ({ ...level, unitPrice: level.unitPrice * scale })) }
}

export function makePriceBook({ manual, market, npc, ladders = NO_LADDERS }: PriceSources): PriceBook {
  return {
    quote(itemId, units = 1) {
      const override = manual.get(itemId)
      if (override !== undefined) return { kind: 'manual', unit: override }
      const listed = market.get(itemId)
      if (listed && listed.lowest !== null) {
        const { lowest, listings, soldAvg, capturedAt } = listed
        const ladder = units > 1 ? ladders.get(itemId) : undefined
        const depth = ladder && ladder.levels.length > 0 ? ladderCost(anchored(ladder, lowest), units) : null
        const unit = depth ? depth.cost / units : lowest
        return { kind: 'market', unit, lowest, listings, soldAvg, capturedAt, depth }
      }
      const shop = npc.get(itemId)
      if (shop !== undefined) return { kind: 'npc', unit: shop }
      return { kind: 'none' }
    },
  }
}
