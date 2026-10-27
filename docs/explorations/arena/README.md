# Arena

The light direction. It reads like a stats site in the u.gg, op.gg and mobalytics family: a saturated blue band, a filter bar of dropdown chips, and hexagon tier badges for margin.

Open at http://127.0.0.1:8765/arena/. It is vanilla HTML, CSS and JS. `app.js` has `worlds.json` and `items.json` inlined, with the pairs flattened into worlds that point at each other through `matchedWith`.

## Tokens (final)

| Token | Value | Use |
|---|---|---|
| page | `#F3F5F9` | Page background |
| card | `#FFFFFF` | Cards, filter bar, popovers |
| rule / rule-soft | `#E1E5EC` / `#EDF0F5` | Card borders / row dividers |
| text | `#141A26` | Body text |
| muted | `#5F6B7D` | Secondary text (5.4:1 on white, 4.95:1 on page) |
| band | `#3F6CE0` | Header band, white text 4.74:1 (the direction's `#4F7BEA` was 3.92:1) |
| accent | `#2F62E6` | Primary, focus ring, active tab, sorted column text |
| accent-tint | `#EEF3FF` | Sorted column, selected tile |
| gain / loss | `#1B7F45` / `#D63B3B` | Margin sign (gain darkened from `#1F9D55` to pass 4.5:1) |
| tier S / A / B / C / F | `#F0B32B` / `#2F62E6` / `#5F6E84` / `#C9CFD9` / `#D63B3B` | Hexagon badges. S and C use a dark letter for contrast. |
| Elyos | `#2F62E6` on `#E6EDFF` | Side pill |
| Asmodian | `#7B4FD6` on `#F0E9FF` | Side pill |
| Region badges | NAE `#2F62E6`, NAW `#0B7A86`, EU `#7B4FD6`, LA `#B9561A`, AS `#C2335F` | White code text, all at least 4.7:1 |
| Type | Inter 400 to 800, tabular numbers on | 14 body, 13 table, 12 chips and headers, 20 item title, 32/700 KPI figures (24 on phones) |
| Spacing | 4 / 8 / 12 / 16 / 24 | |
| Radius | 8 cards, 999 chips, 10 popovers, 16 sheet top | |
| Shadow | `0 1px 2px rgba(20,26,38,.06)` cards. Popovers get a deeper two-layer shadow. | |

Tiers: S above 60%, A 30 to 60%, B 10 to 30%, C under 10%, F negative.

## The one memorable element

The filter bar under the band is the plan's context. Region, World, Side, Mastery (`BS 100 TL 100 JC 100 AL 100 CK 100`, full names on hover and in the popover), Market tax and Plan each show their value and open their setting in place. The hexagon tier badge then appears next to every margin.

## What works

- The Calculator / Scanner switch.
- The Region chip opens five coloured code badges with names and world counts. Picking a region keeps the same world name where it exists and opens the World popover.
- The World chip, and the Side chip, open a popover with an Elyos | Asmodian toggle and a grid of tiles. Each tile shows "vs Lumiel, since 4 Oct", with the full dated note in a tooltip. A search field finds a world name across all regions and shows the region badge and side on each result.
- Mastery has sliders plus number fields kept in sync, and the chip updates live.
- Tax recomputes the margin, the verdict and every scanner row live.
- Plan has three toggles. Quantity, the detail tabs, the scanner header sort (aria-sort and a tinted column), the profession chips, the name filter and the hidden-rows switch all work.
- Under 760 px, popovers become bottom sheets with a scrim. Tables collapse to two-line rows. The scanner gets a sort chip row because headers are hidden.

The rest is static. Search and Refresh do nothing, and the Normal / Splendent toggle does not change the numbers.

Hash routes for screenshots: `#calc`, `#scanner`, `#region`, `#world`, `#mastery`, `#tax`, `#plan`, `#buy`, `#make`, `#rates`, `#asmodian`, `#search=siel`, `#hidden`, `#sort=pct`, combined with commas (`#scanner,hidden`).

## Data notes

- All worlds in `worlds.json` have `hasData: true`. To show the "No prices yet" state, the prototype marks the three newest EU pairs as empty (Gauss/Agnita, Lamuatan/Atiel, Nathara/Tassin). That is `FAKE_NO_DATA` in `app.js`.
- BRIEF.md has an inconsistent row for True Dragon Lord Helm. With a 45,333,333 market low, the margin at 5% tax is +9,497,969, not +7,597,969. The prototype computes margin as `low × (1 − tax) − craft`, which matches every other row. It uses a 43,333,333 low, so the brief's margin and percentage show.

## What I would change in a production build

- Use shadcn/ui (Base UI) Popover and a Drawer for the sheets, which give focus trapping and return. The prototype only moves focus back to the chip on close.
- Build the scanner on TanStack Table with virtualised rows, since it will hold 200+ rows.
- Make the World popover a real combobox with grouped results, arrow-key navigation and recently used worlds pinned on top.
- Add tier thresholds to a legend or popover. Today they only appear in tooltips.
- Self-host Inter, pin Lucide with SRI or tree-shake the five icons, and give the item icons width and height to avoid layout shift.
- Phone filter bar: in Scanner view it takes four rows. A collapsed "EU Kaisinel Elyos, 5% tax" summary that opens one sheet would save space.

## Screenshots (`shots/`, regenerated with `sh arena/shots.sh` from `proto/`)

- `desktop-calc.png`. 1280x800. Band, filter bar, item header, verdict, KPI cards with the S badge, What to buy tab.
- `desktop-calc-full.png`. The same page captured in full.
- `desktop-world.png`. World popover, Elyos side, Kaisinel selected, three "No prices yet" tiles.
- `desktop-world-search.png`. "siel" searched across all regions, with region badges and side pills.
- `desktop-region.png`. Region popover with the five coloured code badges.
- `desktop-mastery.png`. Mastery popover with names, in-game names and sliders.
- `desktop-tax.png`. Tax popover with the where-to-find-it and what-it-changes help.
- `desktop-make.png`. How it is made, the ladder with tree connectors and Craft / Buy / Morph tags.
- `desktop-scanner.png`. Scanner sorted by margin, tinted column, tier badges, hidden rows shown.
- `mobile-calc.png`. 390 wide, full page. Wrapped chip bar, stacked KPI rows, two-line material rows.
- `mobile-world.png`. World picker as a bottom sheet, two-column tiles.
- `mobile-mastery.png`. Mastery as a bottom sheet.
- `mobile-scanner.png`. 390 wide, full page. Stacked scanner rows with the sort chip row.

`clicktest.mjs` drives the main interactions and checks that there is no horizontal scroll at 390 px. Copy it into `proto/` to run it, because Playwright resolves from there.
