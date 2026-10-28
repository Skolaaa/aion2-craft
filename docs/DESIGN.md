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
| grades | Common `#C3C3C3`, Rare `#19E048`, Legend `#379AFF`, Unique `#FFD02B`, Epic `#FF6C00`, Mythic `#FF3245`, Special `#00FFD8` | item names in tables and the item header, 1 px icon frame with a 25% inner glow. These are the game's own colours from NCSoft's icon index (as aion2.exchange serves it), keyed by NC's internal ids; the Global client prints Legend as "Epic" and Epic as "Heroic", and `gradeName` follows it. Each keeps 4.5:1 on `--page`, and an unknown grade shows as Common |

Blue and violet mean a side and nothing else. Gold means money. Bronze means ornament.

Type. Three families, each with one job.
- `Cinzel` 400 (Google Fonts), tracking 0.06em: the wordmark, the item name in the answer panel
  (26 px, 20 px on phones), section titles (20 px) and dialog titles. Cinzel is the Aion signal.
- `IBM Plex Sans` 400/600: sentences, item names in tables, notes. 14 px body, 16 px verdict,
  13 px tables and notes, 12 px labels.
- `IBM Plex Mono` 400/600: every digit, chip, tab, column header and any label that sits next
  to a number. 11 px uppercase column headers with 0.04em tracking, 12 px chips, 28 px the three
  answer figures (22 px on phones). `font-variant-numeric: tabular-nums` everywhere. In the
  verdict sentence only the Kina amounts and the tax percent are set in mono; counts and levels
  stay in the sentence's face.

Space 4 / 8 / 12 / 16 / 24 / 32. Radius 2 px (sheet top corners 8 px on phones). Borders 1 px.
No shadows. No gradients except the heat ramp on margin cells. Rows 36 px. Status line 44 px.
Max width 1280. Ornament: a section title sits between two 1 px bronze rules that end in a
rotated-square finial with a gold core, drawn with pseudo-elements. The figure strip's three
cells are split by the same rules and finials. Nothing else is ornamented.

## Layout (desktop)

```
+----------------------------------------------------------------------------------------------+
| CRAFT OR BUY  calculator  list 3  scanner | region EU | world Kaisinel [EL] | tax 5.0% | BS 100 TL 100 JC 100 AL 100 CK 100 | plan 3/3 |   * prices 21 min ago |
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
| Prices from aion2.exchange, captured 21 min ago.                                             |
|                                                                                              |
| buy 9   steps 5   rates                                                                      |
| ITEM                   SOURCE              EXPECTED    UNIT PRICE    SUBTOTAL   SHARE        |
| ...                                                                                          |
+----------------------------------------------------------------------------------------------+
```

The bar holds the plan's context and one door to everything else (Arena's idea on Ledger's line):
- `Kaisinel [EL] EU` is the one chip. It opens the world picker. It carries the side badge in the
  side colour and the region in muted mono, so neither needs a chip of its own.
- `Settings` at the right edge, a gear and the word, opens the settings drawer from the right,
  440 px. Inside, Mastery is five stat blocks (profession, the in-game name under it, the level as
  a big gold number out of 100, and a gold-filled track to drag), then Market tax as one block with
  a big number and `%`, then the plan options, your prices, what you have and your sources.
  Levels and tax are never in the bar; the chips `BS 100` and `tax 5.0%` are gone.
- Copy link sits right of the freshness pill as a link glyph, and shows a check for two seconds
  after it copies. The address bar always holds the same link: world, item, quantity, mastery
  off 100, tax off 5%, plan options off their defaults, the scanner view, and on the list view
  the list itself. Prices and Have counts stay in the browser. Opening a link never changes what the recipient has saved; a
  setting is saved once they change it.
- The settings button goes away. Everything it held is reachable from a chip.

World picker, one component used from the region and world chips, desktop popover 440 px under
the chip, bottom sheet under 640 px with a sticky search field:
- Search field "search all 106 worlds" on top, then two segment rows: regions
  (`all NAE NAW EU LA AS`) and sides (`both Elyos Asmodian`).
- Results grouped by region. The group header reads `EU Europe, 46 worlds`, so no header wraps
  at 440 px. Each row: world name, `vs Lumiel` in the matched side's colour, the side badge, and a
  `no prices yet` tag when the exchange has no data. The selected row shows `current` and an
  expanded note: "Matched with Lumiel, Asmodian, since 4 Oct 2026. Server 11304. The market
  stays per world."
