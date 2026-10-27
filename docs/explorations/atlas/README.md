# Atlas

This is a throwaway prototype of the "Atlas" direction. It is a fantasy editorial page in Aion 2's own art direction, built with vanilla HTML, CSS and JS. Open it at `http://127.0.0.1:8765/atlas/`.

Hash routes reach each state: `#calc`, `#scanner`, `#world` (region step), `#world-side`, `#world-list`, `#world-q=siel` (cross-region search), `#settings`, `#settings-tax`.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| page | `#171717` | Page background |
| panel | `#1F1F1F` | Panels and dialogs |
| raised | `#262626` | Hover, selected rows, tooltips |
| rule | `#3A3A3A` | Panel borders, table header rules |
| row | `#2A2A2A` | Row dividers |
| text | `#F2EFE9` | Body text |
| muted | `#A8A49C` | Notes, labels (7:1 on page) |
| sky | `#0B1F33` | Banner gradient top |
| bronze | `#C69C7C` | Ornamental rules and diamond finials |
| gold | `#E6B85C` | Money accent, sorted column, primary pill |
| gold-hi | `#FFDC8F` | Margin figure, links, focus ring, diamond cores |
| elyos / elyos-l | `#2E6FD1` / `#7EB3FF` | Elyos: badge, side card, panel top border, crest |
| asmo / asmo-l | `#7B4FD6` / `#B89CFF` | Asmodian: same places, plus matched-world names |
| grade Common / Rare / Legend / Unique | `#D9D9D9` / `#5FB4FF` / `#D08BFF` / `#FFB347` | Item names and 1 px icon frames with a 25% inner glow |

| Type | Family | Sizes |
| --- | --- | --- |
| Display | Cinzel 400 (600 on the wordmark), tracking 0.06em | 30 item name, 28 page title, 24 dialog title, 22 section, 17 settings section, 19 crest world |
| Body | Noto Sans 400 / 600, tabular numbers everywhere | 15 body, 20 verdict lead, 14 / 13 / 12 notes |
| Figures | Noto Sans 600 tabular | 36 (30 on phone) |

Spacing uses 8 / 16 / 24 / 32 / 48. Inputs and segmented controls get a 4 px radius. Pills (999) are reserved for the view tabs, the primary button and side badges. Panels get 0 radius, a 1 px rule and a 2 px top border in the selected side's colour. There is no uppercase outside Cinzel, and Cinzel's small caps do that job.

## The one memorable element

Every title sits between bronze rules that end in diamond finials, and the three figures are split by rules with the same diamonds. The header crest carries the selected world in its faction colour, with a CSS-drawn wing emblem (feathered for Elyos, barbed for Asmodian). Pick an Asmodian world and the crest, the badge and every panel's top border turn violet. Everything is drawn with CSS (clip-path, gradients, rotated squares), with no images.

## What I would change in a production build

- The view tabs and primary button use gold pills, while the direction proposed the official site's glossy blue. I kept blue and violet meaning faction only, so a blue tab would read as "Elyos".
- On a phone the scanner stacks rows into cards, which hides the sortable headers. Production needs a "Sort by" control above the cards. The prototype only sorts on desktop.
- The world picker resets its scroll and reuses one dialog for three steps. In production that is Base UI Dialog plus a listbox per column with arrow-key movement between columns, and recently used worlds pinned at the top.
- "No prices yet" is faked on EU Nathara and Tassin (ids 11323, 12323), because every world in `worlds.json` has data. Production reads `hasData`.
- The hidden-rows toggle only swaps its text. Production would append the 212 rows dimmed, with a reason on each one.
- Cinzel at 19 px wraps the long item name to three lines on a phone. Consider a 17 px item name on mobile, or a lighter weight.
- The matched-world note repeats on every row ("since 4 Oct 2026"). With one shared date, it could move into the column header and leave each row with just "Matched with Lumiel".

## Screenshots

- `shots/desktop-calc.png`: 1280x800, header crest plus the calculator hero, verdict and the three diamond-ruled figures.
- `shots/desktop-calc-full.png`: full page, with the What to buy table, the How it is made ladder with diamond nodes, and Rates.
- `shots/desktop-world.png`: picker open in three columns (Region, Side cards with emblems, the world list with match notes and Current).
- `shots/desktop-world-search.png`: cross-region search for "siel", with each row carrying its region code and side.
- `shots/desktop-world-nodata.png`: search for "nathara", showing the "No prices yet" tag (faked state).
- `shots/desktop-scanner.png`: scanner with emblem profession filters and sorting by Margin (gold column and arrow).
- `shots/desktop-settings.png`: settings modal with Mastery (in-game names), Market tax with where to find it, and Plan.
- `shots/mobile-calc.png`: 390x844, stacked header crest and the calculator hero.
- `shots/mobile-calc-full.png`: full mobile page, where the tables reflow to labelled cards with no horizontal scroll (scrollWidth 390, measured).
- `shots/mobile-world-region.png`, `shots/mobile-world-side.png`, `shots/mobile-world.png`: the three picker steps, with the progress line filling in as "Europe, Elyos, World" and a back link.
- `shots/mobile-world-search.png`: phone search across regions.
- `shots/mobile-scanner.png`: scanner with a 2-column profession grid and card rows.
- `shots/mobile-settings.png`: settings opened by `#settings-tax`, scrolled to Market tax.
