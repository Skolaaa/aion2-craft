# Design survey for the Aion 2 craft-or-buy calculator

Date: 2026-10-27. Method: each site was opened in the built-in browser (Chromium pane, about 800px wide) and probed with a script that read computed styles (body background, fonts, text colours, table row heights, select elements). Static CSS was fetched with curl where the site allowed it. Hex values below are **measured** unless marked otherwise. Anything not observed directly is marked **unverified**.

Baseline we are comparing against (`/Users/skola/Dev/aion2-craft/src/styles.css`, `docs/DESIGN.md`): `--bg #15181D`, `--panel #1C2026`, brass accent `#D9A441`, Manrope only, one radius (8), no shadows, no gradients, no grade colours, 44px rows, max width 1040, world chosen in a Settings dialog through a native `<select>` with `<optgroup>` per region.

## Part 1. Site survey

### maxroll.gg
URLs: https://maxroll.gg/d4/planner, https://maxroll.gg/poe2/build-guides
- Background: body `#0A0A0A`, panels `#121212` (`--maxroll-color-dark-6: 18,18,18`), cards `#171717`, raised chips `#2B2C2C`. Theme colour `#057AF0` (blue, used for links and selection).
- Fonts: `Source Sans 3` for everything, `Oswald` loaded for display. Page titles are 32px uppercase ("BUILD GUIDES").
- Nav: fixed left rail of round game icons (D4, PoE2, LE, etc.), top bar with game switcher and search, then a per-game tab row (Getting Started, Build Guides, Tier Lists, Meta, Currency, Resources, Tools). Each game gets a hero banner of key art with the game logo.
- Density: medium. Text mostly `#E8E8E8` on near-black, secondary `#95989B`.
- Icons and rarity: guide cards carry class portraits; per-item rarity colours live in the planner tooltips (exact values **unverified**).
- Selectors: none for region (not relevant to these games).
- Borrow: the left game-rail plus key-art banner shell, and uppercase condensed section titles over a near-neutral black.

### wowhead.com
URLs: https://www.wowhead.com, https://www.wowhead.com/item=19019
- Background `#101010`. Body text `#BBBBBB`, secondary `#818181`, headings white, highlights WoW gold `#FFD100`, links `#00C0FF` / `#1D8DCD`. Primary button red `#A71A19`, radius 5px.
- Fonts: `Open Sans` 14px body, headings `brother-1816` (Adobe) 18px weight 500.
- Nav: game-flavour pills (Retail, Classic, TBC, Mists) above a mega-menu bar (News, Database, Tools, Guides, Community), then a strip of square art tiles (Classes, Tier Lists, Professions).
- Density: high. Listview tables: 32px rows, 14px headers on `#303030`.
- Rarity: text colour by quality class, measured `.q0 #9D9D9D`, `.q1 #FFFFFF`, `.q2 #1EFF00`, `.q5 #FF8000`. Rare `#0070DD` and epic `#A335EE` are the standard WoW values (**unverified** on this page). Item icons 68px with the game's own bevel frame.
- Item page: tabbed related lists ("Reward from", "Comments (431)", "Screenshots").
- Borrow: quality-coloured item names and dense sortable listviews with counted tabs under the item.

### icy-veins.com
URL: https://www.icy-veins.com/wow/
- Background `#13131A` (slight violet), header `#111116`, 50px tall. Links `#2EABFF`. Buttons 4px radius, CTA magenta-red.
- Font: `Inter` 16px; headings Inter 700 at 18 to 24px.
- Nav: game list in header, hero carousel of patch art, then image tiles (12.1.5 Hub, Tier Lists, To-Do List) and a row of round spec icons.
- Borrow: an image-tile grid as the empty state ("start here" tiles over game art).

### mobalytics.gg
URL: https://mobalytics.gg/lol/tier-list
- Background `#12121F` (navy-violet). Accent yellow `#F2BF43`, secondary text `#CECED6` / `#A9A9B8`, buttons `#363647` radius 6px.
- Font: `Roboto`, 28px h1 weight 500.
- Nav: top game tabs (LoL, TFT, Diablo 4, PoE 2), page sub-tabs (LoL Tier List, High Elo, Stats) with a "NEW" badge, then an icon-button filter row.
- Tables: very dense, 22px rows (measured on the first table).
- Borrow: icon-only filter toggles in a single row above the table.

