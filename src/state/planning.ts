import { planCraft } from '../domain/planCraft.ts'
import type { Catalog, Forced, ItemId, MarketQuote, Mastery, Owned, PlanOptions, PlanResult, PriceBook } from '../domain/types.ts'
import type { World } from '../market/worlds.ts'
import type { CraftIndex } from './craftables.ts'

export interface Planning {
  world: World
  catalog: Catalog
  index: CraftIndex
  mastery: Mastery
  options: PlanOptions
  prices: PriceBook
  market: ReadonlyMap<ItemId, MarketQuote>
}

/** Stock and source choices are for the item the player is looking at. The scanner ranks every recipe at Market prices. */
export const planOne = (planning: Planning, itemId: ItemId, quantity: number, owned?: Owned, forced?: Forced): PlanResult | null =>
  planCraft({
    target: { itemId, quantity },
    mastery: planning.mastery,
    options: planning.options,
    world: planning.catalog,
    prices: planning.prices,
    owned,
    forced,
  })
