# Architecture

Local-only web app. Vite + React + TypeScript, no backend. Prices come from the
aion2.exchange API through Vite's dev/preview proxy. Recipes and rate curves are
generated JSON checked into `src/data/`.

## Caller's usage (the contract the types are derived from)

```ts
const world = catalogFor('Light')                // src/data/catalog.ts: recipes + rate curves for one race
const prices = makePriceBook({ manual, market: snapshot.quotes, npc: world.npcPrices, ladders })
const plan = planCraft({
  wanted: new Map([[110150014, 1]]),              // 1 Splendent Orichalcum Greatsword; a list is a map of several, in stock-priority order
  mastery: { Blacksmithing: 42, Tailoring: 0, Jewelcrafting: 0, Alchemy: 0, Cooking: 0 },
  options: { allowCraft: true, allowMorph: true, byproductCredit: true, taxRate: 0.05 },
  world,
  prices,                  // PriceBook: manual > market > npc > none; quote(itemId, units) walks the depth ladder for units > 1
  forced,                  // optional ReadonlyMap<ItemId, Method>: buy, craft or morph the player insists on, wherever the item appears
})                         // null when the map is empty or no recipe of this race makes a wanted item
plan.cost            // expected Kina for everything wanted at mastery 42, Infinity while a price is missing

plan.targets         // one per wanted item, in order: { itemId, quantity, root, cost, unitCost, market, margin, marginPct }
plan.targets[0].market   // { lowest, soldAvg, listings, cost, depth } for that item, or null; cost buys `quantity` units along the ladder
plan.targets[0].margin   // lowest * (1 - tax) * quantity - cost
plan.targets[0].root     // step tree: each step's attempts, rates, materials, acquisition
plan.shopping        // every bought leaf summed over every target, so a material two targets need is one line
plan.missing         // items with no price and no recipe
plan.blocked         // recipes in any tree above the player's mastery
plan.alternatives    // per item met: one entry per method with its unit cost, Infinity when blocked, and the route's recipe id
```

One planner pass roots every wanted item against the same stock budget, choice memo and settled ladder
demand, which is how the list view shares stock and quotes across its lines. A wanted item is always
crafted and never feeds another wanted item.

## Modules

