# Shared brief for the three design-system prototypes

Throwaway visual prototypes. Speed over polish. No production framework, no tests. One folder per
direction under this directory: `proto/<slug>/index.html` plus optional `styles.css` and `app.js`.
Open-in-browser must work from a plain static server (`python3 -m http.server`), so inline the data
from `worlds.json` and `items.json` into a `<script>` tag or fetch them relatively.

The app this is for: "Craft or buy", a crafting calculator for the MMORPG Aion 2. A player picks a
world, types an item, and gets one answer (craft it or buy it) with the expected cost, the lowest
market listing and the margin after market tax. A second view, the scanner, lists every recipe
with its margin. Current production UI (for reference only, do NOT copy it): dark neutral,
brass accent, Manrope, one column. The user called it clean but generic.

## The data shape every prototype must express

```
Region    { code: 'NAE'|'NAW'|'EU'|'LA'|'AS', name, worlds: World[] }
World     { id, name, side: 'Elyos'|'Asmodian', hasData, matchedWith: World | null, matchedSince: date }
Selection { region, world }          -> one server id for prices
Mastery   { Blacksmithing, Tailoring, Jewelcrafting, Alchemy, Cooking }  // 0..100 each
Setup     { selection, mastery, taxRate }
```

Facts from research (official NCSoft notice of 2026-10-04, see ../research/worlds.md):
- Every world is one faction. Siel is Elyos only, Israphel is Asmodian only. Names repeat across
  regions (Siel exists in all five), so the id is the identity, never the name.
- NO world merges have happened in any region as of 2026-10-27.
- NCSoft pairs each Elyos world with an Asmodian world "for a limited time" as server matchmaking:
  the enemy faction you meet in the Abyss and Spacetime Rifts comes from the matched world. NCSoft
  updates the pairings periodically. So the pair is dated metadata shown for context
  ("Matched with Lumiel, Asmodian, since 4 Oct 2026"), never the identity of the selection.
- The market is per world. Prices never pool across the pair.
- Counts: NAE 18 worlds, NAW 10, EU 46, LA 12, AS 20. `worlds.json` lists them as pairs
  (elyos/asmodian); flatten it into worlds with a `matchedWith` reference.

## Screens every prototype must include (one page, a visible switcher between views is fine)

1. Header. Brand, Calculator / Scanner navigation, and the context the plan assumes, readable at a
   glance: region, world and side (for example "EU, Kaisinel, Elyos"), mastery
   per profession with the profession names visible or one hover away, and the market tax rate
   with its label. The two reported problems to fix: today's header shows "Mastery
   100 / 100 / 100 / 100 / 100" with no profession names, and the tax rate shows nowhere except
   a settings field. Every number in the header must say what it is.
2. World picker. Region first, then the world. Within a region the player should be able to
   narrow by side (Elyos / Asmodian) because that is how they think of their character, and each
   world row shows its side and its current matched world as a small dated note. Show a
   "no prices yet" state. Must work on a 390 px wide phone. Searching a world name across all
   regions is a plus, and the result must show the region because names repeat.
3. Calculator answer. Item header (icon, name, "Tailoring, recipe level 30, Unique"), result
   toggle Normal / Splendent, quantity, the verdict sentence, three figures (Craft, Buy, Margin)
   each with its note, the price freshness line, and three detail tabs with these tables:
   What to buy, How it is made, Rates.
4. Scanner. Profession filter, name filter, one table with Item, Craft cost, Market lowest,
   Margin, Margin %, sortable headers, a "hidden rows" count and toggle.
5. Settings. Mastery per profession (number plus slider), market tax rate with where to find it
   in game ("Market screen, top right") and what it changes (the margin and the sell proceeds),
   three plan options with one-line notes.
6. Mobile layout at 390 px for screens 1 to 3. No horizontal scroll.

## Real content to use

Context: EU, Kaisinel (Elyos, server 11304), matched with Lumiel (Asmodian) since 4 Oct 2026. Mastery all 100. Tax 5%.

