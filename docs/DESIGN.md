# Design spec, second pass

Reading: a desktop-first tool for one Aion 2 player who checks it a few times a day. The first pass
showed every figure at once and the page read as a spreadsheet. This pass shows one answer, then
details on request. Uniform means one type family, one spacing scale, one radius, one border, one
accent, and the same table everywhere.

## Tokens

Color, dark theme (default), light under `prefers-color-scheme: light`:

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#15181D` | `#F6F5F2` | page |
| `--panel` | `#1C2026` | `#FFFFFF` | the one answer panel, dialogs |
| `--line` | `#2E343D` | `#DDD9D2` | every border and table rule |
| `--text` | `#EDEAE3` | `#1C1F24` | text |
| `--muted` | `#9AA1AB` | `#646B75` | labels, secondary |
| `--accent` | `#D9A441` | `#9A6B12` | focus rings, links, selected tab, primary button. Brass, because the game's currency is Kina and the tool is about money |
| `--gain` | `#7FC98A` | `#2E7D3E` | positive margin only |
| `--loss` | `#E8847A` | `#B3382C` | negative margin only |
| `--warn` | `#D9A441` | `#9A6B12` | stale and missing-price notices (same hue as accent, never a fourth color) |

Rules: no gradients, no shadows, no grade colors anywhere (grade is a word). Icons: the game's
item icons only, inside a 1px `--line` frame; the UI itself uses no icon font and at most three
inline SVG glyphs (search, chevron, refresh).

Type: one family, `Manrope` (Google Fonts, weights 400/600/700), `font-variant-numeric: tabular-nums`
on everything numeric. Scale: 13 (meta), 15 (body, table), 17 (section titles), 22 (item name),
40 (the two answer figures). Line height 1.45 body, 1.1 figures. No uppercase labels, no letterspacing.

Space: 4, 8, 12, 16, 24, 32, 48. Section gap 32. Panel padding 24. Table row height 44.
Radius: 8 everywhere (inputs, buttons, panel, chips). Buttons: one primary (accent fill, dark text),
one secondary (1px line). Inputs: 1px line, accent ring on focus, label above.

## Layout (desktop, max-width 1040 centered; one column always)

```
+------------------------------------------------------------------------------+
| Craft or buy          [Calculator] [Scanner]        Siel, Elyos v   Settings |   top bar 56px
+------------------------------------------------------------------------------+
| [ Search an item to craft ........................................... ]       |   48px input
|                                                                              |
| +--------------------------------------------------------------------------+ |
| | [icon] Artisan's Splendent Orichalcum Greatsword     Normal | Splendent  | |   answer panel
| |        Blacksmithing, recipe level 30, Unique                 Qty [ 1 ]  | |
| |                                                                          | |
| |   Craft it. Expected cost is 1,467,378 Kina under the lowest listing.    | |   one sentence, 17px
| |                                                                          | |
| |   Craft                         Buy                        Margin        | |
| |   18,532,622                    20,000,000                 +467,378      | |   40px figures
| |   4.1 attempts at 96.8%         lowest of 8 listings       +2.5% after 5% tax |
| |                                                                          | |
| |   Prices from aion2.exchange, captured 35 min ago   [Refresh]            | |   13px meta
| +--------------------------------------------------------------------------+ |
|                                                                              |
|   What to buy   |   How it is made   |   Rates                              |   detail tabs
|   ---------------------------------------------------------------------     |
|   Item                       Expected      Unit price        Subtotal        |   one table style
|   Artisan's Refining Stone      20.65        510,000      10,533,142         |
|   ...                                                                        |
|   Total                                                  18,532,622          |
+------------------------------------------------------------------------------+
```

- The answer panel is the only raised surface. Everything else sits on `--bg` with `--line` rules.
- "What to buy" is the default detail: the aggregated shopping list. "How it is made" is the ladder,
  collapsed to the top step, each step expandable. "Rates" shows success, combo, attempts and
  the level difference, and the aion2.exchange estimate when one exists, each with a one-line
  explanation.
- Any unit price in a table is editable in place (click, type, Enter), shown with a dotted
  underline and the word "yours" after it when overridden. Overrides are per world. Settings
  lists them with a reset.
- Settings is a dialog (not a rail): world, mastery per profession (number input + slider),
  market tax, three plan options with one-line explanations. The top bar shows the world and
  a summary "Mastery 100 / 0 / 0 / 0 / 0" so the player sees what the plan assumes.
- First load with nothing chosen: the search input is focused and under it sit the five best
  margins on this world as plain rows, so the page is never empty.

Scanner view: profession chips, name filter, then one table with five columns:
Item (icon, name, profession and level as meta), Craft cost, Market lowest, Margin, Margin %.
Listings and 28-day average go into a row tooltip/expanded row, not columns. Rows that need a
price or more mastery are hidden by default with a count and a toggle. Click a row to open it
in the calculator. Sort by clicking a header; sorted header is accent colored.

Mobile (under 720px): same one column, the three figures stack, tables keep four columns by
dropping "Expected" into the item meta line. No horizontal scroll at 390px.

States: loading (text line in the panel, no spinner), stale prices (warn line in the panel meta
with a refresh button), proxy down (warn notice above the panel, plan still runs on the saved
copy), world list failed (notice with retry), missing price (the row shows an input in the unit
price cell and the panel sentence says "Enter the missing prices to compare"), mastery too low
(sentence says which profession and level), no listing (sentence says so, cost still shown).

## Principles
- One answer first, then details on request. Nothing competes with the answer panel.
- Every number has a label and a unit or a comparison beside it.
- Same table component for shopping list, ladder, rates and scanner.
- No decoration: borders encode grouping, nothing else.
