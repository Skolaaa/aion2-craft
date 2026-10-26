import { useMemo, useState } from 'react'
import type { ItemId, Profession } from '../domain/types.ts'
import type { ScanRow } from '../state/scan.ts'
import { PROFESSIONS } from '../state/setup.ts'
import { isRecord, usePersistentState } from '../state/usePersistentState.ts'
import type { PriceFeed } from '../state/usePrices.ts'
import { Icon } from './Icon.tsx'
import { ItemIcon } from './ItemIcon.tsx'
import { Credit, PriceAge } from './PriceAge.tsx'
import { kina, percent, signedKina } from './format.ts'

type SortKey = 'name' | 'profession' | 'level' | 'cost' | 'lowest' | 'sold' | 'listings' | 'margin' | 'marginPct'
type Direction = 'asc' | 'desc'

interface Prefs {
  sort: SortKey
  direction: Direction
  profession: Profession | 'all'
  includeBlocked: boolean
}

const DEFAULT_PREFS: Prefs = { sort: 'marginPct', direction: 'desc', profession: 'all', includeBlocked: false }

const COLUMNS: readonly { key: SortKey; label: string; short: string; numeric: boolean }[] = [
  { key: 'name', label: 'Item', short: 'Name', numeric: false },
  { key: 'profession', label: 'Profession', short: 'Profession', numeric: false },
  { key: 'level', label: 'Level', short: 'Level', numeric: true },
  { key: 'cost', label: 'Cost', short: 'Cost', numeric: true },
  { key: 'lowest', label: 'Market lowest', short: 'Market', numeric: true },
  { key: 'sold', label: '28-day average', short: '28-day avg', numeric: true },
  { key: 'listings', label: 'Listings', short: 'Listings', numeric: true },
  { key: 'margin', label: 'Margin', short: 'Margin', numeric: true },
  { key: 'marginPct', label: 'Margin %', short: 'Margin %', numeric: true },
]

const SORT_KEYS = COLUMNS.map((column) => column.key)

function parsePrefs(raw: unknown): Prefs | null {
  if (!isRecord(raw)) return null
  const sort = SORT_KEYS.find((key) => key === raw.sort) ?? DEFAULT_PREFS.sort
  const profession = PROFESSIONS.find((p) => p.id === raw.profession)?.id ?? 'all'
  return {
    sort,
    direction: raw.direction === 'asc' ? 'asc' : 'desc',
    profession,
    includeBlocked: raw.includeBlocked === true,
  }
}

const valueOf = (row: ScanRow, key: SortKey): number | string | null => {
  switch (key) {
    case 'name': return row.item.name
    case 'profession': return row.profession
    case 'level': return row.level
    case 'cost': return row.cost
    case 'lowest': return row.lowest
    case 'sold': return row.sold
    case 'listings': return row.lowest === null ? null : row.listings
    case 'margin': return row.margin
    case 'marginPct': return row.marginPct
  }
}

function sortRows(rows: readonly ScanRow[], key: SortKey, direction: Direction) {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = valueOf(a, key)
    const y = valueOf(b, key)
    if (x === null && y === null) return a.item.name.localeCompare(b.item.name)
    if (x === null) return 1
    if (y === null) return -1
    const order = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : Number(x) - Number(y)
    return order * sign || a.item.name.localeCompare(b.item.name)
  })
}

interface Props {
  rows: readonly ScanRow[]
  feed: PriceFeed
  now: number
  worldName: string
  onOpen(itemId: ItemId): void
}

