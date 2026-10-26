import type { ItemId, MarketQuote, PriceBook } from './types.ts'

export interface PriceSources {
  manual: ReadonlyMap<ItemId, number>
  market: ReadonlyMap<ItemId, MarketQuote>
  npc: ReadonlyMap<ItemId, number>
}

export function makePriceBook({ manual, market, npc }: PriceSources): PriceBook {
  return {
    quote(itemId) {
      const override = manual.get(itemId)
      if (override !== undefined) return { kind: 'manual', unit: override }
      const listed = market.get(itemId)
      if (listed && listed.lowest !== null) {
        const { lowest, listings, soldAvg, capturedAt } = listed
        return { kind: 'market', unit: lowest, listings, soldAvg, capturedAt }
      }
      const shop = npc.get(itemId)
      if (shop !== undefined) return { kind: 'npc', unit: shop }
      return { kind: 'none' }
    },
  }
}
