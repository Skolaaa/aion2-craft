# Interface design plan

The interface answers three questions for one player on one Mac. Is it cheaper to craft an item or buy it on the Market. What do I need to buy or craft, and what do the failed attempts cost. Which craftable item has the best margin right now. Every design choice below serves one of those questions or gets cut.

## Subject and reader

The reader is an Aion 2 crafter who already knows the vocabulary (Splendent, Odyle, Kina, mastery) and stares at numbers for a living. The tool lives in a second window. Density matters more than first-visit friendliness, but every number has to be readable at a glance and trustworthy at a second look.

## Palette

Four palettes share one structure. The faction of the selected world picks the hue. The OS picks dark or light. Dark is the default.

| Name | Role | Elyos dark | Asmodian dark | Elyos light | Asmodian light |
|---|---|---|---|---|---|
| Nightfall | page | `#061226` | `#170d23` | `#e7effb` | `#f0ecf9` |
| Bulwark | panels | `#0d1c33` | `#21162f` | `#f8fafe` | `#fbf9ff` |
| Rivet | rules, tree rails | `#2b3c56` | `#413552` | `#c7d4e7` | `#d6cee4` |
| Moonlight | text | `#eaf1fa` | `#f2eef8` | `#132032` | `#231a2f` |
| Aether and Orchid | the one accent | `#62cbfe` | `#e7a0ed` | `#076c92` | `#8d3b96` |

Supporting values exist only to carry meaning. Gain `#6de18b` and loss `#ff9183` on dark, `#00672d` and `#ac2722` on light, always paired with a sign or a word. A fourth value, warn, marks stale prices and always comes with an icon and text. Muted and faint text steps, the raised surface, and the control edge are derived from the same hue in `src/styles.css`.

All text pairs reach 4.5:1 and control edges reach 3:1 in all four palettes. A script computed the ratios from the same OKLCH values the hex codes come from.

## Type

- **Marcellus** for names: the app title, the item being priced, panel titles. A flared Roman face that reads like an inscription on an item tooltip. Sentence case, never all caps.
- **Barlow Semi Condensed** for everything else, and for every figure, set with tabular lining numerals. Its narrow set fits seven-figure Kina amounts into table columns and phone screens.
- Scale in px: 13 (notes, column heads), 16 (body, rows), 20 (panel titles, rate values), 24 on phones and 28 on desktop (the item being priced), 30 on phones and 38 on desktop (the three headline figures). Weights 400, 500, 600. Body line height 1.4, figures 1.1.

## Layout

One persistent rail holds the player's setup, because the interaction that matters is turning a dial (mastery, tax, a manual price) and watching the cost change. The main column holds one view at a time.

```
desktop 1440
+--------------------------------------------------------------------------------+
| mark  Crafting Ledger   Calculator  Profit scanner              Kaisinel, Elyos |
+---------------+----------------------------------------------------------------+
| Your setup    | [ search items ................ ] Qty [ 1 ]  (Normal|Splendent) |
| World       v |                                                                |
| Mastery x5    | [icon] Artisan's Splendent Orichalcum Greatsword               |
|  slider+num   |        Blacksmithing, needs 30, Unique                         |
| Market tax 5% |                                                                |
| Options x3    | Craft it          Buy it now        Margin after tax            |
| Your prices   | 19,472,361        17,999,870        -2,372,486  -12.2%          |
|  (n)          | Buying is cheaper by 1,472,491                                 |
|               | [segments of cost ........................ |  |]  ribbon           |
|               | Success 96.84%  Combo 25%  Attempts 4.13  All-buy 21.0M ...     |
|               | Prices 14 min old  [Refresh]  from aion2.exchange               |
|               +------------------------------------+---------------------------+
|               | Ladder (tree, expandable)          | Shopping list (leaf buys) |
+---------------+------------------------------------+---------------------------+

mobile 390
+----------------------------+
| mark  Crafting Ledger      |
| Calculator | Profit scanner|
| Kaisinel, Elyos      Setup v|
| [ search items ..........] |
| Qty [1]  (Normal|Splendent)|
| [icon] Item name           |
| Craft it     19,472,361    |
| Buy it now   17,999,870    |
| Margin       -2,372,486    |
| ribbon                     |
| rates in two columns       |
| Ladder, one line per item  |
| Shopping list              |
+----------------------------+
```

The scanner is a table at 760px and wider. Below that each row becomes a two-line entry with the margin on the first line, and a sort select replaces the column heads.

Alignment is left for words and right for figures. Nothing is centered except the empty states.

## Principles

