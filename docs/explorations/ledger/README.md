# Ledger, the dark data terminal

Open http://127.0.0.1:8765/ledger/. Hash routes reach every open state without clicks: `#scanner`, `#world`, `#world=siel`, `#settings`, `#settings=tax`, `#tab=steps`, `#tab=rates`, `#scanner&hidden`, `#side=Asmodian`.

`shots.sh` retakes every screenshot. `node verify.mjs` clicks through the interactions at 1280 and 390 px (picker open and filter, side filter, choose a world, tabs, tax chip into drawer, sort toggle, no horizontal scroll) and prints ok or FAIL per check. All 28 checks pass.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--page` | `#06080A` | page background |
| `--surface` | `#0C1014` | status line, figure strip, picker, drawer |
| `--raised` | `#141A20` | hovered and selected rows, active segment |
| `--rule` | `#1E262E` | 1 px borders and table rules |
| `--rule-2` | `#2A343E` | stronger borders (popover edge, kbd) |
| `--text` | `#E6EBF0` | body text, active tab underline |
| `--muted` | `#8994A0` | labels, notes (6.5:1 on page, 5.7:1 on raised rows; the brief's `#7F8B97` was nudged up) |
| `--heat-0` to `--heat-1` | `#FF6A00` to `#FFD400` | data only: margin heat, sorted header, sparkline, cost share bar; also the focus ring |
| `--gain` / `--loss` | `#5FD38D` / `#F0716B` | margin figure, change chips |
| grades | Common `#A9B4BF`, Rare `#5AA9FF`, Legend `#B98CFF`, Unique `#E8C15A` | 1 px inner frame on item icons, grade word |
| sides | Elyos `#9CC9FF` on `#2B4A6B`, Asmodian `#E1A6FF` on `#563A6B` | the EL / AS badge |

Type. IBM Plex Mono for every digit, chip, tab, column header and label next to a number. IBM Plex Sans for sentences and names. Scale: 11 px uppercase column headers (0.04em), 12 px labels and chips, 13 px tables and notes, 14 px body, 16 px verdict, 20 px item name, 28 px answer figures (22 px on mobile). Tabular numbers everywhere.

Spacing 4 / 8 / 12 / 16 / 24. Radius 2 px (sheet top corners 8 px on mobile). Borders 1 px. No shadows. No gradients. Rows 36 px, status line 40 px, max width 1280.

## The one memorable element

The margin % column is a heat map. Each cell's background runs from a faint orange tint to solid yellow as the margin grows (alpha 0.14 to 1, hue `#FF6A00` to `#FFD400`). The text colour is picked per cell by computing contrast against the composited background, so +49.9% and +83.9% get dark text and +16.1% keeps light text. The same chip shows +73.5% on the calculator's margin figure, so the two views share one visual word for "how good is this".

## Choices that depart from DIRECTION-ledger.md

- Mastery abbreviations are `BS TL JC AL CK`, using our profession names (Tailoring, Jewelcrafting), with the in-game name in the hover title and in the settings row. The direction's `AS` / `HC` would have clashed with the AS side badge and with the item header, which says Tailoring.
- The brief asks for the matched world on every row; the direction asks for it on the selected row only. Every row shows a compact `vs Lumiel`, the group header carries the date ("pairs since 4 Oct"), and the selected row expands to the full sentence with the server id.
- `worlds.json` has no world without data, so the prototype flips EU Triniel and AS Hadala to `hasData: false` to show the "no prices yet" state (`NO_DATA_DEMO` in app.js).
- The status line has no separate settings button. The tax and mastery chips open the drawer and flash the matching section.

## What I would change in a production build

- React Aria `ComboBox` and `Table` instead of hand-rolled listbox and sort; the picker here supports arrows and Enter but not Home/End, typeahead, or screen-reader announcements of result counts.
- The heat colour in a CSS function or precomputed class steps instead of an inline style per cell, and clamp it to the visible set so one outlier does not flatten the rest.
- At 1280 px the status line is full; a sixth chip would not fit. Production needs a rule for overflow (collapse mastery into one `mastery 5x100` chip under 1360 px).
- Low-margin heat cells read as brown on near-black. A production pass should test a minimum hue shift or a left-edge bar for values under 20%.
- The mobile header takes three rows (about 118 px). A collapsed context line that expands on tap would give the answer more room.
- Item icons hotlink aion2t.com; production should proxy and cache them.

## Screenshots

- `shots/desktop-calc.png`: 1280x800, status line with labelled chips, item header, verdict, the Craft / Buy / Margin strip, the "buy 9" table with a cost share bar.
- `shots/desktop-steps.png`: full page, the "steps 5" ladder with indented children.
- `shots/desktop-rates.png`: full page, the rates definition list.
- `shots/desktop-world.png`: picker open from the world chip, region and side filters, Recent pinned with the full matched note on the selected world, EU group with the dated header and a "no prices yet" row (Triniel).
- `shots/desktop-world-search.png`: "siel" typed, five Siels grouped under their regions.
- `shots/desktop-scanner.png`: profession rail with counts, sorted Margin header in the accent, sparklines, change chips, heat-map Margin % column.
- `shots/desktop-scanner-hidden.png`: hidden rows shown in muted text with their reason.
- `shots/desktop-settings.png`: right drawer with mastery rows (name, in-game name, number, slider), market tax with where to find it, three plan options.
- `shots/mobile-calc.png`: 390 px full page, wrapped context chips, mastery as a five-column strip, stacked figures, buy table collapsed to item plus subtotal with the math as a sub-line.
- `shots/mobile-world.png`: picker as a bottom sheet with full-width filters.
- `shots/mobile-world-search.png`: bottom sheet with "siel" results.
- `shots/mobile-scanner.png`: rail as a scrolling chip strip, table reduced to item, margin, margin %.
- `shots/mobile-settings.png`: drawer at full width.
