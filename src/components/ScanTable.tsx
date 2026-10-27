import type { ReactNode } from 'react'
import type { ItemId } from '../domain/types.ts'
import { kina, plural, signedKina, toneOf } from '../state/format.ts'
import type { ScanKey, ScanRow, ScanSort } from '../state/scan.ts'
import { Glyph } from './Glyph.tsx'
import { HeatChip } from './HeatChip.tsx'
import { ItemCell } from './ItemCell.tsx'
import { Table, type Column } from './Table.tsx'

function needs({ verdict }: ScanRow) {
  if (verdict.kind === 'missing') return 'needs a price'
  return verdict.kind === 'blocked' ? `needs mastery ${verdict.level}` : null
}

function rowTitle(row: ScanRow) {
  if (row.lowest === null) return undefined
  const sold = row.sold === null ? 'no sales in 28 days' : `28-day average ${kina(row.sold)}`
  return `${row.listings} ${plural(row.listings, 'listing', 'listings')}, ${sold}`
}

function scanColumns(onOpen: (itemId: ItemId) => void): Column<ScanRow, ScanKey>[] {
  return [
    {
      key: 'item',
      header: 'Item',
      sortable: true,
      render: (row) => (
        <ItemCell
          item={row.item}
          meta={<span className="mono">{row.profession ?? 'Any profession'} {row.level}</span>}
          onOpen={() => onOpen(row.item.id)}
        />
      ),
    },
    { key: 'cost', header: 'Craft cost', numeric: true, hideNarrow: true, sortable: true, render: (row) => (row.cost === null ? null : kina(row.cost)) },
    {
      key: 'lowest',
      header: 'Market lowest',
      numeric: true,
      hideNarrow: true,
      sortable: true,
      render: (row) => (row.lowest === null ? <span className="meta">no listing</span> : kina(row.lowest)),
    },
    {
      key: 'margin',
      header: 'Margin',
      numeric: true,
      sortable: true,
      render: (row) => {
        const reason = needs(row)
        if (reason) return <span className="tag pill">{reason}</span>
        return row.margin === null ? null : <span className={toneOf(row.margin, 'kina')}>{signedKina(row.margin)}</span>
      },
    },
    { key: 'marginPct', header: 'Margin %', numeric: true, sortable: true, render: (row) => <HeatChip marginPct={row.marginPct} /> },
  ]
}

interface Props {
  label: string
  rows: readonly ScanRow[]
  empty: ReactNode
  onOpen(itemId: ItemId): void
  sort?: ScanSort
  onSort?(key: ScanKey): void
}

export function ScanTable({ label, rows, empty, onOpen, sort, onSort }: Props) {
  const columns = scanColumns(onOpen)
  return (
    <>
      {sort && onSort && (
        <div className="sort-chips" role="group" aria-label="Sort by">
          <span className="chip-key" aria-hidden="true">sort by</span>
          {columns
            .filter((column) => column.sortable)
            .map(({ key, header }) => (
              <button key={key} type="button" className="chip" aria-pressed={sort.key === key} onClick={() => onSort(key)}>
                {header}
                {sort.key === key && <Glyph name="arrow" className={sort.direction === 'asc' ? 'is-up' : undefined} />}
              </button>
            ))}
        </div>
      )}
      <Table
        label={label}
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.item.id)}
        rowTitle={rowTitle}
        rowClass={(row) => (row.status === 'ready' ? undefined : 'is-dim')}
        onRowClick={(row) => onOpen(row.item.id)}
        sort={sort}
        onSort={onSort}
        empty={empty}
      />
    </>
  )
}
