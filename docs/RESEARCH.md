# How Aion 2 crafting calculators get their prices

Research notes, 27 Oct 2026. Every claim below was checked against a live response
on that date unless it says otherwise.

## 1. The Grachy/aion2-craft repository does not scrape anything

The GitHub repo is a 10-file Vite + React starter: three hand-typed sample recipes,
a price map typed into a form, and a recursive cost function. Its `index.html` is an
SEO landing page that links to aion2t.com. The real calculator is closed source and
lives at https://aion2t.com/crafting (a Next.js app).

## 2. What aion2t.com/crafting actually calls

Watched in the browser's network panel. Three JSON routes, all plain GET:

| Route | Open? | What it returns |
|---|---|---|
| `/api/servers?region=EU` | yes | 46 EU servers with NCSoft `server_id` (1306..) |
| `/api/en/crafting/recipes?section=craft` | yes | 322 recipes (161 per race); `section=succession` 190, `section=conversion` 248 |
| `/api/en/crafting/recipes/{id}` | yes | one recipe with ingredients: `item_id`, `count`, names in 9 languages, `craftable_recipe_id` |
| `/api/en/crafting/price-snapshot?region=EU&server_id=1307` | **no** | anonymous callers get `{"tier":"anon","latest_collected_at":...}` and no prices |

So aion2t.com has its own price collector, but the output is gated behind an account tier.
Nothing about how it collects is visible from outside.

## 3. The open price feed: aion2.exchange (Aion2Market)

A one-person FastAPI service with Swagger at https://aion2.exchange/api/docs and the spec at
`/api/openapi.json`. Description: "Read-only market data: price history, trade volume and
market overview." Its item keys are NCSoft item ids, the same ids aion2t.com's recipes use,
so the two join on `item_id` with no name matching.

Collection, from `/api/collection` and the homepage: a `snapshot` job every hour per server
(24 snapshots in the last 24 h), a `stats` job that fetches the game's 28-day sales statistics
per item, a `servers` job and a `quna` job. History since 4 Oct 2026. It covers all Global
regions (NAE, NAW, EU, AS, LA) plus KR and TW, one `server` query parameter selects the world.

Endpoints we use:

| Endpoint | Use |
|---|---|
| `GET /api/servers` | world list, `server_id` + `has_data` |
| `GET /api/items?keys=a,b,c&server=` | up to 100 items per call: lowest listing `price`, `listings`, `units_sold`, `sold_avg_price`, `sold_min_price`, `sold_max_price`, `captured_at` |
| `GET /api/items/{key}/prices?range=7d&bucket=6h` | price history |
| `GET /api/items/{key}/depth?units=N` | cost of buying N units from the cheapest listings |
| `GET /api/items/{key}/depth/ladder` | the listing ladder at one poll |
| `GET /api/crafts/model` | their crafting model: success rates at mastery 100 from the game files, morph and craft routes |
| `GET /api/quna` | Kina chests priced in Quna, gives a Kina-per-Quna rate |

Constraints measured on 27 Oct 2026:
- `cache-control: public, max-age=14` at first; a later check of `/api/servers` and `/api/items`
  answered `max-age=60, s-maxage=290`. The data changes once an hour, so polling faster than once
  a minute is pointless.