| Path | Owns |
|---|---|
| `scripts/fetch-recipes.mjs` | pulls aion2t.com recipe lists + details and aion2.exchange's crafting model, writes `src/data/recipes.json` (items, recipes, Bound substitutes, NPC prices) |
| `scripts/fetch-rates.mjs` | pulls metabot.gg's rate curves (from the game client, one pair of codes per recipe), writes `src/data/rates.json` |
| `scripts/verify-model.mjs` | compares the planner with aion2.exchange's cost breakdowns, and the curves with gamewith.ai's tables |
| `src/domain/types.ts` | the typed model below |
| `src/domain/catalog.ts` | `buildCatalog(race, recipesFile, ratesFile)`: indexes by recipe id and by product, resolves each craft recipe's curve by recipe id, parses each item's grade with `parseGrade` (unknown grades become `Common`); `tradeableItems(catalog)` |
| `src/domain/rates.ts` | `stepRates(recipe, mastery, catalog)`: success, combo success and level difference, curve lookup with family fallback |
| `src/domain/planCraft.ts` | the expected-value engine, pure: plans every item of `wanted` in one pass, each on its own tree, with one memoised cheapest acquisition per item, or the `Forced` method the player insists on; spends the player's `Owned` stock in tree order across the trees before any buy or craft, re-runs with the units it buys of each item while a ladder prices that demand, and reports the `alternatives` it weighed per item |
| `src/domain/priceBook.ts` | merges manual overrides, market quotes, depth ladders and NPC prices into `PriceBook`; `ladderCost(ladder, units)` |
| `src/data/catalog.ts` | `catalogFor(race)`: the bundled JSON as a `Catalog`, built once per race |
| `src/market/exchangeClient.ts` | fetch wrappers over `/ex/api/*` (proxied), batch by 100 keys, localStorage cache with `capturedAt`; depth ladders one item at a time per world, one store per world in memory and in localStorage for an hour; `directoryFromServers(body)` parses `/servers` (faction names from `SIDE`, `game_server_key`) into a `WorldDirectory`, and `fetchWorlds()` calls it |
| `src/market/worlds.ts` | `World`, `Listed { world, match }`, `WorldDirectory`, `SIDE`, `PAIRING`, `directoryOf`, `resolveWorld`; pure |
| `src/state/setup.ts` | `Setup` (world, recent worlds, mastery, tax, plan flags), `parseSetup` at the storage boundary, `PlanSettings` and `settingsOf` (the part a link carries), `peekSetup`, `setWorld`, `PROFESSIONS`, `PLAN_FLAGS` |
| `src/state/chips.ts` | `statusChips(current)`: the world chip's name, side badge, region and match note |
| `src/state/openSetting.ts` | the `Setting` union (`history` carries its item id), the `SETTINGS` each chip opens and `first`, the world picker `Workspace` opens by itself on a first visit, `settingKey`, and `useOpenSetting()`, the one owner of which setting is open and of focus return |
| `src/state/picker.ts` | `pickerView`, `withText`, `initialActive`, `groupNote`, `pairingNote`, `currentNote` for the world list; pure |
| `src/state/combobox.ts` | `moveActive(ids, active, step)` and `useCombobox(ids, onPick, initial, scrollToInitial)`: the active option, arrow keys, Enter and scrolling into view (not to `initial` when `scrollToInitial` is false), shared by `WorldPicker` and `Search` |
| `src/state/answer.ts` | `answerOf` (craft, buy and margin summed over the targets, null when any lacks a listing), `sentenceOf` (the verdict as `Segment`s) and `listSentenceOf` (the same kinds worded for a list, naming the members cheaper to buy), `buyList` (unpriced, bought, then lines stock covers in full, each with its `owned` part), `stepCount`, `targetStatus` (a row's ready, unpriced or locked, walking its whole tree) and the step notes; `blockedNote` (why a listed way cannot be used) and `extraCost` (what a chosen way costs over the cheapest); `bulkBuys` (the items worth a ladder), `depthNote` and `depthCapturedAt`; one `stepsOfPlan` walker over every target's tree; pure |
| `src/state/shopping.ts` | `shoppingText(plan, list, names)`: the buy table as plain text with whole-unit counts, ending with the plan link, for the Copy list button; one target heads it as "What to buy for 3 × Sword on Siel", a list as "To craft on Siel" with a line per member; pure |
| `src/state/grade.ts` | `GRADE: Record<Grade, { name, colour }>`, the game's own grade table (Global display name and colour per NC internal id), `gradeName()` and `gradeRules()`, the `[data-grade]` CSS that `main.tsx` injects once |
| `src/state/useFreshness.ts` | `useFreshness(feed)`: the capture time, age, stale, refreshing, the "these are the newest" note and `refresh`, called once per workspace |
| `src/state/useLadders.ts` | `useLadders(worldId)`: the cached ladders of one world and `request(itemIds)`, which fetches the ones older than an hour and changes state only when one was new; `useBulkLadders(plan, prices, freshness, request)`, the effect the calculator and the list view share |
| `src/state/history.ts` | `RANGES`, the range table (`7d` in `1h` buckets, `30d` in `6h`, each with its date-tick spacing); `historySummary(points)`: the low and high of a series with their dates, its first and last low, `now` (the last close) and whether the last low is up, down or within 2% of the first (null under two known lows); `sparklinePoints` and `sparklinePath(points, width, height)`: where each known low lands in the box and the SVG path through them, a bucket with no listing leaving a gap in x; `chartModel(points, ticks, width, height)`: the low, avg and band paths scaled by time in x and over the lows and highs in y, the round Kina rules and the date ticks' x; `dateTicks(points, every)`: the local midnights a series spans; `nearestPoint(points, fraction)`: the index nearest a fraction of the width, by time; `pointText(point)`: one bucket's prices and listing count; pure |
| `src/state/usePriceHistory.ts` | `usePriceHistory(itemId, worldId, range = '7d')`: the range in its `RANGES` buckets, one request per world, item and range whose answer stays in memory, null until it answers and empty when the exchange has no history (404); a failed request is retried on the next render. `Sparkline` and `PriceChart` call it, so the chart opens on the sparkline's answer |
| `src/state/heat.ts` | `heatOf(marginPct)`: the margin heat colour and its ink; pure |
| `src/state/format.ts` | number and date text; `shownTenths`, the one rule for when a fraction shows as 0.0%, used by `toneOf` and `heatOf` |
| `src/state/useItemMap.ts` | `useItemMap(key, parse, seed?)`: a value per item in localStorage, parsed at the storage boundary and again on save, the one hook behind `useOverrides` (prices), `useOwned` (counts held), `useSources` (the chosen method) and `useList`, each per world; an edited entry keeps its place (`withEntry`), and a `seed` shows until the first edit stores the whole map; `parseEntries` |
| `src/state/list.ts` | `useList(worldId, index, seed)`: the player's list on one world as the planner's `Wanted` map, in the order added, capped at `MAX_LINES` (24, `hasRoom`) and pruned by `makeable` to what the side crafts; `save(itemId, quantity)` sets a line and `null` removes it |
| `src/state/target.ts` | `Target` (the open item and its quantity), `VIEWS`, the one list of views (`calculator`, `list`, `scanner`) that `View`, `parseView` and the nav derive from, `parseQuantity`, the one quantity rule |
| `src/state/itemPage.ts` | `itemPageUrl(itemId)`: the AION2 Hub page of an item, the one place that names the host; pure. Not `useSources`, which holds the buy, craft or morph choice |
| `src/state/useSources.ts` | `useSources(worldId)`: the method the player insists on per item, as the planner's `Forced` map; `parseMethod` accepts only `buy`, `craft` and `morph` |
| `src/state/usePersistentState.ts` | `usePersistentState(key, fallback, parse, seed?)`: one slot in localStorage. A `seed` shows in place of the stored value and reaches storage only through the top-level fields a change touches (`step`); `peekPersisted` reads a slot outside React and `hasPersisted` says whether one exists, which is how `Session` tells a first visit |
| `src/state/shareLink.ts` | the share link query: `encodeLink(plan)` writes a key only where the plan differs from a frozen `BASELINE`, and on the list view one `list=<itemId>x<qty>` key per line (`x1` left off); `openLink(search, stored, directory)` turns a query into a `Seed` for the three slots and the list, fitting each list id to the side it opens on, `'waiting'` while only the world list can name its world, and a `LinkNote` for an unknown world, item or dropped list lines; a list view with no usable line opens the calculator; `noteText`; pure |
| `src/state/useShareLink.ts` | `useLinkOpening(worlds)`, the boot gate, which keeps its first answer; `useAddressBar(query)`, the only `history.replaceState` caller, half a second behind the plan and flushed on `pagehide` |
| `src/state/useClipboard.ts` | `useClipboard()`: the clipboard write and the two-second `copied` state behind Copy list and Copy link |
| `src/state/` (rest) | React state: worlds, prices, overrides, target, scan rows, persisted in localStorage |
| `src/components/TopBar.tsx` | wordmark, views (`list` only once the list has a line or the view is open, with a count badge phones hide), the context chips, `FreshnessPill` (the only refresh button) and Copy link |
| `src/components/ListView.tsx` | the list view: each line with its quantity field, cost and Remove, the list sentence over the craft, buy and margin strip, and `Details` over the merged plan without the rates tab; a line's name reopens the item in the calculator at its quantity |
| `src/components/AddToList.tsx` | the one control that puts the open item on the list, reading `Add to list`, `In list` (opens the list) or `Update list to N`, disabled when the list is full |
| `src/components/Figure.tsx` | `Figure`, one cell of the figure strip, and `typeset`, the sentence with its amounts in mono, shared by the answer panel and the list view |
| `src/components/Sparkline.tsx` | the seven-day line of the lowest listing as a button that opens the `history` setting, with its "7 d: low, high" text, under the buy figure's note in the answer panel when something is listed; renders nothing without two known lows |
| `src/components/PriceChart.tsx` | the body of the `history` surface: the `Segmented` range, the SVG from `chartModel` with the selected bucket in `useState` (the pointer and the arrow keys move it, the last bucket to start), the readout line and the range's summary line; the loading and empty lines |
| `src/components/SettingHost.tsx` | renders zero or one `Surface` for the open `Setting`, framed from a `Record<Setting['kind'], …>` of placement and width with a title per kind, the item's name for `history`: `WorldPicker`, `MasteryStats`, `TaxStat`, `PlanSettings` or `PriceChart` |
| `src/components/Surface.tsx` | the one native `<dialog>` for every in-place setting |
| `src/state/useNarrow.ts` | `NARROW_BELOW = 640`, the one copy of the phone breakpoint in code, and `useNarrow()`, which `Details`, `Scanner` and `ScanTable` read when a phone needs a different tree (buy cards instead of the table, the source control under the name, the hidden-rows line under the list) rather than a stylesheet rule |
| `src/components/Segmented.tsx` | the one segmented control (a radio group, an option may be disabled with its reason as `title`): Normal and Splendent, the picker's regions and sides, the source choice under steps, the chart's range |
| `src/components/ItemCell.tsx` | icon, name and notes of one item. An optional `href` adds a link glyph after the name that opens in a new tab and stops the click from reaching the row; only the buy table and the steps rows set it, with `itemPageUrl` |
| `src/components/SourceCell.tsx` | buy, craft or morph for one row under steps, built from `plan.alternatives`; a way at Infinity is disabled with `blockedNote` |
| `src/components/PriceStatus.tsx` | `PriceStatus`, the capture time or the stale or missing warning as text, plus one sentence when the plan's oldest ladder is stale against the prices, and `FreshnessPill` |
| `src/components/Notice.tsx` | `Notice` with its Try again button, `WorldsFailed` for the world list, and `LinkNotice` with Dismiss for a link that did not fully apply |
| `src/components/CountCell.tsx` | the Have count, a number edited in place like `PriceCell`; zero or empty clears it |
| `src/components/` (rest) | calculator, scanner, tables, cells |
| `vite.config.ts` | `server.proxy` and `preview.proxy`: `/ex` → `https://aion2.exchange`, `/a2t` → `https://aion2t.com` (icons) |

`src/domain/` imports its own files with `.ts` extensions and only `import type` for types, so
Node 24 runs it without a build step (`verify-model.mjs` does).

## The status line and its settings

The world chip opens the world picker and the Settings button opens the settings drawer. `App`
renders `TopBar` with `statusChips(current)` and `SettingHost` right after it, so tabbing out of
a popover lands in the page.

```ts
const surface = useOpenSetting()            // { opened: { setting, anchor } | null, open, close }
surface.open({ kind: 'world', from: 'world' }, chip)    // the same chip again closes it
surface.close()                             // focus returns to the chip after the surface unmounts
surface.close(false)                        // the user clicked or tabbed elsewhere; focus stays there
```

- `Setting` is `{ kind: 'world', from: 'world' | 'first' } | { kind: 'settings' } | { kind: 'history', itemId }`.
  One value means two settings can never be open together. `SettingHost` frames the surface from
  a `Record` over `kind` and picks the body in a switch with a `never` default, so a new kind
  fails `tsc` in both places.
- `Surface` takes `placement: 'popover' | 'drawer'`. A popover on a screen 640 px or wider opens
  with `show()`, sits under its chip, and closes on Escape, on a pointerdown outside it and its
  chip, and when focus leaves it. Under 640 px the same popover opens with `showModal()` as a
  bottom sheet, and it closes if the viewport crosses 640 px while open. The drawer is modal at
  every width, 440 px from the right and full width on phones. A modal surface closes on Escape
  through the dialog's `cancel` event and a popover through a document keydown, never both.
  `NARROW_BELOW` in `useNarrow.ts` is the one copy of the breakpoint in code, and `Surface.test.ts`
  fails when the `640px` and `639.98px` media queries in `styles.css` drift from it.
- The world chip names itself with `aria-label` (`world Kaisinel, Elyos, EU`), and the Settings
  button carries `aria-label="Settings"`, so its word can be `display: none` on phones.
- The world list opens from the world chip. `withText(query, text)` clears a picked region on the
  first typed letter, since the search spans all 106 worlds; a region picked after that still
  narrows the search.
  `pickerView(directory, query, recent)` filters by text, region and side and returns the recent
  rows, the region groups and `keyboardOrder`. The search field keeps focus and points at the
  active row with `aria-activedescendant` through `useCombobox`, which scrolls the active row
  into view on open and on arrow keys, never on hover.

### Prices and their freshness

`Workspace` calls `useFreshness(feed)` once and hands the result to the header pill, the answer
panel and the scanner. The pill is the only Refresh button and owns the "these are the newest"
note. `PriceStatus` under the answer and the scanner title is text only.

`Calculator` and `ListView` ask `useLadders`, through `useBulkLadders`, for the ladders of the items their plan buys in bulk (`bulkBuys`).
`Workspace` rebuilds the price book when one arrives, and the plan re-runs with it. `request`
changes state only when a ladder was new, so a plan that already has its ladders settles in
one pass.

### Verdict sentence

`sentenceOf(verdict, names)` returns `Segment[]`, each `{ kind: 'text' | 'kina' | 'percent', text }`.
The answer panel sets the `kina` and `percent` segments in mono and the rest as plain text, so no
component parses the sentence for numbers. `listSentenceOf(plan, verdict, names)` words the same
verdict kinds for a list: whether crafting the whole list beats buying it all and which members are
cheaper to buy, with no sell clause, and the `blocked` and `missing` words unchanged.

### Worlds and their enemy worlds

aion2.exchange sends each world with `game_server_key` = side × 1000 + region × 100 + n.
`directoryOf` pairs a key with the same key on the other side, and accepts the partner only when
it is the other race in the same region; otherwise `match` is `null`. The rule reproduces all 53
pairs in NC's notice of 2026-10-04. `worlds.test.ts` checks that notice
(`src/market/pairing.notice.json`) against a captured `/api/servers` response
(`src/market/servers.fixture.json`) parsed by the same `directoryFromServers` the app uses, so
the rule is proven on the live keys. NC rotates pairs, so when that test fails, the fix is an
override table inside `PAIRING` and a new `since`. The key never leaves `src/market`. The picker
dates the pairs once, in its footer, from `PAIRING.since`.

`Setup.world` keeps the six-field `World` it always had, and `match` is never stored, so a stale
pairing cannot load from storage. `resolveWorld(directory, saved)` returns the directory's copy
once the list loads and wraps the saved world with `match: null` before that. `Setup.recent`
holds up to three world ids, newest first, and only `setWorld(setup, world)` writes it, together
with `world`. Forms change the rest through `SetupPatch`, which excludes both.

### Side colour, grade colour and margin heat

`.app` carries `data-side={race}`, which sets `--side` and `--side-l` to the Elyos blue or the
Asmodian violet. A picker row and a matched-world name carry their own `data-side`, so no
component picks a side colour in code.

`Item.grade` is the closed union `Grade` of NC's internal ids (`Common`, `Rare`, `Legend`,
`Unique`, `Epic`, `Mythic`, `Special`), parsed at the catalog boundary. `GRADE` holds the game's
own display name and colour for each (the Global client prints `Legend` as "Epic" and `Epic` as
"Heroic"; every label on screen goes through `gradeName`), and `gradeRules()` turns the colours
into `[data-grade='…'] { --grade: … }` rules that `main.tsx` injects once, so `styles.css` holds
no grade list. `grade.test.ts` fails when the bundled catalog uses a grade outside the union, a
display name drifts from the client's, or a colour drops under 4.5:1 on `--page`.