Item: Artisan's Splendent Orichalcum Helm. Tailoring, recipe level 30, Unique.
Verdict sentence: "Craft it if you need one. Expected cost is 8,142,827 Kina under the lowest
listing. Selling one earns 7,242,827 Kina after 5% tax."
Craft 9,857,173 (note: 4.1 attempts at 96.8% with a 25% combo).
Buy 18,000,000 (note: lowest of 4 listings).
Margin +7,242,827 (note: +73.5% after 5% tax).
Freshness: "Prices from aion2.exchange, captured 21 min ago." with a Refresh action.

What to buy (Item, source, Expected, Unit price, Subtotal):
Artisan's Refining Stone, Market 141 listings, 8.26, 523,000, 4,320,654
Raw Leather, Market 44 listings, 453.83, 4,888, 2,218,323
Expert's Refining Stone, Market 200 listings, 34.92, 63,000, 2,199,893
Pure Odyle, Market 129 listings, 20.65, 29,994, 619,473
Odyle, Market 246 listings, 75.00, 2,600, 194,991
Orichalcum Ingot, Market 15 listings, 75.00, 2,200, 164,993
Refining Stone, Market 42 listings, 149.99, 495, 74,247
Fine Orichalcum Ore, Market 19 listings, 52.38, 650, 34,046
Fine Odyle, Market 41 listings, 17.46, 1,750, 30,554
Total 9,857,173

How it is made (a ladder; nested steps):
Artisan's Splendent Orichalcum Helm, Craft, 4.13 attempts at 96.8% with a 25% combo, 1, 9,857,173, 9,857,173
  Expert's Splendent Orichalcum Helm, Craft, 17.46 attempts at 94.6% with a 25% combo, 4.13, 1,190,383, 4,917,046
  Artisan's Refining Stone, Buy on the Market, 8.26, 523,000, 4,320,654
  Pure Orichalcum Ore, Morph from Odyle, 12.39 attempts at 100%, 12.39, 29,994, 371,684
  Pure Odyle, Buy on the Market, 8.26, 29,994, 247,789

Rates: success 96.8% (mastery 100 against recipe level 30, level difference +70), combo chance
25%, combo success 100%, Splendent per attempt 0.25, attempts for one Splendent 4.13, curve from
metabot.gg for Tailoring level 30, aion2.exchange estimate 9,857,161 (matches to 0.000%).

Scanner rows (Item, profession and level, Craft cost, Market lowest, Margin, Margin %):
Artisan's Splendent Orichalcum Helm, Tailoring 30, 10,330,435, 19,999,999, +8,669,564, +83.9%
True Dragon Lord Helm, Tailoring 55, 33,568,697, 45,333,333, +7,597,969, +22.6%
Artisan's Splendent Orichalcum Greaves, Tailoring 35, 10,626,390, 18,999,990, +7,423,601, +69.9%
True Dragon Lord Boots, Tailoring 60, 37,289,586, 45,555,555, +5,988,191, +16.1%
Artisan's Splendent Orichalcum Gloves, Tailoring 35, 9,490,777, 14,980,000, +4,740,223, +49.9%
Plus a note "212 rows hidden: 180 need a price, 32 need more mastery" with a toggle.

Item grades and icon URLs are in `items.json` (Common, Rare, Legend, Unique). Grade colour is a
choice per direction, not required.

Professions in game: Blacksmithing, Armorsmithing (we call it Tailoring), Handicrafting (we call
it Jewelcrafting), Alchemy, Cooking.

## Quality floor, all directions

Body text contrast at least 4.5:1. Tabular numbers. Visible keyboard focus. Reduced motion
respected. Fonts from Google Fonts via `<link>` are fine for a prototype. Icons: the item icons
from `items.json` plus at most one icon library from a CDN. No horizontal page scroll at 390 px.

## Deliverable per direction

`proto/<slug>/index.html` (+ css/js), `proto/<slug>/README.md` with the token table (colours with
hex, type families and scale, spacing, radius, the one memorable element), and screenshots in
`proto/<slug>/shots/` taken with Playwright at 1280x800 and 390x844 for the header + calculator,
the world picker open, the scanner, and settings.