1. **Figures are the hero.** Large tabular numerals, right-aligned, three importance steps (38, 20, 16). Labels stay small and quiet.
2. **The room follows the faction.** Switching to an Asmodian world re-tints the canvas and the accent. The recipe sets differ by race, so the player should see which one they are in without reading.
3. **Structure encodes data.** The tree rail encodes depth. The ribbon encodes cost share. Inline bars in the shopping list encode each line's share of the total. A manual price carries an accent underline and the words "your price". There are no decorative rules, gradients, or shadows.
4. **One memorable thing, the cost ribbon.** A single bar whose segments are the root materials, sized by their share of the cost, on the same axis as two notches: the market lowest, and the sale price after tax. The gap between the end of the ribbon and the second notch is the margin, drawn exactly. Everything else stays quiet.
5. **Say what is wrong and what fixes it.** A missing price becomes an input in the notice itself. A blocked recipe names the mastery it needs. A dead proxy names the command that starts it.

## Review against the brief

I wrote a first draft, then checked it against the generic output for "dark Aion 2 crafting dashboard". The first draft was a navy page, a blue accent, a row of four KPI cards, Inter, and a plain table. That is the default, so these parts changed.

| First draft | Revised | Why |
|---|---|---|
| Row of KPI cards | Three bare figures plus a one-line verdict, then the ribbon | Cards say nothing about how the numbers relate. The ribbon shows cost, market, tax, and margin on one axis |
| One fixed blue accent | Accent and canvas hue follow the faction | The faction is the subject's own axis, and it tells the player which recipe set they are reading |
| Inter or system sans for everything | Marcellus names over Barlow Semi Condensed figures | Item names are proper nouns in the game's world. The condensed face fits long Kina amounts |
| Uppercase tracked section labels | Sentence-case labels, none above content that needs none | The skill's list of tells |
| Gold for Kina | No gold | Gold is the fantasy default and the starter's look. It also collides with the stale-price warning |
| Monospace for numbers | Tabular numerals of the sans | Same alignment, no data-label look |
| Identical rounded cards with soft shadows | Flat panels, radii that grow with the size of the thing (3, 6, 10), no shadows | Hierarchy through surface steps and rules that carry information |
| Tabs for ladder and shopping list | Side by side at 1200px, stacked below | Both answer question two, and tabs hide one |

## Alternatives rejected

- **Top HUD strip for world and mastery.** It frees width but crowds seven controls into one row, and the hints and the persisted-prices list have no home. The rail wins for a tool where the player edits those inputs while watching a result.
- **Recipe list as a permanent second pane.** Costs a third of the width for something used once per session. A search box with a results list does the job, and the scanner is the browse view.
- **Bar chart comparing craft, all-buy, market and sold average.** Reads clearly but adds nothing the figures do not say. The ribbon adds composition and the margin gap.
- **Light and dark theme toggle.** The brief asks for `prefers-color-scheme`. A toggle is one more control that has to persist and be tested.

## What changed while building

- The ladder has no separate source column. How an item is acquired (Buy on the Market, Buy at your price, Craft, Morph) sits under the item name, so the name column keeps room at 650px, the width it gets beside the shopping list on a 1440px screen.
- The ladder, shopping list and scanner pick their layout from the width of their own container (`@container`), not from the viewport, because the rail takes 320px on desktop and the available width differs per view.
- The scanner puts the grade under the profession and drops the sort select on desktop, since the column heads sort. Below 760px the table becomes cards, the profession chips become a select, and the sort select returns.
- Each world has its own saved manual prices. A price set for one world never leaks into another.
- Switching faction keeps the selected item by matching its name in the other race's catalog, because the two races use different item ids for the same name.
- The target item can take a manual price too. That is how the margin works for an item nobody lists.

## Browser check

Run on 27 Oct 2026 in Chrome with a clean profile, dev server on port 5175, world Kaisinel (Europe, Elyos, id 11304).

| Step | Seen |
|---|---|
| Search "Artisan's Splendent Orichalcum Greatsword", Enter | Item 110130013, Splendent selected in the Normal and Splendent switch |
| Blacksmithing mastery 40 | Success 87.20%, cost 21,360,167 |
| Blacksmithing mastery 100 | Success 96.84%, combo 24.21%, 4.13 attempts, cost 19,234,191, market lowest 17,999,870, margin after 5% tax -2,134,314 |
| aion2.exchange `/api/crafts/110130013?server=11304` | Cost 19,472,361 and market 17,999,870, same snapshot (captured 18:07:55Z). The exchange always crafts the whole three-step ladder. This app buys the Expert's Splendent Greatsword at 1,595,999 each because that is cheaper than crafting it at about 1,653,661 |
| Own price of 99m on the Expert's Splendent Greatsword, which forces the full ladder | Cost 19,472,373. The gap to the exchange is 12 Kina in 19.5 million |
| Scanner, sorted by Margin | 272 items shown, 43 need prices. Top row Artisan's Splendent Orichalcum Helm, +8,669,564 and +83.9% |
| 390px wide, calculator, scanner and setup open | `scrollWidth` 390, no element past the right edge |
| Console | No errors or warnings. Only Vite debug lines |

Screenshots are in `docs/screenshots/`.
