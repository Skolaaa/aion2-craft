# Roadmap

What to build next for the Aion 2 crafting calculator, in order. Each item says what the
player gets, why it is worth doing, what it depends on, and a rough size. Sizes: **S** is an
afternoon, **M** is one or two days, **L** is a week. Dates are absent on purpose; the order
is the commitment.

The calculator's edge over every other Aion 2 crafting tool (aion2hub, Guild Order, metabot)
is live prices with an expected-cost model that counts failures and combos. The roadmap
either closes a gap those tools have already filled, or widens that edge.

## Done

- The Ledger UI in Aion's own art direction, the game's grade colours and names.
- Public copy on Vercel with the two proxy rewrites.
- Owned materials: a Have column per world, the plan spends stock first, Copy list as text.
- Share links: the address bar holds the plan's world, item, quantity, mastery and options, and Copy link copies it.
- Depth-aware prices: a bulk buy follows the exchange's listing ladder for the units the player does not hold, and the row says how many listings it spans.
- Per-component source choice: buy, craft or morph per part under steps, held per world, with what the choice costs over the cheapest way on the row.
- Where to get it: each item in the buy table and under steps links to its AION2 Hub page, which lists where it is gathered, dropped, crafted or sold.

## Now: make a plan shareable

These are table stakes. Every competitor has them, and they are what turns one player's
calculator into something a Legion passes around.

### 4. Multi-craft list (M)

Add several items to one list and get a single merged buy table, with owned stock shared
across them. The planner already takes a quantity; the work is a basket in state, a merged
`buyList`, and the Copy list text for several targets. A shareable basket extends the share
link query in `src/state/shareLink.ts`.

## Next: widen the edge

Nothing for Aion 2 does any of these. Each one uses data the app already fetches or ships.

### 5. Price history sparkline (S)

A seven-day line next to the buy figure, so a margin reads as a trend or a one-hour blip.
`fetchPriceHistory` in `exchangeClient.ts` already exists and nothing calls it. One request
per open item, none on the scanner.

### 6. Cost at risk (M)

Failures eat materials, so a craft with 4 expected attempts can take 9. Show the cost at
the 90th percentile next to the expected cost. For one step this is the negative binomial;
for nested steps a small Monte Carlo over the plan tree. Pure function in `src/domain/`,
tested against the closed form on single steps.

### 7. Profession leveling planner (L)

"Cheapest Kina from Alchemy 63 to 70." Needs the mastery EXP table and the EXP per craft,
which metabot.gg publishes next to the curves `fetch-rates.mjs` already scrapes. Then a
planner that picks recipes by Kina per EXP at each level, with the player's stock and
prices. The biggest single feature here, and the one WoW and FFXIV sites built audiences on.

### 8. Watchlist (S)

Pin items and see their margin on every price refresh, on a small table above Best margins.
Persisted per world like the stock.

## Later

### 9. UI cleanup pass (S)

The scanner rail below 900 px, the density of the Details tabs on phones, and the empty
states. Screenshots first, then a marked-up list, then the fixes in one PR.

### 10. Installable, works offline (S)

A manifest and a service worker that serves the shell and the last prices, so the phone
copy opens at a crafting station without signal. The app already keeps the last quotes in
localStorage.

### 11. Data refresh on a schedule (M)

A GitHub Action that reruns `fetch-recipes.mjs` and `fetch-rates.mjs` weekly and opens a
PR when the generated files change, so a game patch does not depend on someone remembering.
Needs the scripts to run clean in CI, including the `.cache/` warm-up.

### 12. Korea and Taiwan recipes (L)

aion2hub lists 1,080 KR/TW recipes against 604 Global ones. The catalog builder is
per-race already; a per-region catalog would let players preview what Global gets next.
Only worth it once there is demand, and only if a price source exists for those regions.

## Not planned

- Accounts or a server. Everything stays in the browser, as the README promises.
- Cross-world arbitrage. Items do not move between worlds.
- Automatic in-game inventory. There is no API, and reading the client is out of scope.
