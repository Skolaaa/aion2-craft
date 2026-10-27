# Direction C: "Arena", the esports stats dashboard, light surface

Family: u.gg, mobalytics, op.gg (see ../research/design-survey.md, Part 1). Exemplar: op.gg's
signature blue band and giant search, u.gg's filter bar of dropdown chips and coloured tier
badges. Library this would map to in production: shadcn/ui (Base UI variant) on Tailwind v4 with
TanStack Table.

Feeling: a stats site. Fast, bright, badge-driven, optimised for scanning hundreds of rows. This
is the ONE light direction, so the other two stay dark; do not build it dark. A dark toggle may
exist but the default and all screenshots are light.

Tokens (starting point, refine as you build, record the final in README.md):
- Page `#F3F5F9` cool grey, cards `#FFFFFF`, rules `#E1E5EC`, text `#141A26`, muted `#5F6B7D`.
- Signature band: the header is a solid saturated blue `#4F7BEA` with white text, 56 px, like
  op.gg's band. Primary accent `#2F62E6`, focus ring the same. Gain `#1F9D55`, loss `#D63B3B`.
- Tier badges for margin: S `#F0B32B` gold, A `#2F62E6` blue, B `#6B7A90` grey, C `#C9CFD9`,
  as small rounded hexagons or rounded squares with a white letter, next to the margin %.
  Tiers: S above 60%, A 30 to 60, B 10 to 30, C under 10, F negative (red).
- Faction as pill tags: Elyos `#2F62E6` on `#E6EDFF`, Asmodian `#7B4FD6` on `#F0E9FF`.
- Type: `Inter` everywhere, 14 px body, 13 px table, 12 px chips, 32 px figures 700 weight,
  tabular numbers. Chips are 28 px tall pills with a chevron.
- Spacing 4/8/12/16/24. Radius 8 px cards, 999 chips. Cards get a 1 px rule and a tinted shadow
  `0 1px 2px rgba(20,26,38,.06)`.

Layout:
- Header band: wordmark, Calculator / Scanner tabs as white underlined tabs, and the giant
  search for an item with a region code prefix chip inside the input ("EU"), like op.gg.
- Under the band, a filter bar of dropdown chips that IS the context: `Region: EU ▾`
  `World: Kaisinel ▾` `Side: Elyos ▾` `Mastery: BS 100 · AS 100 · HC 100 · AL 100 · CK 100 ▾`
  `Tax: 5% ▾`. Each chip opens a popover with that setting. The mastery popover lists the five
  professions with name, in-game name and a slider. The tax popover has the number input and
  the helper "Market screen in game, top right. Lowers what a sale pays out."
- World picker: from the Region chip, a popover of five coloured code badges (NAE, NAW, EU, LA,
  AS) with the full region name; from the World chip, a popover with a side segmented toggle
  (Elyos | Asmodian) on top and a grid of world tiles, each tile with the matched world in small
  muted text and a "no prices" state. On mobile the popovers are bottom sheets.
- Calculator answer: three KPI cards (Craft, Buy, Margin) with the verdict sentence above them
  in a white card with a left accent bar, the margin card showing its tier badge. Detail tabs as
  underlined tabs inside a card.
- Scanner: a table in a card with 40 px rows, the sorted column tinted `#EEF3FF`, margin tier
  badges, and the profession filter as icon chips in the filter bar.

The one memorable element: the filter bar of chips that makes every assumption (region, world,
side, mastery, tax) visible and editable in place, plus the margin tier badges.