`heatOf(marginPct)` blends `#B35317` to `#FFDC8F` with alpha 0.14 to 1 over `--page` and returns
the opaque background with a black or white ink, whichever contrasts more. The scale is absolute:
`HEAT_CAP = 1`, so +100% and above saturate. Losses and margins shown as 0.0% get no heat,
by the same `shownTenths` rule that gives them no gain or loss tone.
`heat.test.ts` checks 4.5:1 for every shown tenth of a percent and fails when `--page` in
`styles.css` drifts from `HEAT_BASE`. `HeatChip` renders it in the scanner and the answer panel.

## Types

`src/domain/types.ts`, verbatim:

```ts
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
  root: StepPlan
  cost: number
  unitCost: number
  market: { lowest: number; soldAvg: number | null; listings: number; cost: number; depth: Depth | null } | null
  margin: number | null
  marginPct: number | null
  /** Every bought leaf, summed over the steps that use it. `expected` includes the `owned` part; `subtotal` and `depth` are for the rest. */
  shopping: { itemId: ItemId; expected: number; owned: number; unit: number; subtotal: number; depth: Depth | null }[]
  missing: ItemId[]
  blocked: RecipeId[]
  /** Every way the planner weighed for each item it met, so the UI can offer the others without re-planning. */
  alternatives: ReadonlyMap<ItemId, Alternative[]>
}
```