export function Scanner({ rows, feed, now, worldName, onOpen }: Props) {
  const [prefs, update] = usePersistentState('scanner', DEFAULT_PREFS, parsePrefs)
  const [filter, setFilter] = useState('')
  const awaitingPrices = feed.status === 'loading' && feed.snapshot === null

  const inScope = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    return rows.filter(
      (row) => (prefs.profession === 'all' || row.profession === prefs.profession) && (needle === '' || row.item.name.toLowerCase().includes(needle)),
    )
  }, [rows, prefs.profession, filter])

  const visible = useMemo(
    () => sortRows(inScope.filter((row) => prefs.includeBlocked || row.status === 'ready'), prefs.sort, prefs.direction),
    [inScope, prefs.includeBlocked, prefs.sort, prefs.direction],
  )
  const unpriced = inScope.filter((row) => row.status === 'unpriced').length
  const locked = inScope.filter((row) => row.status === 'locked').length

  const sortBy = (key: SortKey) =>
    update((previous) => ({
      ...previous,
      sort: key,
      direction: previous.sort === key ? (previous.direction === 'desc' ? 'asc' : 'desc') : key === 'name' || key === 'profession' ? 'asc' : 'desc',
    }))

  return (
    <section className="scanner" aria-label="Profit scanner">
      <div className="panel scanner-head">
        <div>
          <h2 className="panel-title">Profit scanner</h2>
          <p className="field-hint">Every item you can craft on {worldName}, priced at your mastery and your setup options.</p>
        </div>
        <PriceAge feed={feed} now={now} />
      </div>

      <div className="scan-controls">
        <fieldset className="chips">
          <legend className="field-label">Profession</legend>
          {(['all', ...PROFESSIONS.map((p) => p.id)] as const).map((id) => (
            <label key={id} className="chip">
              <input type="radio" name="scan-profession" checked={prefs.profession === id} onChange={() => update((p) => ({ ...p, profession: id }))} />
              <span>{id === 'all' ? 'All' : id}</span>
            </label>
          ))}
        </fieldset>
        <div className="field scan-profession">
          <label className="field-label" htmlFor="scan-profession">Profession</label>
          <span className="select-wrap">
            <select
              id="scan-profession"
              className="input"
              value={prefs.profession}
              onChange={(event) => update((p) => ({ ...p, profession: PROFESSIONS.find((pro) => pro.id === event.target.value)?.id ?? 'all' }))}
            >
              <option value="all">All professions</option>
              {PROFESSIONS.map((pro) => <option key={pro.id} value={pro.id}>{pro.label}</option>)}
            </select>
            <Icon name="chevron" size={14} />
          </span>
        </div>
        <div className="field scan-filter">
          <label className="field-label" htmlFor="scan-filter">Filter by name</label>
          <input id="scan-filter" className="input" value={filter} onChange={(event) => setFilter(event.target.value)} autoComplete="off" />
        </div>
        <div className="field scan-sort">
          <label className="field-label" htmlFor="scan-sort">Sort by</label>
          <span className="sort-pair">
            <select id="scan-sort" className="input" value={prefs.sort} onChange={(event) => update((p) => ({ ...p, sort: SORT_KEYS.find((k) => k === event.target.value) ?? p.sort }))}>
              {COLUMNS.map((column) => <option key={column.key} value={column.key}>{column.short}</option>)}
            </select>
            <button
              type="button"
              className="btn"
              onClick={() => update((p) => ({ ...p, direction: p.direction === 'asc' ? 'desc' : 'asc' }))}
              aria-label={prefs.direction === 'asc' ? 'Sorted low to high. Switch to high to low.' : 'Sorted high to low. Switch to low to high.'}
            >
              <Icon name={prefs.direction === 'asc' ? 'up' : 'down'} size={16} />
            </button>
          </span>
        </div>
      </div>

      {awaitingPrices ? (
        <div className="skeleton" role="status">
          <span className="skeleton-bar" />
          <p>Loading prices from aion2.exchange.</p>
        </div>
      ) : (
        <>
          <p className="scan-count" role="status">
            <span className="num">{visible.length}</span> items shown.
            {(unpriced > 0 || locked > 0) && !prefs.includeBlocked && (
              <> {unpriced > 0 && `${unpriced} need prices. `}{locked > 0 && `${locked} need more mastery. `}</>
            )}
            {(unpriced > 0 || locked > 0) && (
              <label className="inline-check">
                <input type="checkbox" checked={prefs.includeBlocked} onChange={(event) => update((p) => ({ ...p, includeBlocked: event.target.checked }))} />
                <span>Show them too</span>
              </label>
            )}
          </p>

          {visible.length === 0 ? (
            <div className="empty">
              <h3 className="empty-title">Nothing to show</h3>
              <p>
                {rows.length === 0 ? 'This world has no craftable items.' : 'Every item here needs a price or more mastery. Show them too, or enter prices in the calculator.'}
              </p>
            </div>
          ) : (
            <div className="panel table-panel">
              <table className="scan-table" role="table">
                <thead role="rowgroup">
                  <tr role="row">
                    {COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        role="columnheader"
                        scope="col"
                        className={`col-${column.key} ${column.numeric ? 'r' : ''}`}
                        aria-sort={prefs.sort === column.key ? (prefs.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <button type="button" className="sort-btn" onClick={() => sortBy(column.key)}>
                          {column.label}
                          <Icon name={prefs.sort === column.key ? (prefs.direction === 'asc' ? 'up' : 'down') : 'sort'} size={12} />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {visible.map((row) => (
                    <tr role="row" key={row.item.id} className={`scan-row is-${row.status}`}>
                      <td role="cell" className="col-name">
                        <button type="button" className="item-link" onClick={() => onOpen(row.item.id)}>
                          <ItemIcon item={row.item} size={28} />
                          <span className="item-link-name">{row.item.name}</span>
                          <span className="grade">{row.item.grade}</span>
                        </button>
                        <span className="name-facts">{row.profession ?? 'Any profession'}, level {row.level}</span>
                      </td>
                      <td role="cell" className="col-profession" data-label="Profession">{row.profession ?? 'n/a'}</td>
                      <td role="cell" className="col-level r num" data-label="Level">{row.level}</td>
                      <td role="cell" className="col-cost r num" data-label="Cost">
                        {row.cost !== null ? kina(row.cost) : <span className="muted-note">{row.status === 'locked' ? 'Needs mastery' : 'Needs prices'}</span>}
                      </td>
                      <td role="cell" className="col-lowest r num" data-label="Market">{row.lowest !== null ? kina(row.lowest) : <span className="muted-note">No listings</span>}</td>
                      <td role="cell" className="col-sold r num" data-label="28-day avg">{row.sold !== null ? kina(row.sold) : <span className="muted-note">No sales</span>}</td>
                      <td role="cell" className="col-listings r num" data-label="Listings">{row.lowest !== null ? row.listings : <span className="muted-note">0</span>}</td>
                      <td role="cell" className={`col-margin r num ${row.margin === null ? '' : row.margin >= 0 ? 'is-gain' : 'is-loss'}`} data-label="Margin">
                        {row.margin !== null ? signedKina(row.margin) : <span className="muted-note">n/a</span>}
                      </td>
                      <td role="cell" className={`col-marginPct r num ${row.marginPct === null ? '' : row.marginPct >= 0 ? 'is-gain' : 'is-loss'}`} data-label="Margin %">
                        {row.marginPct !== null ? percent(row.marginPct, 1, true) : <span className="muted-note">n/a</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <Credit />
    </section>
  )
}

