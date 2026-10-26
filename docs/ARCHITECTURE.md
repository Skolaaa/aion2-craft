# Architecture

Local-only web app. Vite + React + TypeScript, no backend. Prices come from the
aion2.exchange API through Vite's dev/preview proxy, recipes and rate curves are
generated JSON checked into `src/data/`.

## Caller's usage (the contract the types are derived from)

```ts
const plan = planCraft({
  target: { itemId: 110150014, quantity: 1 },     // Splendent Orichalcum Greatsword
  mastery: { Blacksmithing: 42, Tailoring: 0, Jewelcrafting: 0, Alchemy: 0, Cooking: 0 },
  options: { allowCraft: true, allowMorph: true, byproductCredit: true, taxRate: 0.05 },
  world: catalog,          // recipes + rate curves for one race
  prices,                  // PriceBook: manual > market > npc > none
})
plan.cost            // expected Kina to get 1 Splendent at mastery 42
plan.costAllBuy      // same with every material bought at its listing
plan.market          // { lowest, soldAvg, listings } for the target, or null
plan.margin          // lowest * (1 - tax) - cost
plan.steps           // ladder: each step's attempts, rates, materials, acquisition
```

## Modules

| Path | Owns |
|---|---|
| `scripts/fetch-recipes.mjs` | pulls aion2t.com recipe lists + details, writes `src/data/recipes.json` |
| `scripts/fetch-rates.mjs` | pulls gamewith.ai rate tables per product id, writes `src/data/rates.json` |
| `src/domain/types.ts` | the typed model below |
| `src/domain/catalog.ts` | parses `recipes.json` + `rates.json` into a `Catalog` (indexes by product id, by recipe id), per race |
| `src/domain/rates.ts` | `successRate(recipe, mastery, catalog)` and `comboSuccessRate(...)`, curve lookup with family fallback |
| `src/domain/planCraft.ts` | the expected-value engine, pure, memoised cheapest acquisition per item |
| `src/domain/priceBook.ts` | merges manual overrides, market quotes and NPC prices into `PriceBook` |
| `src/market/exchangeClient.ts` | fetch wrappers over `/ex/api/*` (proxied), batch by 100 keys, localStorage cache with `capturedAt` |
| `src/state/` | React state: selected world, mastery, overrides, target, persisted in localStorage |
| `src/components/` | UI |
| `vite.config.ts` | `server.proxy` and `preview.proxy`: `/ex` → `https://aion2.exchange`, `/a2t` → `https://aion2t.com` (icons) |

## Types

```ts
export type ItemId = number
export type RecipeId = number
export type Race = 'Light' | 'Dark'
export type Profession = 'Blacksmithing' | 'Tailoring' | 'Jewelcrafting' | 'Alchemy' | 'Cooking'
export type Section = 'craft' | 'succession' | 'conversion'

export interface Item { id: ItemId; name: string; grade: string; icon: string | null }

export interface Recipe {
  id: RecipeId
  section: Section
  name: string
  profession: Profession | null        // null for conversion
  race: Race
  masteryLevel: number                 // 0 for succession/conversion
  product: { itemId: ItemId; count: number }
  combo: { itemId: ItemId; count: number; chance: number } | null   // chance 0..1
  fixedSuccess: number | null          // conversion: 1 or 0.1; succession: 1; craft: null => curve
  ingredients: { itemId: ItemId; count: number }[]
}

export interface RateCurve { success: number[]; combo: number[] }   // index = level diff, clamp at end
export type RateFamily = 'basic' | 'expert' | 'artisan' | 'dragonlord' | 'consumable' | 'material'

export interface Catalog {
  race: Race
  items: Map<ItemId, Item>
  recipes: Map<RecipeId, Recipe>
  byProduct: Map<ItemId, Recipe[]>     // every recipe that yields the item (normal or combo)
  curves: Map<ItemId, RateCurve>       // by product item id, from rates.json
  families: Record<RateFamily, RateCurve>
}

export type PriceQuote =
  | { kind: 'market'; unit: number; listings: number; soldAvg: number | null; capturedAt: string }
  | { kind: 'manual'; unit: number }
  | { kind: 'npc'; unit: number }
  | { kind: 'none' }

export interface PriceBook { quote(itemId: ItemId): PriceQuote }

export interface PlanOptions {
  allowCraft: boolean
  allowMorph: boolean
  byproductCredit: boolean
  taxRate: number                      // 0..1
}

export type Acquisition =
  | { method: 'buy'; unit: number; quote: PriceQuote }
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
  outputs: number                      // units of the wanted result this step must yield
  wantCombo: boolean                   // the wanted result is the combo product
  successRate: number
  comboRate: number                    // chance * comboSuccess, 0 when no combo
  attempts: number
  materials: MaterialLine[]
  byproducts: { itemId: ItemId; expected: number; credit: number }[]
  cost: number                         // materials - credit
}

export interface PlanResult {
  target: { itemId: ItemId; quantity: number }
  root: StepPlan
  cost: number
  costAllBuy: number
  unitCost: number
  market: { lowest: number; soldAvg: number | null; listings: number } | null
  margin: number | null                // lowest * (1 - tax) - cost
  marginPct: number | null
  shopping: { itemId: ItemId; expected: number; unit: number; subtotal: number }[]  // leaf buys, aggregated
}
```

## Engine rules

- `planCraft` resolves an item to the cheapest `Acquisition` with memoisation per item and a
  visited set to break cycles (Odyle → Ore → Ingot never loops back, but the guard stays).
- Level difference is clamped to `[0, curve.length - 1]`. Below 0 the recipe cannot be crafted;
  the engine reports `successRate: 0` and the step as unaffordable rather than guessing.
- Curve lookup: `curves.get(product.itemId)`, else `families[familyOf(recipe)]`.
  `familyOf` keys on name prefix (`Expert's`, `Artisan's`, `Dragon Lord`) and section.
- Material crafts (ingots, decorations) use `families.material` (99% flat) when no curve exists,
  matching the rate aion2.exchange derives from the game files.
- Byproduct credit values normal items left by failed combos at `lowest * (1 - taxRate)`,
  only when the item has a market quote.

## Alternatives considered

| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| Price access | Vite proxy, no server | Node/Express proxy with disk cache | smallest thing that works; localStorage holds the last snapshot |
| Rate data | scraped official tables per item + family fallback | hand-typed endpoints only | the tables are the only mastery-aware source and are keyed by the same ids |
| Recipe data | generated JSON in repo | fetch at runtime | offline use, and aion2t.com could gate it any day |
| Engine | expected value per step with cheapest acquisition memo | Monte Carlo | same mean, deterministic, instant in the UI |
