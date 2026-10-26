import { planCraft } from '../domain/planCraft.ts'
import type { Catalog, ItemId, Mastery, PlanOptions, PlanResult, PriceBook } from '../domain/types.ts'
import type { World } from '../market/exchangeClient.ts'
import type { CraftIndex } from './craftables.ts'

export interface Planning {
  world: World
  catalog: Catalog
  index: CraftIndex
  mastery: Mastery
  options: PlanOptions
  prices: PriceBook
}

export const planOne = (planning: Planning, itemId: ItemId, quantity: number): PlanResult | null =>
  planCraft({
    target: { itemId, quantity },
    mastery: planning.mastery,
    options: planning.options,
    world: planning.catalog,
    prices: planning.prices,
  })