### u.gg
URL: https://u.gg/lol/tier-list
- Background `#070720` (deep blue-black). Text `#CDDCFE`, accent blue `#3273FA`, link `#7EA4F4`, muted `#5C5C8E`, tier letters in coloured hexagons (red `#FF4655`, gold `#F4C874`, cyan `#18F8EB`).
- Font: `Inter`.
- Filters: one horizontal bar of pills (role icons, "Emerald +", "Ranked Solo", "26.21", "World", "Show All"). Rows 34px with the sorted column highlighted.
- Region picker: see Part 3.
- Borrow: a single filter bar where each chip is a dropdown, and a highlighted sorted column.

### op.gg
URL: https://op.gg/
- Background `#1C1C1F`, header band `#5383E8` (signature blue). Text white, muted `#9E9EB1`, buttons `#424254` radius 6px.
- Font: `Roboto` 14px.
- Nav: game switcher at top, a giant search field with the region as a prefix chip, then a blue sub-nav band.
- Borrow: the region as a prefix chip inside the main search field.

### raider.io
URLs: https://raider.io, https://raider.io/mythic-plus-character-rankings/season-mn-1/world/all/all
- Background `#111111`, table surface `#353535`, warm darks `#1A1716`, `#151314`. Brand gold `#FFBD0A` (the most frequent hex in its CSS). Uses glass tokens (`--rio-glass-surface: hsla(0,0%,100%,.04)`).
- Fonts: `Salesforce Sans` 13px body, `Semplicita Pro` for display.
- Tables: 56px rows with class-coloured names (`#FF8000`, `#A335EE`), small square dungeon chips with the key level printed on the icon, scores in orange.
- Filters: a row of dropdown buttons (Season, Classes and Roles, Regions).
- Borrow: icon chips with a number printed over the icon (good for "x20.65 needed" on a material).

### warcraftlogs.com
URL: https://www.warcraftlogs.com/zone/rankings/46
- Blocked by a human-verification page; I did not bypass it. Observed only the challenge page: `#111111` background, `Avenir`. Everything else **unverified**.

### lostarkcodex.com
URL: https://lostarkcodex.com/us/items/
- Bootstrap dark theme: `--bs-body-bg #1E242F`, panels `#28303F`, `#323C4E`, primary `#007BFF`. Font Tahoma / Verdana.
- Rarity as text colour, measured: Normal `#FFFFFF`, Uncommon `#8DF901`, Rare `#00B0FA`, Epic `#BA00F9`, Legendary `#F99200`, Relic `#FA5D00`, Ancient `#DDC29D`, Sidereal `#3CF2E6`.
- Filters: checkbox grids (grade, class) above a DataTables table with pagination.
- Borrow: grade checkboxes coloured in their grade colour, which doubles as a legend.

### loawa.com
URL: https://loawa.com
- Background `oklch(0.1955 0.0043 264.5)` which converts to about `#141517`; header `#1F1F1F` at 95% opacity; text `#E8E8E8`. Accents warm orange `#E88A50` / `#FB9851`, gold `#E5A840`, tan `#C9A472`, purple `#C07FE0`.
- Fonts: `Pretendard Variable` with `D2Coding Digits` for numbers (a separate monospace face only for digits).
- On first visit it asks the user to pick light or dark mode in a modal with two preview cards.
- Nav: Korean top tabs (Ranking, Stats, Tools, Market) and a weekly schedule strip with day cells.
- Borrow: a digits-only monospace font for prices, and Korean-MMO warm orange on charcoal.

