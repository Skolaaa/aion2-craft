# Design spec, third pass: Ledger in Aion's colours

Reading: a desktop-first money tool for one Aion 2 player who checks it a few times a day on a
laptop and sometimes on a phone. The second pass (one column, brass, Manrope) was clean but
generic and hid two assumptions: the header showed mastery as five unlabelled numbers and the
tax rate appeared only inside Settings. This pass takes the Ledger prototype's structure and
density, Atlas's Aion art direction, and Arena's in-place context chips. The three prototypes
and their research are in `docs/explorations/`.

## Tokens

Dark only. Light mode is dropped: the game, every peer site and all three prototypes the user
chose from are dark, and one theme halves the CSS to keep right.

| Token | Value | Use |
|---|---|---|
| `--page` | `#121212` | page background |
| `--surface` | `#1A1A1A` | status line, figure strip, picker, drawer, popovers |
| `--raised` | `#242424` | hovered and selected rows, active segment |
| `--rule` | `#2E2E2E` | every 1 px border and table rule |
| `--rule-2` | `#3C3C3C` | popover edges, kbd |
| `--text` | `#F2EFE9` | body text |
| `--muted` | `#A39F97` | labels, notes (6.9:1 on page) |
| `--bronze` | `#C69C7C` | ornamental rules and diamond finials only |
| `--gold` | `#E6B85C` | money: figures, sorted column header, primary button, links |
| `--gold-hi` | `#FFDC8F` | margin figure, focus ring, diamond cores |
| `--heat-0` to `--heat-1` | `#B35317` to `#FFDC8F` | margin heat column only (alpha 0.14 to 1), text `#000000` or `#FFFFFF` picked per cell for contrast (`--page` and `--text` as inks fall to 4.0:1 mid-ramp; black and white keep 4.5:1) |
| `--gain` / `--loss` | `#5FD38D` / `#F0716B` | signed margin, change chips |
| `--elyos` / `--elyos-l` | `#2E6FD1` / `#7EB3FF` | Elyos: side badge, the world chip, the answer panel's 2 px top border |
| `--asmo` / `--asmo-l` | `#7B4FD6` / `#B89CFF` | Asmodian: the same places, and matched-world names |
| grades | Common `#D9D9D9`, Rare `#5FB4FF`, Legend `#D08BFF`, Unique `#FFB347` | item names in tables and the item header, 1 px icon frame with a 25% inner glow |

Blue and violet mean a side and nothing else. Gold means money. Bronze means ornament.

Type. Three families, each with one job.
- `Cinzel` 400 (Google Fonts), tracking 0.06em: the wordmark, the item name in the answer panel
  (26 px, 20 px on phones), section titles (20 px) and dialog titles. Cinzel is the Aion signal.
- `IBM Plex Sans` 400/600: sentences, item names in tables, notes. 14 px body, 16 px verdict,
  13 px tables and notes, 12 px labels.
- `IBM Plex Mono` 400/600: every digit, chip, tab, column header and any label that sits next
  to a number. 11 px uppercase column headers with 0.04em tracking, 12 px chips, 28 px the three
  answer figures (22 px on phones). `font-variant-numeric: tabular-nums` everywhere.

Space 4 / 8 / 12 / 16 / 24 / 32. Radius 2 px (sheet top corners 8 px on phones). Borders 1 px.
No shadows. No gradients except the heat ramp on margin cells. Rows 36 px. Status line 44 px.
Max width 1280. Ornament: a section title sits between two 1 px bronze rules that end in a
rotated-square finial with a gold core, drawn with pseudo-elements. The figure strip's three
cells are split by the same rules and finials. Nothing else is ornamented.

## Layout (desktop)

