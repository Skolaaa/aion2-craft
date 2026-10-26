import { useMemo, useState } from 'react'
import type { ItemId, Profession } from '../domain/types.ts'
import { plural, taxLabel } from '../state/format.ts'
import type { Planning } from '../state/planning.ts'
import { DEFAULT_SCAN_SORT, nextSort, viewScan, type ScanRow, type ScanSort } from '../state/scan.ts'
import { PROFESSIONS } from '../state/setup.ts'
import type { PriceFeed } from '../state/usePrices.ts'
import { Button } from './Button.tsx'
import { Field } from './Field.tsx'
import { PriceStatus } from './PriceStatus.tsx'
import { ScanTable } from './ScanTable.tsx'

interface Props {
  rows: readonly ScanRow[]
  planning: Planning
  feed: PriceFeed
  now: number
  onOpen(itemId: ItemId): void
}

export function Scanner({ rows, planning, feed, now, onOpen }: Props) {
  const { world, options } = planning
  const [profession, setProfession] = useState<Profession | null>(null)
  const [name, setName] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const [sort, setSort] = useState<ScanSort>(DEFAULT_SCAN_SORT)
  const view = useMemo(() => viewScan(rows, { profession, name, showHidden, sort }), [rows, profession, name, showHidden, sort])


  const chips: readonly { id: Profession | null; label: string }[] = [{ id: null, label: 'All' }, ...PROFESSIONS]

  return (
    <section className="stack scanner" aria-labelledby="scanner-title">
      <div className="stack-tight">
        <h1 className="section-title" id="scanner-title">Every recipe on {world.name}</h1>
        <p className="meta">Margins after {taxLabel(options.taxRate)} tax at your mastery. Click a row to open it in the calculator.</p>
        <PriceStatus feed={feed} now={now} worldName={world.name} />
      </div>

      <div className="filters">
        <div className="chips" role="group" aria-label="Profession">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className="chip"
              aria-pressed={profession === chip.id}
              onClick={() => setProfession(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <Field id="scan-name" label="Filter by name" className="filter-name">
          <input
            id="scan-name"
            className="input"
            type="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="For example orichalcum"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </div>

      <ScanTable
        label={`Every recipe on ${world.name}`}
        rows={view.rows}
        onOpen={onOpen}
        sort={sort}
        onSort={(key) => setSort((previous) => nextSort(previous, key))}
        empty={feed.pending ? 'Prices are loading.' : 'No recipe matches these filters.'}
      />

      {view.hidden > 0 && (
        <div className="hidden-note meta">
          <span>
            {view.hidden} {plural(view.hidden, 'recipe needs', 'recipes need')} a price or more mastery
            {showHidden ? '.' : ' and stay hidden.'}
          </span>
          <Button className="button-small" aria-pressed={showHidden} onClick={() => setShowHidden((shown) => !shown)}>
            {showHidden ? 'Hide them' : 'Show them'}
          </Button>
        </div>
      )}
    </section>
  )
}