### aion2.exchange (our price source)
URL: https://aion2.exchange
- Tokens read from its CSS: `--bg #0D1520`, `--panel #131F2E`, `--panel-2 #182739`, `--border #243447`, `--text #E6EDF5`, `--muted #8AA0B6`, `--accent #4FD1A5` (mint), `--blue #6AA6FF` (links), `--up #4FD1A5`, `--down #F0716B`, `--warn #E0B341`, `--radius 10px`. System font stack, 15px.
- Nav: brand, a "data 25 min ago" freshness pill, a Server select, then tabs (Overview, Items, Crafting, Quna, Favorites, Server Status).
- Layout: KPI cards (Items on the market, Active listings, Latest snapshot), then two tables (Biggest price increases, Biggest price drops), 64px rows, 12.8px headers.
- Icons and rarity: 28px icons with class `item-icon-rarity rarity-unique`; the rarity shows as a grade texture background (`--tex`) plus a 1px inner border in the grade colour (`--c`); a `.rarity-tag` pill uses the grade colour at 12% fill and 55% border. Per-grade hex values are set inline (**unverified**).
- Server select: one native `<select>` with labels like "Siel (NAE, Elyos)", flattening region and faction into the option text.
- Borrow: the freshness pill in the top bar and the grade-texture icon frame.

### aion2t.com
URL: https://aion2t.com
- Dark theme `--bg-base #0D1117`, `--bg-surface #131B2E`, `--bg-elevated #1A2540`, accent teal `#0D9488`; GitHub-like greys `#E6EDF3`, `#8B949E`. A light theme exists (`--bg-base #F9FAFB`).
- Fonts: `Geist` and `Geist Mono` (Tailwind build).
- Nav: one flat bar (News, Guides, Map, Database, Skills Builder, Daevanion, Crafting, DPS Meter, Leaderboard).
- Home: a 3-column tool grid where each card is a screenshot of the tool with a thin coloured top border.
- Borrow: screenshot cards as entry points, Geist Mono for numbers.

### metabot.gg
URL: https://metabot.gg/en
- Background `#050505`, radial cyan glow. Per-game card accents set by `--card-accent` (`#00F0FF`, `#B46CFF`, `#FF4655`, `#F5A623`).
- Fonts: `Orbitron` for headings (22px uppercase, letter-spacing 2.2px), `Rajdhani` for body, `Nulshock` loaded.
- Borrow: per-section accent variable, the only practical part; the sci-fi type is too loud for a money tool.

### poe.ninja
URLs: https://poe.ninja/poe2/economy, https://poe.ninja/poe2/economy/forbiddenrites/currency
- Background `hsla(204,25%,3%)`, about `#06080A`, with a key-art image fading into it at the top. Greys `#F5F7FA` to `#515F6C`; a nine-step orange-yellow ramp `#FF4000` to `#FFEA00` for heat.
- Fonts: system sans with a separate `--font-mono`, 14px.
- League picker: a card grid ("Available Leagues") on the economy landing page, plus a "Select League" combobox in the table view.
- Table: 43px rows, 42px item icons, columns Name, Value, Last 7 days (sparkline), Volume / Hour, with green or red change percentages. The sorted column header is highlighted. A left category rail with item icons (Currency, Essences, Runes, Uniques).
- Borrow: inline 7-day sparkline and change chip per row; left category rail as the scanner's profession filter.

### tarkov-market.com
URL: https://tarkov-market.com
- Background pure `#000000`. Text khaki `#998766` (the dominant colour), greys `#AFAFB1`, profit green `#70A800`, gold `#DBA100`.
- Font: `Bender` (the in-game font), Pretendard and Source Sans Pro fallbacks.
- Filters: a wall of flat text toggles (traders, categories) above the table, sliders for level, native selects for mode and sort.
- Table: columns Buy from trader, Avg price 24h, 24h and 7d change, Profit sell to trader, Buy from flea. Very dense.
- Borrow: use the game's own UI typeface and its signature tint for text (here khaki) to make a utility feel native.

### gw2efficiency.com
URL: https://gw2efficiency.com/crafting/calculator/a~0!b~1!c~0!d~1-19685
- Rendered dark in the pane, body background reads `#FAFAFA` (a dark-mode layer sits on top; **partly unverified**). Brand terracotta `#AE6559`, red `#D94130`, green `#63AD52`.
- Fonts: `PT Serif` for headings (36px "Crafting Calculator"), Open Sans body. Dragon logo.
- This is the closest functional peer: options row (Material price: buy or sell order, Use own materials, Daily cooldowns), section anchors (Cost Breakdown, Recipe Tree, Shopping List, Required Disciplines, Crafting Steps), cost summary with gold/silver/copper coin glyphs, Profit (buy price).
- Borrow: the section list (Shopping List, Recipe Tree, Crafting Steps) and currency glyphs next to every figure.

