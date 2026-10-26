import type { ReactNode } from 'react'
import type { ItemId } from '../domain/types.ts'
import { kina, percent, plural, signedKina, toneOf } from '../state/format.ts'
import type { ScanKey, ScanRow, ScanSort } from '../state/scan.ts'
import { ItemCell } from './ItemCell.tsx'
import { Table, type Column } from './Table.tsx'

function needs({ verdict }: ScanRow) {
  if (verdict.kind === 'missing') return 'needs a price'
  if (verdict.kind !== 'blocked') return null
  return verdict.profession ? `needs ${verdict.profession} ${verdict.level}` : 'needs more mastery'
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
      render: (row) => {
        const meta = [row.profession ?? 'Any profession', `level ${row.level}`, needs(row)].filter(Boolean).join(', ')
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
      render: (row) => (row.margin === null ? null : <span className={toneOf(row.margin, 'kina')}>{signedKina(row.margin)}</span>),
    },
    {
      key: 'marginPct',
      header: 'Margin %',
      numeric: true,
      sortable: true,
      render: (row) => (row.marginPct === null ? null : <span className={toneOf(row.marginPct, 'fraction')}>{percent(row.marginPct, 1, true)}</span>),
    },
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
  return (
    <Table
      label={label}
      columns={scanColumns(onOpen)}
      rows={rows}
      rowKey={(row) => String(row.item.id)}
      rowTitle={rowTitle}
      onRowClick={(row) => onOpen(row.item.id)}
      sort={sort}
      onSort={onSort}
      empty={empty}
    />
  )
}