## Engine rules

- `planCraft` resolves an item to the cheapest `Acquisition` with memoisation per item and a
  visited set to break cycles (Odyle → Ore → Ingot never loops back, but the guard stays).
  Each wanted item is always crafted, by the cheapest recipe that makes it, on its own tree in
  map order; one memo and one stock budget serve every tree, and a wanted item is never taken
  as a material for another wanted item.
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
- A forced method (`PlanInput.forced`, per item) wins over the cheapest wherever the item
  appears, which is what "I craft ingots" means. A forced craft or morph competes with its
  global switch off, since the explicit choice is narrower. A forced way at `Infinity`
  (mastery too low, a material with no price) is not honoured and the cheapest is used, so a
  choice never shows an `Infinity` cost. `plan.alternatives` lists, per item the planner met,
  the cheapest candidate of each method with its unit cost and the route's recipe id, so the
  UI offers the other ways and says why one is blocked without re-planning.
- Byproduct credit values the other results of a step (normal items left by combo crafts) at
  `lowest * (1 - taxRate)`, only when the item has a market or manual quote.
- Depth. `prices.quote(itemId, units)` with `units > 1` and a cached ladder walks the levels
  from the cheapest. A partial level costs its unit price times the fraction taken, units past
  the last listing cost the top rung, and the quote's `depth` carries the units, cost, listings
  and levels spanned and the units available. aion2.exchange polls depth far less often than
  prices, so the ladder's shape is anchored to the quote's lowest listing, every level scaled by
  `lowest / levels[0].unitPrice`. The UI says so when the poll is stale against the prices. A
  single unit, a manual price, an NPC price, or an item with no ladder quotes flat, which keeps
  `verify-model.mjs` equal to aion2.exchange at quantity 1.