### aion2.plaync.com (official)
URLs: https://aion2.plaync.com/en-us/index, https://aion2.plaync.com/en-us/characters/index
- Background `--ncui-bg #171717`; brand point colour `--ncui-point #074783` (deep blue). Hero art is icy blue-teal stone and sky with drifting debris. CSS also carries warm metals `#C69C7C`, `#FFDC8F`, `#DC722F`, `#B35317`.
- Fonts: `Noto Sans` family (plus KR, JP, TC, Thai, Arabic). The display titles ("YOUR SAGA TAKES FLIGHT", "AION 2 News") are a wide high-contrast serif with flared terminals, flanked by thin ornamental rules with diamond and star finials (rendered as images or a custom face; family name **unverified**).
- Buttons: glossy pill buttons, blue "Play Now" and violet "Landing Page", with soft inner glow.
- Iconography: thin-line circular emblems with wing motifs on news rows; diamond separators in the footer link bar.
- Character search: a centred title, a region chip with a globe icon ("North America - West"), and a search field whose left segment is a server menu ("All Servers in Region"). See Part 3.
- Borrow: the ornamental rule with finials for section titles, the blue-to-violet pair as Elyos and Asmodian, and the region-chip plus server-segment search.

### Families

| Family | Members | Strongest exemplar | What it gives the calculator |
|---|---|---|---|
| A. Dark data terminal | poe.ninja, tarkov-market, aion2.exchange, aion2t, loawa, raider.io tables | **poe.ninja** | Near-black, system or mono digits, sparklines and change chips, left category rail, dense sortable tables. Answers "is this worth it" at a glance. |
| B. Fantasy editorial with game art | maxroll, icy-veins, wowhead, aion2.plaync.com, playlostark.com, gw2efficiency | **maxroll.gg** for structure, **aion2.plaync.com** for Aion's own art direction | Key-art banner, ornamental serif titles, warm metal accents, grade-coloured item names, readable guide-like sections. |
| C. Esports neon dashboard | u.gg, mobalytics, op.gg, metabot | **u.gg** | Saturated blue-black, one filter bar of dropdown chips, coloured badges, tier letters, highlighted sorted column. |
| D. Classic database wiki | lostarkcodex, universalis, older wowhead pages | lostarkcodex | Bootstrap tables, checkbox grids. Useful patterns, not a target look. |

## Part 2. Component libraries

Constraint that decides most of this: the app is on **React 18**. Versions and peer ranges come from the npm registry on 2026-10-27. "Size" is bundlephobia's whole-package min+gzip for the latest version, which overstates what a tree-shaken app ships; treat it as a ranking, not a budget.