- No `Access-Control-Allow-Origin` header and `OPTIONS` returns 405, so a browser page cannot
  call it directly. The app goes through a local proxy (Vite's `server.proxy`).
- robots.txt: `Content-Signal: search=yes, ai-train=no, use=reference`. Reading the API for a
  personal tool is reference use. Keep the request rate low and credit the source in the UI.

Other consumers of the same feed: aion2timers.com/exchange (states it uses Aion2Market data,
hourly) and LusitanoScripts/aion-helper (desktop app, polls it every 15 min).

## 4. Other price sources, not used

| Source | Notes |
|---|---|
| a2-tracker.com | asking prices across 106 worlds, no API found |
| aion2.market | server picker, favourites, comparator, no API found |
| kinahledger.com | weekly report + table, no API found |
| aion2.plaync.com (NCSoft) | official site API has characters, items, rankings. No market or broker routes. nuriland/aion2-api reports the Global `Item` route was removed around 12 Oct 2026 |

## 5. Recipe and rate data

- Recipes: aion2t.com (section 2). 161 Light recipes in `craft` (142 distinct names), duplicated for Dark.
  The list route gives `combo_probability` and `success_prob` in basis points (2500 = 25%,
  10000 = 100%). The detail route `/recipes/{id}` gives the same fields in percent (25, 100,
  10). `fee` is 0 everywhere. `success_prob` is null for `craft` and `succession`;
  `conversion` recipes carry 100% or 10%. 38 transfer (`succession`) recipes per race also
  have a 25% combo that yields the Splendent variant.
- aion2.exchange `/api/crafts/model` cites "game files, AION2 5.3.2.0, Data/Table CraftRecipe +
  ConversionRecipe + CraftComponentReplacement + ... CraftRecipeRate" and gives per-step success
  at mastery 100: 93.12% (basic), 94.63% (Expert's), 96.84% (Artisan's).
- Success-rate curves by level difference: metabot.gg's crafting page embeds the game client's
  curves, one success code and one combo code per recipe, at four decimals of a percent, for
  every craft recipe of both races except 20 tool recipes ("The client lists no success curve
  for this recipe."). This project uses them. At mastery 100 they give 93.1213%, 94.6339% and
  96.8372% for the three Artisan's ladder steps, the same as aion2.exchange.
- gamewith.ai publishes per-item tables from NCSOFT's
  official Korean probability disclosure of 30 Sep 2026, at
  `https://gamewith.ai/aion2/en/items/{product_item_id}`. They are plain HTML tables
  (`Level difference` / `Success` / `Combo success`). Curves seen:

| Family | diff 0 | cap | cap reached at |
|---|---|---|---|
| Basic equipment | 74.0% | 93.1% | ~45 |
| Expert's | 76.8% | 94.6% | 42 |
| Artisan's | 79.6% | 96.8% | 50 |
| True/Star Dragon Lord | 67.5% | 94.6% | 49, combo row differs: 80.1% → 97.4% |
| Consumables (scrolls, potions) | 72.9% | 90.9% | 47 |

  The page notes Global and TW have not published their own tables, so Global may differ.
  Asmodian item pages redirect to the paired Elyos page. Every gamewith table we cached matches
  the metabot curve of the same recipe within 0.05 percentage points.

## 6. Game rules that drive the cost model

- No Kina crafting fee. NPC-sold Bound reagents (Solvent, Sandpaper, Abrasive, Catalyst)
  cost 400 Kina each and appear as ingredients.
- A failed attempt loses every input. A combo fires with the recipe's `combo` chance and then
  succeeds at the "Combo success" rate of the table, giving the Splendent (lucky) result.
  Otherwise the attempt succeeds at the normal rate and gives the normal item. metabot.gg words
  it the same way ("{act}% to activate, then {pct}% to succeed"), and aion2.exchange's attempts
  match it (4.1306 = 1 / (0.96837 × 0.25) for one Artisan's Splendent item).
- Transfer crafting (`succession`) consumes the lower item and is guaranteed.
- Substance Morph (`conversion`) turns Odyle into materials 1:1 with no failure for the
  cases that matter to crafting. It makes the Bound variant ("Fine Orichalcum Ore (Bound)",
  630620002), which recipes accept in place of the unbound material (610620014).
- The Market needs the Special Quai Membership on Global. The listing tax is shown in the
  top-right of the Market screen in game. No source publishes the rate, so it is an input.

Expected-value formulas (the same shape aion2.exchange documents, extended for mastery):

```
p   = success(levelDiff)                 levelDiff = yourMastery - recipe.masteryLevel
c   = combo chance (0.25 ...)            pc = comboSuccess(levelDiff)
splendent per attempt  = c * pc
normal per attempt     = (1 - c) * p
attempts for N outputs = N / (outputs per attempt)
expected material      = attempts * countPerAttempt
cost                   = sum(expected material * cheapest unit price)
cheapest unit price    = min(buy, craft from inputs, morph from Odyle)
```

## 7. Where this project goes further than both sites

- Mastery is an input per profession. aion2.exchange assumes 100.
- Every recipe, not only the Artisan's Splendent ladder.
- Buy-versus-craft decided per ingredient and shown, with manual price overrides.
- Depth-aware pricing for the quantity you really buy, not the single cheapest unit.
- Sell side: lowest listing and 28-day sold average, minus your tax rate.
- Byproduct credit for the normal items that failed combos leave behind.
- Runs locally, caches the last snapshot, works offline on stale prices.

## Sources

- https://github.com/Grachy/aion2-craft
- https://aion2t.com/crafting
- https://aion2.exchange/api/docs and https://aion2.exchange/crafts/method
- https://github.com/LusitanoScripts/aion-helper
- https://github.com/nuriland/aion2-api
- https://www.aion2timers.com/exchange/
- https://a2-tracker.com/database
- https://aion2.market/en/
- https://kinahledger.com/market/
- https://aion2.wiki.fextralife.com/Crafting
- https://metabot.gg/en/aion-2/crafting (rate curves embedded in the page)
- https://gamewith.ai/aion2/en/items/110150015 (and sibling item pages)
- https://gamerant.com/aion-2-how-to-trade-auction-house-market/
- https://space4games.com/en/games-en/aion-2-marketplace-guide/

## 8. Recipe validation

`scripts/validate-recipes.mjs` cross-checks the aion2t.com recipes in `.cache/a2t/` against every
independent source in the cache and exits non-zero on any mismatch. Run on 27 Oct 2026:

| Check | Source | Result |
|---|---|---|
| ingredients and counts, product, output count, mastery level, combo chance | metabot.gg, all 512 craft and transfer recipes | 512 of 512 match |
| material craft routes (ingot, decoration, wood, crystal) | aion2.exchange game-file model | 12 of 12 match |
| combo chance and output count | gamewith.ai, 76 equipment products | 76 of 76 match |
| success curves by level difference | gamewith.ai tables against metabot.gg curves, 79 products | all within 0.1 percentage points |
| Odyle morph routes | aion2.exchange game-file model, 10 routes | 10 of 10 match, product is the Bound variant |

What this does not cover: the 248 Substance Morph recipes beyond those 10 routes have no second
source, and neither do the 20 profession tool recipes' success curves. metabot.gg omits the donor
item from transfer recipes, so the comparison ignores ingredients flagged `is_donor`.