- The units bought of a material depend on the plan, and its unit price depends on those units.
  So `planCraft` runs the planner with no demand first, where every quote is for one unit, then
  re-runs it with the previous pass's bought units per item (`expected - owned`, summed over
  every step). It stops when the demand stops changing, when no ladder prices the old or the
  new demand, or after four passes. Stock the player holds is spent before the ladder is read,
  so a ladder only ever prices the bought part of a line. A material whose depth-aware price
  passes its crafting cost switches to crafting on the next pass. Each target's `market.cost`
  buys its `quantity` along the item's ladder, and its `margin` still sells at the lowest
  listing.

## Alternatives considered

| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| Price access | Vite proxy, no server | Node/Express proxy with disk cache | smallest thing that works; localStorage holds the last snapshot |
| Rate data | metabot.gg's client curves per recipe + family fallback, gamewith.ai tables as a check | gamewith.ai tables per product id | metabot covers every craft recipe of both races at full precision and is keyed by recipe id; gamewith has pages for 79 Elyos products and rounds to 0.1% |
| Recipe data | generated JSON in repo | fetch at runtime | offline use, and aion2t.com could gate it any day |
| Engine | expected value per step with cheapest acquisition memo | Monte Carlo | same mean, deterministic, instant in the UI |
| In-place settings | one native `<dialog>`, non-modal on wide screens | Base UI Popover, Drawer and Combobox | Base UI needs a popover tree and a drawer tree per setting and a width switch in JS for phones; the native dialog makes the sheet a stylesheet rule and adds no dependency |
| Enemy world | derived from `game_server_key`, pinned by a fixture of NC's notice | a hand-entered table of 53 pairs | the table equals the rule today; it stays the planned override when NC rotates pairs |