| Library (latest, date) | React 18? | Size (whole pkg, gz) | Theming | Dark mode | Grouped select / combobox | Slider | Segmented | Data table | Dialog, tooltip | License |
|---|---|---|---|---|---|---|---|---|---|---|
| shadcn/ui CLI 4.22.1 (2026-10-18) + Tailwind 4.3.3 | yes (copied code; primitives from Radix or Base UI) | only what you copy | CSS variables + Tailwind v4 `@theme` | class or media, built in | Combobox docs exist for both Base UI and Radix variants (https://ui.shadcn.com/docs/components/base/combobox) | yes | ToggleGroup | TanStack Table recipe (`@tanstack/react-table` 9.3.1) | yes | MIT |
| Radix Themes 3.3.0 (2026-01-31) | yes | 62 KB | Theme props (accent, gray, radius, scaling) + CSS vars | yes | Select with `Select.Group` / `Select.Label`; **no combobox** | yes | SegmentedControl | styled Table only, no sorting | yes | MIT |
| Base UI `@base-ui/react` 1.9.0 (2026-10-09) | yes (^17, ^18, ^19) | 163 KB | unstyled, data attributes | yours | Combobox with `Group`, `GroupLabel`, `Collection`, plus Autocomplete and Select (https://base-ui.com/react/components/combobox) | yes | Toggle Group | none | yes | MIT |
| Mantine 9.7.4 (2026-10-25) | **no**, requires React 19.2+ (https://mantine.dev/changelog/9-0-0/) | 171 KB | theme object + CSS modules + CSS vars | yes | Combobox, Select with groups | yes | SegmentedControl | via mantine-datatable or mantine-react-table | yes | MIT |
| Mantine 8.3.18 (2026-03-17) | yes | similar | same | yes | same | yes | yes | same | yes | MIT; no 8.x release since March, so effectively frozen |
| Ark UI 5.39.3 (2026-10-05) | yes (>=18) | 284 KB | unstyled (Zag state machines) | yours | Combobox and Select with item groups | yes | SegmentGroup | none | yes | MIT |
| Park UI | n/a | n/a | Panda CSS preset over Ark | yes | via Ark | via Ark | via Ark | none | via Ark | MIT; `@park-ui/panda-preset` last published 2024-11-22, treat as **stale** |
| HeroUI 3.2.6 (2026-09-17) | **no**, peer react >=19 | 61 KB | Tailwind v4 plugin, React Aria underneath | yes | ComboBox with `ListBox.Section` | yes | ToggleButtonGroup (**unverified** name) | Table | yes | MIT |
| HeroUI 2.8.10 (2026-03-07) | yes | larger (framer-motion dep) | Tailwind v3 plugin | yes | Autocomplete with sections | yes | Tabs as segmented | Table | yes | MIT; v2 in maintenance |
| Chakra UI 3.37.0 (2026-08-28) | yes (>=18) | 306 KB | Emotion runtime + token recipes | yes | Combobox with `ItemGroup` (Ark underneath) (https://chakra-ui.com/docs/components/combobox) | yes | SegmentedControl | styled Table, no sorting | yes | MIT |
| daisyUI 5.7.50 (2026-10-13) | n/a (CSS only) | CSS only, a few KB used | Tailwind v4 plugin, 30+ named themes via CSS vars | yes | native select only; **no combobox** | `range` input | `join` + buttons | styled table | `modal`, CSS tooltip | MIT |
| Tailwind Plus (ex Tailwind UI) blocks | yes | copied markup | Tailwind classes | yes | Headless UI Combobox / Listbox (`@headlessui/react` 2.2.10, 2026-04-07) | **no slider** | no | table markup only | yes | **paid**, per-seat license |
| React Aria Components 1.22.1 (2026-10-09) | yes | 273 KB | unstyled, render props + data attributes | yours | ComboBox and Select with `ListBoxSection` | yes | ToggleButtonGroup | **Table** with sorting, selection, keyboard nav, resizable columns | yes | Apache-2.0 |
| Radix Primitives `radix-ui` 1.8.1 (2026-10-12) | yes | per primitive | unstyled | yours | Select with groups; no combobox primitive | yes | ToggleGroup | none | yes | MIT |

Notes:
- React 18 rules out Mantine 9 and HeroUI 3 unless we upgrade React. Mantine 8 works but has had no release since March 2026.
- Radix Themes looks good out of the box but has no combobox and only one release in 2026 (January).
- The project uses plain CSS with tokens. Base UI and React Aria Components drop in without Tailwind. shadcn, HeroUI and daisyUI all assume Tailwind v4.
- No library ships a full data grid except React Aria's Table. Everything else pairs with TanStack Table.

### One library per family

- **A. Dark data terminal: React Aria Components.** The scanner table is the product in this family, and RAC is the only option here whose Table already does sorting, row selection, keyboard navigation and column resizing, styled by our existing tokens through data attributes. ComboBox with sections covers region then world. Apache-2.0, no Tailwind needed.
- **B. Fantasy editorial: Base UI with hand-written CSS.** Ornamental titles, textured panels and grade frames are bespoke CSS no themed kit will give us, so an unstyled kit avoids fighting defaults. Base UI's Combobox has groups and chips, plus Slider, Toggle Group, Dialog and Tooltip, it supports React 18, and it ships on a monthly cadence. Pair with TanStack Table for the shopping list.
- **C. Esports neon dashboard: shadcn/ui (Base UI variant) on Tailwind v4.** This family is many dense, uniform controls in filter bars and cards, which is where shadcn's copied components and blocks are fastest. Add TanStack Table for the scanner. Cost: adopting Tailwind alongside the current CSS.
- If only one library is adopted across all three explorations: **Base UI**. It works with plain CSS now and is also the primitive layer under the shadcn variant, so family C can add Tailwind later without swapping primitives.

## Part 3. Region then server selectors

Observed by opening each picker in the browser.

1. **Aion 2 official character search** (https://aion2.plaync.com/en-us/characters/index). A small region chip with a globe icon sits above the search field ("North America - West"); it opens a plain list (North America West, North America East, Europe, South America, Asia). The search field's left segment, "All Servers in Region", opens a **two-column cascading menu**: faction on the left (Elyos, Asmodian), servers of that faction on the right (All, Siel, Nezekan, Vaizel, Kaisinel). This is the game's own mental model: region, then faction, then world.
2. **op.gg** (https://op.gg/). The region is a prefix chip inside the main search input ("KR"). It opens a centred modal titled "Select region" listing one server per row with a flag or continent silhouette and the code in parentheses ("Europe West Server (EUW)"). One level only.
3. **u.gg** (https://u.gg/lol/tier-list). A "World" chip in the filter bar opens a narrow dropdown of coloured code badges (NA, EUW, KR, BR, EUN, JP, LAN, LAS, OCE, RU, TR, SEA, TW, VN), each badge a different colour. Fast for experts, opaque for newcomers.
4. **raider.io** (https://raider.io/mythic-plus-character-rankings/season-mn-1/eu/all/all). Region is a filter dropdown (All Regions, United States and Oceania, Europe, Korea, Taiwan, China) that rewrites the URL (`/world/` to `/eu/`). Realms are not picked in a dropdown on this page; they appear inline as "(EU) Twisting Nether" links leading to realm ranking pages.
5. **Universalis, FFXIV** (https://universalis.app/market/5057). The settings dialog uses a native `<select>` with `<optgroup>` labels "Chaos - Europe", "Light - Europe", "Elemental - Japan" (data center plus region) and worlds as options. The item page shows region and data-center tabs above the listings (seen behind the modal; **partly unverified**).
6. **Lost Ark official server status** (https://www.playlostark.com/en-us/support/server-status). A two-option segmented toggle (North America, Europe Central) above a grid of server names with status icons (Online, Busy, Full, Maintenance).
7. **aion2.exchange** (https://aion2.exchange). One flat native select with "Siel (NAE, Elyos)" style labels. Works, but 36+ options with no grouping and repeated world names across regions.
- Not verified: wowhead realm search and warcraftlogs region/realm (warcraftlogs showed a bot check, which I did not bypass).

Interaction types, ranked for our case (about 5 regions, 2 factions, roughly 9 worlds per faction per region):
- **Searchable list with grouped headers** (Universalis-like groups, but with type-ahead). Best overall: typing "siel" finds Siel in every region, and the group header shows which region. Desktop as a popover combobox; on mobile as a full-height sheet with a sticky search field. Base UI Combobox groups and React Aria ComboBox sections both do this.
- **Cascading region then faction then world** (Aion official). Matches the game, but two-column flyouts are cramped below 400px and need two or three taps.
- **Segmented region plus grid** (Lost Ark). Very good on mobile when there are few regions; a segmented control with five regions does not fit a phone width, so it would need to scroll.
- **Native select with optgroup** (our current Settings, Universalis). Best accessibility and the best mobile behaviour for free (the OS picker), no search. Our current implementation already groups by `regionName`.
- **Flag or badge modal** (op.gg, u.gg). Good when region is the whole choice; does not scale to a second level.

Recommendation for mobile: native `<select>` with optgroups is the floor and already works. The upgrade is one searchable combobox grouped by region, each world showing an Elyos or Asmodian tag, recently used worlds pinned at the top, opening as a bottom sheet under 640px. Keep the Aion-official region chip idea for the top bar, so the current region is visible without opening Settings.
