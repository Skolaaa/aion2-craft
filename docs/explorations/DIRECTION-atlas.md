# Direction B: "Atlas", fantasy editorial in Aion's own art direction

Family: maxroll.gg for page structure, aion2.plaync.com for colour, type and ornament, wowhead
for grade-coloured names (see ../research/design-survey.md, Part 1). Library this would map to in
production: Base UI (unstyled) with hand-written CSS, TanStack Table for lists.

Feeling: a page from the game's own atlas. The official site uses `#171717` charcoal, a deep
blue `#074783`, glossy blue and violet pill buttons, warm metals (`#C69C7C`, `#FFDC8F`, `#DC722F`),
and wide flared-serif titles between thin ornamental rules with diamond finials.

Tokens (starting point, refine as you build, record the final in README.md):
- Page `#171717`, panels `#1F1F1F`, raised `#262626`, rules `#3A3A3A`. Text `#F2EFE9`, muted
  `#A8A49C`.
- Faction colours carry meaning: Elyos deep blue `#2E6FD1` (light `#7EB3FF`), Asmodian violet
  `#7B4FD6` (light `#B89CFF`). They appear only where a side is shown (badges, the world picker,
  the top bar world crest). The money accent is warm gold `#E6B85C` with `#FFDC8F` highlight, used
  for figures, the sorted column and the primary button.
- Grade colours for item names and icon frames: Common `#D9D9D9`, Rare `#5FB4FF`, Legend
  `#D08BFF`, Unique `#FFB347`. Icon frame: 1 px border in the grade colour plus a faint inner
  glow of the same colour at 25%.
- Type: display `Cinzel` (Google Fonts) for the item name and section titles, 400 weight, wide
  tracking 0.06em, between thin rules with a diamond finial (CSS pseudo-elements, no images).
  Body `Noto Sans` 15 px. Figures `Noto Sans` 600 at 36 px with tabular numbers. No uppercase
  outside Cinzel titles.
- Spacing 8/16/24/32/48. Radius 4 px on inputs, pill (999) on primary buttons only, 0 on panels.
  Panels get a 1 px rule and a 2 px top border in the faction colour of the selected side.
- A key-art banner behind the header: use a CSS gradient that evokes the icy blue-teal sky
  (`#0B1F33` to `#171717`) with a subtle noise or diagonal light streak, no copyrighted image.

Layout:
- Header: 72 px banner. Left: wordmark in Cinzel. Centre: Calculator / Scanner as pill tabs.
  Right: a "crest" block for the context, two lines: line one "Kaisinel" in Cinzel with an Elyos
  badge and "Europe" in muted; line two the mastery as five small labelled gauges (profession
  initial, number, and a 3 px bar under it) and "Tax 5%" with a coin glyph. Hovering the gauge row
  shows the full profession names. Clicking the crest opens the world picker; clicking the gauges
  or the tax opens Settings on that section.
- World picker: the official site's cascading model. A dialog with three columns on desktop:
  Region (five rows with world counts), Side (two large cards, Elyos blue with a wing emblem drawn
  in CSS or an icon-font glyph, Asmodian violet), World (the list for that region and side, each
  row with "matched with Lumiel since 4 Oct 2026" in muted and a "no prices yet" tag when
  applicable). On mobile the three columns become three steps with a back link and a progress
  line "Region > Side > World".
- Calculator answer: the item as a hero: 64 px icon with grade frame, Cinzel item name in the
  grade colour, facts line. The verdict sentence set large (20 px) like a guide's lead paragraph.
  Three figures in a row separated by thin vertical rules with diamond finials. Detail tabs as
  ornamental section titles stacked (no tab switching needed, all three sections on the page,
  like a maxroll guide with anchors).
- Scanner: a guide-like table, 48 px rows, item names in grade colour, margin in gold, the
  profession filter as a row of emblem buttons.
- Settings: a modal with the same ornamental section titles. Mastery per profession with the
  in-game name under it ("Armorsmithing in game"). Tax: "Market tax, 5%" with "Found on the Market
  screen, top right. It reduces what a sale pays out, so it moves the margin."

The one memorable element: the ornamental rules with diamond finials framing every title, and
the faction-coloured world crest in the header.
