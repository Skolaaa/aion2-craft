# Design explorations, October 2026

Three throwaway prototypes of the same screens in three design systems, built to pick a
direction before the real UI rebuild. They are static HTML, CSS and JS with the real data from
one plan inlined. None of this code is meant to ship.

Open them:

```bash
python3 -m http.server 8765 -d docs/explorations
```

Then http://127.0.0.1:8765/compare.html shows all screenshots side by side, and
`ledger/`, `atlas/` and `arena/` are the live prototypes.

| Direction | Family | Default | Library in production | Memorable element |
|---|---|---|---|---|
| `ledger/` | Dark data terminal (poe.ninja, tarkov-market, aion2.exchange) | dark | React Aria Components | Margin heat column; status-line header with labelled chips |
| `atlas/` | Fantasy editorial in Aion's own art direction (maxroll, aion2.plaync.com) | dark | Base UI + own CSS | Ornamental rules with diamond finials; faction-coloured world crest; cascading region, side, world picker |
| `arena/` | Esports stats dashboard (u.gg, op.gg) | light | shadcn/ui on Tailwind v4 | Filter bar of chips that is the plan's context; margin tier badges |

`BRIEF.md` is the shared functional brief, `DIRECTION-*.md` the per-direction brief, and
`research/` holds the world-pairing research and the site and library survey the briefs rest on.
