import { planCraft } from '../domain/planCraft.ts'
import type { Catalog, Forced, ItemId, MarketQuote, Mastery, Owned, PlanOptions, PlanResult, PriceBook, Wanted } from '../domain/types.ts'
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

/** The open item is a map of one, the list is the whole map. Stock and source choices come from what the player is looking at; the scanner ranks every recipe at Market prices. */
export const planWanted = (planning: Planning, wanted: Wanted, owned?: Owned, forced?: Forced): PlanResult | null =>
  planCraft({ wanted, mastery: planning.mastery, options: planning.options, world: planning.catalog, prices: planning.prices, owned, forced })