- Recently used worlds (up to three, persisted) pinned above the groups.
- Footer line: "Each world is one side with its own market. NCSoft pairs it with an enemy world
  for the Abyss and changes the pair from time to time. Pairs from NCSoft's notice of 4 Oct
  2026." One notice dates every region, so the date sits here once.
- Arrow keys and Enter choose, Escape closes, focus returns to the chip. The region and side rows
  are radio groups, like the Normal and Splendent toggle.
- On a first visit, with nothing saved and no plan in the link, it opens once under the world chip
  titled "Which world do you play on?", with an intro line above the search and the list at its top.
  Closing it keeps the default world and it does not open again.

Calculator answer: as the Ledger prototype, with Atlas's item hero (grade-framed 48 px icon,
Cinzel name in the grade colour) and its diamond-ruled figure strip. Under the craft amount, a
13 px mono line in the muted colour reads "9 in 10 under 64,464,921", the cost nine simulated
runs in ten come in under; it stays on one line on desktop and wraps on phones. The margin
percentage is a heat chip, the same visual word the scanner uses. Detail tabs are mono with
counts: `buy 9`, `steps 5`, `rates`. The buy table gets a cost-share bar column on desktop.
The rates tab follows Expected attempts with "Attempts, 9 in 10", the attempts nine runs in
ten finish within, from the same simulation.

Steps: one row per part at the 36 px row height. A How column between Item and Expected
holds the `buy | craft | morph` control for a part the plan could get more than one way, then
the way in words; a part with one way shows the words alone. Under the table: "Dotted prices
are editable. Pick buy, craft or morph per line; the cost column follows." On a phone the How
column is hidden and the control sits under the name again.

Bulk buys: when the plan buys more than one unit of a material beyond what the player holds,
its unit price is the average along the listing ladder and the Source cell says how many
listings it spans ("Market, across 3 listings of 15"), with "only 4 listed" when the ladder
runs out. The buy figure does the same for the target at a quantity above one. The price
status line adds one sentence when the ladder poll is stale against the prices.

Price history: under the buy figure's note, a 120 by 24 px gold line of the lowest listing over
seven days with a dot on the last point and "7 d: low, high" beside it, shown only when a listing
exists. The line is a button. It opens the full chart in a popover titled with the item's name,
560 px wide under the line on desktop and a bottom sheet on a phone. A segmented control picks
the range, `7 days` in hourly buckets or `30 days` in six-hour ones; 90 days would show the same
24 days the exchange holds today. The chart is one SVG, 560 by 220, scaled to the width: a band
between each bucket's low and high in gold at 12%, the low line in gold over the avg line in muted
ink, rules at round Kina values labelled inside the plot in mono, a date tick at each local
midnight (every fifth at 30 days) and a dot on the last low. The pointer, a touch or the arrow
keys on the focused chart select the nearest bucket by time. A hairline marks it and a readout
line under the chart prints "Tue 27 Oct 12:00, low 499,999, avg 545,998, high 689,994, 17
listings", or the one price when the bucket holds a single sample. The last bucket is selected on
open. A summary line follows: "7 days: low 99,999 on 20 Oct, high 689,994 on 27 Oct, now 689,994",
now being the last bucket's close. Dates and times are the player's local ones. Without history
the surface says "No price history on aion2.exchange for this item yet."

Source choice: under steps, a row whose item the plan could get more than one way carries a
small segmented control in the How column, `buy | craft`, plus `morph` when a Substance Morph
exists, with the plan's pick selected. Choosing another way forces it for that item everywhere
in the plan, every figure updates, and the note gains `yours` in gold and what the choice
costs over the cheapest way: "Craft, 4.1 attempts at 96.8%, yours, 1,230 Kina more than
buying". A way the plan cannot use is disabled, with the reason on hover. The buy table stays
a shopping list.

