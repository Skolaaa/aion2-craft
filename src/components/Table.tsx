import type { ReactNode } from 'react'
import type { Sort } from '../state/scan.ts'
import { useNarrow } from '../state/useNarrow.ts'
import { Glyph } from './Glyph.tsx'

export interface Column<Row, Key extends string = string> {
  key: Key
  header: string
  render(row: Row): ReactNode
  numeric?: boolean
  /** Left out on a phone. */
  hideNarrow?: boolean
  sortable?: boolean
  width?: number
}

interface Props<Row, Key extends string> {
  label: string
  className?: string
  columns: readonly Column<Row, Key>[]
  rows: readonly Row[]
  rowKey(row: Row): string
  rowTitle?(row: Row): string | undefined
  rowClass?(row: Row): string | undefined
  onRowClick?(row: Row): void
  sort?: Sort<Key>
  onSort?(key: Key): void
  footer?: readonly Partial<Record<Key, ReactNode>>[]
  empty?: ReactNode
}

const cellClass = (column: { numeric?: boolean }) => (column.numeric ? 'num' : undefined)

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const

export function Table<Row, Key extends string>({
  label, className, columns: allColumns, rows, rowKey, rowTitle, rowClass, onRowClick, sort, onSort, footer, empty,
}: Props<Row, Key>) {
  const narrow = useNarrow()
  const columns = narrow ? allColumns.filter((column) => !column.hideNarrow) : allColumns
  return (
    <table className={['table', className].filter(Boolean).join(' ')} aria-label={label}>
      <thead>
        <tr>
          {columns.map((column) => {
            const active = sort?.key === column.key
            return (
              <th
                key={column.key}
                scope="col"
                className={cellClass(column)}
                style={column.width === undefined ? undefined : { width: column.width }}
                aria-sort={active && sort ? ARIA_SORT[sort.direction] : undefined}
              >
                {column.sortable && onSort ? (
                  <button type="button" className={`sort ${active ? 'is-active' : ''}`} onClick={() => onSort(column.key)}>
                    {column.header}
                    {active && sort && <Glyph name="arrow" className={sort.direction === 'asc' ? 'is-up' : undefined} />}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && empty ? (
          <tr>
            <td className="table-empty" colSpan={columns.length}>{empty}</td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={rowKey(row)}
              title={rowTitle?.(row)}
              className={[onRowClick ? 'is-clickable' : '', rowClass?.(row) ?? ''].filter(Boolean).join(' ') || undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={cellClass(column)}>{column.render(row)}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
      {footer && (
        <tfoot>
          {footer.map((cells, row) => (
            <tr key={row}>
              {columns.map((column, index) =>
                index === 0 ? (
                  <th key={column.key} scope="row" className={cellClass(column)}>{cells[column.key]}</th>
                ) : (
                  <td key={column.key} className={cellClass(column)}>{cells[column.key]}</td>
                ),
              )}
            </tr>
          ))}
        </tfoot>
      )}
    </table>
  )
}
