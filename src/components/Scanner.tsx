import { useMemo, useState } from 'react'
import type { Catalog, ItemId, Mastery, Profession } from '../domain/types.ts'
import { answerOf } from '../state/answer.ts'
import { kina, percent, plural, signedKina, taxLabel } from '../state/format.ts'
import type { Planning } from '../state/planning.ts'
import { DEFAULT_SCAN_SORT, nextSort, viewScan, type ScanKey, type ScanRow, type ScanSort } from '../state/scan.ts'
import { PROFESSIONS } from '../state/setup.ts'
import type { PriceFeed } from '../state/usePrices.ts'
import { Button } from './Button.tsx'
import { Field } from './Field.tsx'
import { ItemCell } from './ItemCell.tsx'
import { PriceStatus } from './PriceStatus.tsx'
import { Table, type Column } from './Table.tsx'

const tone = (value: number | null) => (value === null || Math.round(value * 1000) === 0 ? undefined : value > 0 ? 'is-gain' : 'is-loss')

function needs(row: ScanRow, catalog: Catalog, mastery: Mastery) {
  if (row.status === 'unpriced') return 'needs a price'
  if (row.status !== 'locked') return null
  const { verdict } = answerOf(row.plan, { catalog, mastery })
  return verdict.kind === 'blocked' && verdict.profession ? `needs ${verdict.profession} ${verdict.level}` : 'needs more mastery'
}

export function rowTitle(row: ScanRow) {
  if (row.lowest === null) return undefined
  const sold = row.sold === null ? 'no sales in 28 days' : `28-day average ${kina(row.sold)}`
  return `${row.listings} ${plural(row.listings, 'listing', 'listings')}, ${sold}`
}

export function scanColumns(catalog: Catalog, mastery: Mastery, onOpen: (itemId: ItemId) => void): Column<ScanRow, ScanKey>[] {
  return [
    {
      key: 'item',
      header: 'Item',
      sortable: true,
      render: (row) => {
        const meta = [row.profession ?? 'Any profession', `level ${row.level}`, needs(row, catalog, mastery)].filter(Boolean).join(', ')
        return (
          <ItemCell
            item={row.item}
            meta={meta}
            narrowMeta={[row.cost === null ? null : `cost ${kina(row.cost)}`, row.lowest === null ? 'no listing' : `lowest ${kina(row.lowest)}`]
              .filter(Boolean)
              .join(', ')}
            onOpen={() => onOpen(row.item.id)}
          />
        )
      },
    },
    { key: 'cost', header: 'Craft cost', numeric: true, wide: true, sortable: true, render: (row) => (row.cost === null ? null : kina(row.cost)) },
    {
      key: 'lowest',
      header: 'Market lowest',
      numeric: true,
      wide: true,
      sortable: true,
      render: (row) => (row.lowest === null ? <span className="meta">no listing</span> : kina(row.lowest)),
    },
    {
      key: 'margin',
      header: 'Margin',
      numeric: true,
      sortable: true,
      render: (row) => (row.margin === null ? null : <span className={tone(row.margin)}>{signedKina(row.margin)}</span>),
    },
    {
      key: 'marginPct',
      header: 'Margin %',
      numeric: true,
      sortable: true,
      render: (row) => (row.marginPct === null ? null : <span className={tone(row.marginPct)}>{percent(row.marginPct, 1, true)}</span>),
    },
  ]
}

interface Props {
  rows: readonly ScanRow[]
  planning: Planning
  feed: PriceFeed
  now: number
  onOpen(itemId: ItemId): void
}

export function Scanner({ rows, planning, feed, now, onOpen }: Props) {
  const { catalog, mastery, world, options } = planning
  const [profession, setProfession] = useState<Profession | null>(null)
  const [name, setName] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const [sort, setSort] = useState<ScanSort>(DEFAULT_SCAN_SORT)
  const view = useMemo(() => viewScan(rows, { profession, name, showHidden, sort }), [rows, profession, name, showHidden, sort])
  const columns = scanColumns(catalog, mastery, onOpen)

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

      <Table
        label={`Every recipe on ${world.name}`}
        columns={columns}
        rows={view.rows}
        rowKey={(row) => String(row.item.id)}
        rowTitle={rowTitle}
        onRowClick={(row) => onOpen(row.item.id)}
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
