# Architecture

Local-only web app. Vite + React + TypeScript, no backend. Prices come from the
aion2.exchange API through Vite's dev/preview proxy. Recipes and rate curves are
generated JSON checked into `src/data/`.

## Caller's usage (the contract the types are derived from)

```ts
const world = catalogFor('Light')                // src/data/catalog.ts: recipes + rate curves for one race
const prices = makePriceBook({ manual, market: snapshot.quotes, npc: world.npcPrices })
const plan = planCraft({
  target: { itemId: 110150014, quantity: 1 },     // Splendent Orichalcum Greatsword
  mastery: { Blacksmithing: 42, Tailoring: 0, Jewelcrafting: 0, Alchemy: 0, Cooking: 0 },
  options: { allowCraft: true, allowMorph: true, byproductCredit: true, taxRate: 0.05 },
  world,
  prices,                  // PriceBook: manual > market > npc > none
})                         // null when no recipe of this race makes the target
plan.cost            // expected Kina to get 1 Splendent at mastery 42, Infinity while a price is missing

plan.market          // { lowest, soldAvg, listings } for the target, or null
plan.margin          // lowest * (1 - tax) * quantity - cost
plan.root            // step tree: each step's attempts, rates, materials, acquisition
plan.missing         // items with no price and no recipe
plan.blocked         // recipes in the tree above the player's mastery
```

## Modules

| Path | Owns |
|---|---|
| `scripts/fetch-recipes.mjs` | pulls aion2t.com recipe lists + details and aion2.exchange's crafting model, writes `src/data/recipes.json` (items, recipes, Bound substitutes, NPC prices) |
| `scripts/fetch-rates.mjs` | pulls metabot.gg's rate curves (from the game client, one pair of codes per recipe), writes `src/data/rates.json` |
| `scripts/verify-model.mjs` | compares the planner with aion2.exchange's cost breakdowns, and the curves with gamewith.ai's tables |
| `src/domain/types.ts` | the typed model below |
| `src/domain/catalog.ts` | `buildCatalog(race, recipesFile, ratesFile)`: indexes by recipe id and by product, resolves each craft recipe's curve by recipe id; `tradeableItems(catalog)` |
| `src/domain/rates.ts` | `stepRates(recipe, mastery, catalog)`: success, combo success and level difference, curve lookup with family fallback |
| `src/domain/planCraft.ts` | the expected-value engine, pure, memoised cheapest acquisition per item |
| `src/domain/priceBook.ts` | merges manual overrides, market quotes and NPC prices into `PriceBook` |
| `src/data/catalog.ts` | `catalogFor(race)`: the bundled JSON as a `Catalog`, built once per race |
| `src/market/exchangeClient.ts` | fetch wrappers over `/ex/api/*` (proxied), batch by 100 keys, localStorage cache with `capturedAt` |
| `src/state/` | React state: selected world, mastery, overrides, target, persisted in localStorage |
| `src/components/` | UI |
| `vite.config.ts` | `server.proxy` and `preview.proxy`: `/ex` → `https://aion2.exchange`, `/a2t` → `https://aion2t.com` (icons) |

`src/domain/` imports its own files with `.ts` extensions and only `import type` for types, so
Node 24 runs it without a build step (`verify-model.mjs` does).

## Types

`src/domain/types.ts`, verbatim:

```ts
export type ItemId = number
export type RecipeId = number
export type Race = 'Light' | 'Dark'
export type Profession = 'Blacksmithing' | 'Tailoring' | 'Jewelcrafting' | 'Alchemy' | 'Cooking'
export type Section = 'craft' | 'succession' | 'conversion'
export type Mastery = Record<Profession, number>

export interface Item {
  id: ItemId
  name: string
  grade: string
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
  | { method: 'none' }

export interface MaterialLine {
  itemId: ItemId
  perAttempt: number
  expected: number
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
}

export interface PlanResult {
  target: { itemId: ItemId; quantity: number }
  root: StepPlan
  cost: number
  unitCost: number
  market: { lowest: number; soldAvg: number | null; listings: number } | null
  margin: number | null
  marginPct: number | null
  shopping: { itemId: ItemId; expected: number; unit: number; subtotal: number }[]
  missing: ItemId[]
  blocked: RecipeId[]
}
```

## Engine rules

- `planCraft` resolves an item to the cheapest `Acquisition` with memoisation per item and a
  visited set to break cycles (Odyle → Ore → Ingot never loops back, but the guard stays).
  The target itself is always crafted, by the cheapest recipe that makes it.
- A combo replaces the normal roll: it fires with `combo.chance`, then succeeds at the combo
  curve. Per attempt, `chance * comboSuccess` yields the combo item and
  `(1 - chance) * success` the normal one. aion2.exchange's attempts confirm the shape
  (1 / (0.96837 × 0.25) = 4.1306 for an Artisan's Splendent step), and metabot.gg describes
  its combo line the same way. When the combo item equals the product (potions, food), both
  outcomes count toward the yield.
- Level difference is the mastery of the recipe's own profession minus its mastery level,
  clamped to `curve.length - 1`. Below 0 the recipe cannot be crafted: the step reports
  `successRate: 0`, `cost: Infinity`, no materials, and its recipe id in `plan.blocked`.
- Curve lookup: `catalog.curves.get(recipe.id)` (the client's own curve, from metabot.gg),
  else `families[recipe.rate.family]`. The family comes from the recipe's tab and name prefix
  (`Expert's`, `Artisan's`, `Dragon Lord`, `Misc_*` → material, potions and food →
  consumable) and only matters for the 20 tool recipes that have no curve. Transfers
  (succession) are guaranteed. Morphs (conversion) use their recipe's fixed rate.
- A morph makes the Bound variant of a material. `catalog.boundOf` maps the unbound item that
  recipes list to that Bound item (`<X> (Bound)` stands in for `<X>`, checked against every
  morph route in aion2.exchange's model), and the planner offers the morph for the unbound item.
- `allowCraft` and `allowMorph` only decide whether crafting or morphing competes with buying.
  An item with no price is still crafted or morphed when a recipe exists, which is how the
  ladder's intermediate Splendent items still get made with both turned off.
- An item with no price and no recipe is `{ method: 'none' }`, costs `Infinity`, and is listed
  in `plan.missing`.
- Byproduct credit values the other results of a step (normal items left by combo crafts) at
  `lowest * (1 - taxRate)`, only when the item has a market or manual quote.

## Alternatives considered

| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| Price access | Vite proxy, no server | Node/Express proxy with disk cache | smallest thing that works; localStorage holds the last snapshot |
| Rate data | metabot.gg's client curves per recipe + family fallback, gamewith.ai tables as a check | gamewith.ai tables per product id | metabot covers every craft recipe of both races at full precision and is keyed by recipe id; gamewith has pages for 79 Elyos products and rounds to 0.1% |
| Recipe data | generated JSON in repo | fetch at runtime | offline use, and aion2t.com could gate it any day |
| Engine | expected value per step with cheapest acquisition memo | Monte Carlo | same mean, deterministic, instant in the UI |
