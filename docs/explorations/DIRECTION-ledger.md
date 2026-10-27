# Direction A: "Ledger", the dark data terminal

Family: poe.ninja, tarkov-market, loawa, aion2.exchange (see ../research/design-survey.md, Part 1
and the Families table). Exemplar: poe.ninja. Library this would map to in production: React Aria
Components (its Table sorts and handles keyboard navigation) with our plain CSS tokens.

Feeling: a trader's terminal. Everything is a number you can act on. Density is a feature.

Tokens (starting point, refine as you build, record the final in README.md):
- Background near-black with a cool cast, `#06080A` page, `#0C1014` surfaces, `#141A20` raised
  rows, `#1E262E` rules. Text `#E6EBF0`, muted `#7F8B97`.
- One accent only: a heat ramp from `#FF6A00` to `#FFD400` used ONLY for data (margin heat, the
  sorted column, sparkline). Interactive focus uses the same orange. Gain `#5FD38D`, loss `#F0716B`.
- Type: `IBM Plex Mono` for every digit, code and label that sits next to a digit; `IBM Plex
  Sans` for sentences. 13 px table, 14 px body, 12 px labels, 28 px the three answer figures.
  Tabular numbers everywhere. Uppercase allowed for 11 px column headers only, with 0.04em spacing.
- Spacing 4/8/12/16/24. Radius 2 px. Borders 1 px. No shadows. No gradients except the heat ramp
  on data cells.
- Rows 36 px. Max width 1280, but the layout may be two columns on desktop.

Layout:
- Top bar is a terminal status line, 40 px: brand as a monospace wordmark, then view tabs, then
  the context as labelled key:value chips that read like a prompt:
  `region EU` `world Kaisinel` `side Elyos` `tax 5.0%` and mastery as five tiny labelled
  columns `BS 100 AS 100 HC 100 AL 100 CK 100` with the full profession name on hover (title) and
  as sr-only text. Each chip is a button that opens the matching setting. A freshness pill
  "prices 21 min ago" sits at the right, as on aion2.exchange.
- Left rail (desktop only), 200 px: the five professions as the scanner's filter plus "All", each
  with a count, like poe.ninja's category rail. On mobile the rail becomes a horizontal chip strip.
- World picker: ONE searchable combobox grouped by region, opened from the `world` chip. Each row:
  world name, side tag (Elyos / Asmodian as a two-letter mono badge), and a muted note
  "matched with Lumiel, since 4 Oct" on the selected row only. Typing "siel" lists five Siels
  with their region in the group header. Recently used worlds pinned at the top. Under 640 px it
  opens as a bottom sheet with a sticky search field.
- Calculator answer: a three-column figure strip (Craft / Buy / Margin) with the verdict sentence
  above it in Plex Sans. Under it, the detail tabs as monospace tabs with counts: "buy 9", "steps
  5", "rates". The scanner table gets an inline 7-day sparkline column (fake it with an inline SVG
  polyline) and a change chip per row, and the sorted column header is highlighted in the accent.
- Settings: a right-side drawer, not a modal. Mastery rows: profession name, in-game name in
  muted mono, number input, slider. Tax row: "Market tax 5.0%" with the helper line "Market screen
  in game, top right. Changes the margin and what a sale pays out."

The one memorable element: the heat-coloured margin column, where the cell background goes from
transparent through the orange-yellow ramp as the margin percentage grows, so the scanner reads
as a heat map.