```
+----------------------------------------------------------------------------------------------+
| CRAFT OR BUY  calculator  scanner | region EU | world Kaisinel [EL] | tax 5.0% | BS 100 TL 100 JC 100 AL 100 CK 100 | plan 3/3 |   * prices 21 min ago |
+----------------------------------------------------------------------------------------------+
| item  [ Artisan's Splendent Orichalcum Helm ..................................... ]   /     |
|                                                                                              |
| ====== 2 px top border in the side colour ==================================================  |
| [icon] ARTISAN'S SPLENDENT ORICHALCUM HELM  (Cinzel, grade colour)   Normal|Splendent  qty 1 |
|        Tailoring, recipe level 30, Unique                                                    |
| Craft it if you need one. Expected cost is 8,142,827 Kina under the lowest listing. ...      |
| +--------------------------+<>+---------------------------+<>+---------------------------+   |
| | craft                    |  | buy                       |  | margin                    |   |
| | 9,857,173                |  | 18,000,000                |  | +7,242,827                |   |
| | 4.1 attempts at 96.8% .. |  | lowest of 4 listings      |  | [+73.5%] after 5% tax     |   |
| +--------------------------+  +---------------------------+  +---------------------------+   |
| Prices from aion2.exchange, captured 21 min ago. Refresh                                     |
|                                                                                              |
| buy 9   steps 5   rates                                                                      |
| ITEM                   SOURCE              EXPECTED    UNIT PRICE    SUBTOTAL   SHARE        |
| ...                                                                                          |
+----------------------------------------------------------------------------------------------+
```

The status line is the plan's context, and every value in it is a chip that opens its own
setting in place (Arena's idea on Ledger's line):
- `region EU` and `world Kaisinel [EL]` both open the world picker. The world chip carries the
  side badge in the side colour, so the side never needs its own chip.
- `tax 5.0%` opens a popover: the number input, "Market screen in game, top right", and "Lowers
  what a sale pays out, so it moves the margin".
- The mastery group shows five mono pairs `BS 100` with the full profession name and the
  in-game name on hover and as screen-reader text. It opens a popover with five rows (name,
  in-game name, number input, slider). Under 1100 px the five pairs collapse to one chip
  `mastery 5×100` or `mastery 100/60/…`.
- `plan 3/3` opens the settings drawer (plan options and your prices), from the right, 400 px.
- The freshness pill at the right shows age and a dot (gold when fresh, loss colour when stale);
  it is the refresh button.
- The settings button goes away. Everything it held is reachable from a chip.

World picker, one component used from the region and world chips, desktop popover 440 px under
the chip, bottom sheet under 640 px with a sticky search field:
- Search field "search all 106 worlds" on top, then two segment rows: regions
  (`all NAE NAW EU LA AS`) and sides (`both Elyos Asmodian`).
- Results grouped by region. The group header reads `EU Europe, 46 worlds, matched since 4 Oct
  2026`. Each row: world name, `vs Lumiel` in the matched side's colour, the side badge, and a
  `no prices yet` tag when the exchange has no data. The selected row shows `current` and an
  expanded note: "Matched with Lumiel, Asmodian, since 4 Oct 2026. Server 11304. The market
  stays per world."
- Recently used worlds (up to three, persisted) pinned above the groups.
- Footer line: "Each world is one side with its own market. NCSoft pairs it with an enemy world
  for the Abyss and changes the pair from time to time."
- Arrow keys and Enter choose, Escape closes, focus returns to the chip.

Calculator answer: as the Ledger prototype, with Atlas's item hero (grade-framed 48 px icon,
Cinzel name in the grade colour) and its diamond-ruled figure strip. The margin percentage is a
heat chip, the same visual word the scanner uses. Detail tabs are mono with counts: `buy 9`,
`steps 5`, `rates`. The buy table gets a cost-share bar column on desktop.

Scanner: Ledger's left rail (All plus five professions with counts; a horizontal chip strip
under 900 px), the name filter, the hidden-rows line with "Show them", and one table: Item
(icon, grade-coloured name, profession and level in mono), Craft cost, Market lowest, Margin,
Margin % as the heat column. The sorted header is gold with an arrow. Hidden rows, when shown,
are dimmed with a `needs a price` or `needs mastery 55` pill in the Market lowest cell. On
phones the table keeps Item, Margin and Margin %, and a `sort by` chip row replaces the headers.
No sparkline: it would cost one history request per row.

Settings drawer: plan options with their one-line notes, then "Your prices on Kaisinel" with
reset, as today.

States: as the second pass (loading line, stale pill, proxy-down notice, world list failed with
retry, missing price input in the row, mastery too low in the sentence, no listing).

Mobile (under 640 px): the status line wraps to two rows (chips, then the mastery strip), the
figures stack, the buy table collapses to item plus subtotal with the math as a sub-line, the
picker and popovers become bottom sheets, the drawer takes the full width.

## Principles
- Every number in the header says what it is and opens its own setting.
- One visual word per meaning: gold is money, blue and violet are sides, heat is margin, grade
  colour is grade.
- The same table component everywhere, the same picker from both chips.
- Ornament only on titles and the figure strip. Borders encode grouping, nothing else.
