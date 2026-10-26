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
- `cache-control: public, max-age=14`. Polling faster than that is pointless.
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

- Recipes: aion2t.com (section 2). 142 distinct Light recipes in `craft`, duplicated for Dark.
  `combo_probability` is in basis points (2500 = 25%, 3000 = 30%, 2000 = 20%, 0 = none).
  `fee` is 0 everywhere. `success_prob` is null for `craft` and `succession`; `conversion`
  recipes carry 10000 (100%) or 1000 (10%).
- aion2.exchange `/api/crafts/model` cites "game files, AION2 5.3.2.0, Data/Table CraftRecipe +
  ConversionRecipe + CraftComponentReplacement + ... CraftRecipeRate" and gives per-step success
  at mastery 100: 93.12% (basic), 94.63% (Expert's), 96.84% (Artisan's).
- Success-rate curves by level difference: gamewith.ai publishes per-item tables from NCSOFT's
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

## 6. Game rules that drive the cost model

- No Kina crafting fee. NPC-sold Bound reagents (Solvent, Sandpaper, Abrasive, Catalyst)
  cost 400 Kina each and appear as ingredients.
- A failed attempt loses every input. A success has a `combo` chance to roll again for the
  Splendent (lucky) result, with its own success rate from the table. A failed combo still
  yields the normal item.
- Transfer crafting (`succession`) consumes the lower item and is guaranteed.
- Substance Morph (`conversion`) turns Odyle into materials 1:1 with no failure for the
  cases that matter to crafting.
- The Market needs the Special Quai Membership on Global. The listing tax is shown in the
  top-right of the Market screen in game. No source publishes the rate, so it is an input.

Expected-value formulas (the same shape aion2.exchange documents, extended for mastery):

```
p   = success(levelDiff)                 levelDiff = yourMastery - recipe.masteryLevel
c   = combo chance (0.25 ...)            pc = comboSuccess(levelDiff)
splendent per attempt  = p * c * pc
normal per attempt     = p * (1 - c * pc)
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
- https://metabot.gg/en/aion-2/crafting
- https://gamewith.ai/aion2/en/items/110150015 (and sibling item pages)
- https://gamerant.com/aion-2-how-to-trade-auction-house-market/
- https://space4games.com/en/games-en/aion-2-marketplace-guide/
