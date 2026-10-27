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

export type PriceQuote =
  | { kind: 'market'; unit: number; listings: number; soldAvg: number | null; capturedAt: string }
  | { kind: 'manual'; unit: number }
  | { kind: 'npc'; unit: number }
  | { kind: 'none' }

export type Price = Exclude<PriceQuote, { kind: 'none' }>

export interface PriceBook {
  quote(itemId: ItemId): PriceQuote
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

/** Units the player already holds, per item. The planner uses them before it buys or crafts. */
export type Owned = ReadonlyMap<ItemId, number>

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

export interface PlanInput {
  target: { itemId: ItemId; quantity: number }
  mastery: Mastery
  options: PlanOptions
  world: Catalog
  prices: PriceBook
  owned?: Owned
}

export interface PlanResult {
  target: { itemId: ItemId; quantity: number }
  root: StepPlan
  cost: number
  unitCost: number
  market: { lowest: number; soldAvg: number | null; listings: number } | null
  margin: number | null
  marginPct: number | null
  /** Every bought leaf, summed over the steps that use it. `expected` includes the `owned` part; `subtotal` is for the rest. */
  shopping: { itemId: ItemId; expected: number; owned: number; unit: number; subtotal: number }[]
  missing: ItemId[]
  blocked: RecipeId[]
}