List: a small `Add to list` button closes the answer controls after the quantity. It puts the
open item on the list for this world at the shown quantity, then reads `In list` (which opens the
list) or `Update list to 5` when the open quantity differs from the line's, and `List is full`
disabled at 24 lines. The `list` view appears in the nav between calculator and scanner only once
the list has a line or the view is open, with the count in the tab badge, so a player who never
adds sees today's bar. The view is the calculator's anatomy for several items: a section title
`Your list on Kaisinel`, one line saying the lines are planned together top to bottom, that what
you hold is spent once, that bulk prices follow the total bought, and that a list item never
feeds another (the list is what the player means to end up holding); then the member table (name
in the grade colour opening the item in the calculator at its quantity, a quantity field, the
cost, Remove, and Clear list once there are two), the list sentence over the same craft, buy and
margin strip, and the `buy | steps` tabs over the merged plan, with Copy list heading its text
`To craft on Kaisinel` and a line per member. No rates tab, since rates are per item. The open
item stays separate from the list, so the calculator reads the same whether or not a list exists.

Where to get it: in the buy table and under steps, a muted external-link glyph follows each
item name and opens the item's AION2 Hub page in a new tab. The page lists where the item is
gathered, dropped, crafted or sold. The glyph turns gold on hover and focus, and its hover text
reads "Where to get Orichalcum Ore, on AION2 Hub". The scanner and the drawer keep plain names.
On a phone the glyph can drop to its own line when the name fills the last one.

Scanner: Ledger's left rail (All plus five professions with counts; chips that wrap under
900 px), the name filter, the hidden-rows line with "Show them", and one table: Item
(icon, grade-coloured name, profession and level in mono), Craft cost, Market lowest, Margin,
Margin % as the heat column. The sorted header is gold with an arrow. Hidden rows, when shown,
are dimmed with a `needs a price` or `needs mastery 55` pill in the Market lowest cell. On
phones the title is followed by the chips and the filter alone (the top bar already shows the
tax and the price age), the table keeps Item, Margin and `%` with the same tappable sort
headers, names end in an ellipsis instead of wrapping, rows are 52 px, and the hidden-rows
line moves under the list. No sparkline: it would cost one history request per row.

Watchlist: a small `Watch` button follows `Add to list` and reads `Stop watching` once the item is
pinned. With one item or more pinned, the calculator home shows `Watching on Kaisinel` above Best
margins, in the same scan table with sortable headers and a `Clear all` button from two items up.
Every price refresh updates its margins, and a pinned item that lost its price stays with its pill.
The section is absent while nothing is pinned on the world. The wordmark is a button that
clears the open item and shows this home, since the open item is otherwise kept across visits.

Settings drawer: plan options with their one-line notes, then "Your prices on Kaisinel" with
reset, as today, then "What you have on Kaisinel": the counts entered under You have in the buy
table, each with Clear. The buy table's You have column edits in place like a unit price; a
"To buy" column appears only once a count is set, and a line that stock covers in full
drops to the bottom with "your stock" as its source. Then "Your sources on Kaisinel": the
ways chosen under steps, each with Clear, and Clear all once there are two.

States: as the second pass (loading line, stale pill, proxy-down notice, world list failed with
retry, missing price input in the row, mastery too low in the sentence, no listing).

Link notes: a link to a world the recipient has not used waits on the world list loading line;
if the list fails, the notice offers Try again and "Open your own plan instead". A world id
that is not on the list opens on the recipient's own world, and an item that side cannot craft
opens no item. Each shows a notice with Dismiss, once, above the page.

Mobile (under 640 px): the bar wraps to two rows (wordmark and views, then the world chip with the
freshness pill shortened to the age, Copy link and Settings at the right), the
figures stack, the buy table becomes one card per line (name on one line, "Market, across 9
listings of 224. 20.65 needed." under it, then You have, Unit price and Subtotal on a shared
64 / 100 / rest grid under one label row) with Copy list at the right of the tab strip and the
You have note under the total, the picker and popovers become bottom sheets, the drawer takes
the full width. The nav's list count
is hidden: at 390 px the wordmark (130 px) and the three views (212 px) fill the row, and a count
would wrap the nav under it. The list's member table keeps the name, the quantity field and
Remove, with the cost on the name's sub-line.

## Principles
- Every number in the header says what it is and opens its own setting.
- One visual word per meaning: gold is money, blue and violet are sides, heat is margin, grade
  colour is grade.
- The same table component everywhere, the same picker from both chips.
- Ornament only on titles and the figure strip. Borders encode grouping, nothing else.
