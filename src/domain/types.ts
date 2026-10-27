export type ItemId = number
export type RecipeId = number
export type Race = 'Light' | 'Dark'
export type Profession = 'Blacksmithing' | 'Tailoring' | 'Jewelcrafting' | 'Alchemy' | 'Cooking'
export type Section = 'craft' | 'succession' | 'conversion'
export type Mastery = Record<Profession, number>
export type Grade = 'Common' | 'Rare' | 'Legend' | 'Unique' | 'Epic' | 'Mythic' | 'Special'

export interface Item {
  id: ItemId
  name: string
  grade: Grade
  icon: string | null
}

export type RateFamily = 'basic' | 'expert' | 'artisan' | 'dragonlord' | 'consumable' | 'material'

export type RecipeRate =
  | { kind: 'fixed'; success: number }
  | { kind: 'curve'; family: RateFamily }

export interface Recipe {
  id: RecipeId
  section: Section
  name: string
  profession: Profession | null
  race: Race
  masteryLevel: number
  product: { itemId: ItemId; count: number }
  combo: { itemId: ItemId; count: number; chance: number } | null
  rate: RecipeRate
  ingredients: { itemId: ItemId; count: number }[]
}

export interface RateCurve {
  success: number[]
  combo: number[] | null
}

export type RateSource = 'recipe' | 'fixed' | RateFamily

export interface Catalog {
  race: Race
  items: Map<ItemId, Item>
  recipes: Map<RecipeId, Recipe>
  byProduct: Map<ItemId, Recipe[]>
  boundOf: Map<ItemId, ItemId>
  curves: Map<RecipeId, RateCurve>
  families: Record<RateFamily, RateCurve>
  npcPrices: Map<ItemId, number>
}

export interface MarketQuote {
  lowest: number | null
  listings: number
  soldAvg: number | null
  capturedAt: string
}

export interface LadderLevel {
  unitPrice: number
  listings: number
  units: number
}

export interface DepthLadder {
  capturedAt: string
  complete: boolean
  units: number
  levels: LadderLevel[]
}

export interface Depth {
  units: number
  cost: number
  listings: number
  levels: number
  available: number
  complete: boolean
  capturedAt: string
}

export type PriceQuote =
  | { kind: 'market'; unit: number; lowest: number; listings: number; soldAvg: number | null; capturedAt: string; depth: Depth | null }
  | { kind: 'manual'; unit: number }
  | { kind: 'npc'; unit: number }
  | { kind: 'none' }

export type Price = Exclude<PriceQuote, { kind: 'none' }>

export interface PriceBook {
  quote(itemId: ItemId, units?: number): PriceQuote
}

export interface PlanOptions {
  allowCraft: boolean
  allowMorph: boolean
  byproductCredit: boolean
  taxRate: number
}

export type Acquisition =
  | { method: 'buy'; unit: number; quote: Price }
  | { method: 'craft'; unit: number; step: StepPlan }
  | { method: 'morph'; unit: number; step: StepPlan }
  | { method: 'owned' }
  | { method: 'none' }

/** A way to obtain an item that the player can insist on. */
export type Method = Exclude<Acquisition['method'], 'owned' | 'none'>

/** Units the player already holds, per item. The planner uses them before it buys or crafts. */
export type Owned = ReadonlyMap<ItemId, number>

/** The method the player insists on, per item. It wins over the cheapest wherever that item appears. */
export type Forced = ReadonlyMap<ItemId, Method>

/** One way the planner weighed for an item. `unit` is Infinity when the route cannot be used. */
export type Alternative =
  | { method: 'buy'; unit: number }
  | { method: Exclude<Method, 'buy'>; unit: number; recipeId: RecipeId }

export interface MaterialLine {
  itemId: ItemId
  perAttempt: number
  /** Units the step consumes, counting failed attempts. */
  expected: number
  /** The part of `expected` that comes from what the player holds. */
  owned: number
  /** How the rest is obtained. `owned` when stock covers the whole line. */
  acquisition: Acquisition
  subtotal: number
}

export interface StepPlan {
  recipeId: RecipeId
  itemId: ItemId
  outputs: number
  wantCombo: boolean
  levelDiff: number | null
  successRate: number
  comboRate: number
  rateSource: RateSource
  attempts: number
  materials: MaterialLine[]
  byproducts: { itemId: ItemId; expected: number; credit: number }[]
  cost: number
}

export type NonEmpty<T> = readonly [T, ...T[]]

export const isNonEmpty = <T>(items: readonly T[]): items is NonEmpty<T> => items.length > 0

/**
 * What the player wants made: units per item, in the order the planner spends stock on them.
 * A wanted item is always crafted. It is never bought, never taken from stock, and never a material
 * for another wanted item.
 */
export type Wanted = ReadonlyMap<ItemId, number>

export interface PlanInput {
  wanted: Wanted
  mastery: Mastery
  options: PlanOptions
  world: Catalog
  prices: PriceBook
  owned?: Owned
  forced?: Forced
}

/** One wanted item as planned: its step tree, what it costs, and what buying it outright would. */
export interface TargetPlan {
  itemId: ItemId
  quantity: number
  root: StepPlan
  cost: number
  unitCost: number
  market: { lowest: number; soldAvg: number | null; listings: number; cost: number; depth: Depth | null } | null
  margin: number | null
  marginPct: number | null
}

export interface PlanResult {
  /** In `wanted` order. */
  targets: NonEmpty<TargetPlan>
  /** The sum over `targets`. Infinity while any price or mastery is missing. */
  cost: number
  /** Every bought leaf, summed over the steps of every target. `expected` includes the `owned` part; `subtotal` and `depth` are for the rest. */
  shopping: { itemId: ItemId; expected: number; owned: number; unit: number; subtotal: number; depth: Depth | null }[]
  missing: ItemId[]
  blocked: RecipeId[]
  /** Every way the planner weighed for each item it met, so the UI can offer the others without re-planning. */
  alternatives: ReadonlyMap<ItemId, Alternative[]>
}
