import type { ReactNode } from 'react'
import type { ItemId } from '../domain/types.ts'
import { kina, plural, signedKina, toneOf } from '../state/format.ts'
import type { ScanKey, ScanRow, ScanSort } from '../state/scan.ts'
import { HeatChip } from './HeatChip.tsx'
import { useNarrow } from '../state/useNarrow.ts'
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

function scanColumns(onOpen: (itemId: ItemId) => void, narrow: boolean): Column<ScanRow, ScanKey>[] {
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
      width: narrow ? 100 : undefined,
      render: (row) => {
        const reason = needs(row)
        if (reason) return <span className="tag pill">{reason}</span>
        return row.margin === null ? null : <span className={toneOf(row.margin, 'kina')}>{signedKina(row.margin)}</span>
      },
    },
    {
      key: 'marginPct',
      header: narrow ? '%' : 'Margin %',
      numeric: true,
      sortable: true,
      width: narrow ? 72 : undefined,
      render: (row) => <HeatChip marginPct={row.marginPct} />,
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
  const narrow = useNarrow()
  return (
    <Table
      className="scan-table"
      label={label}
      columns={scanColumns(onOpen, narrow)}
      rows={rows}
      rowKey={(row) => String(row.item.id)}
      rowTitle={rowTitle}
      rowClass={(row) => (row.status === 'ready' ? undefined : 'is-dim')}
      onRowClick={(row) => onOpen(row.item.id)}
      sort={sort}
      onSort={onSort}
      empty={empty}
    />
  )
}
