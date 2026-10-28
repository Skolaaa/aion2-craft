import { useMemo, useState, type ReactNode } from 'react'
import { costAtRisk } from '../domain/costAtRisk.ts'
import type { ItemId } from '../domain/types.ts'
import { taxLabel } from '../state/format.ts'
import type { ListState } from '../state/list.ts'
import type { OpenSetting } from '../state/openSetting.ts'
import { planWanted, type Planning } from '../state/planning.ts'
import { bestMargins, DEFAULT_SCAN_SORT, nextSort, type ScanKey, type ScanRow, type ScanSort } from '../state/scan.ts'
import type { Target, View } from '../state/target.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import type { OwnedStock } from '../state/useOwned.ts'
import type { Sources } from '../state/useSources.ts'
import type { Freshness } from '../state/useFreshness.ts'
import { useBulkLadders } from '../state/useLadders.ts'
import { useScan } from '../state/useScan.ts'
import { watchedRows, type Watchlist } from '../state/watchlist.ts'
import { AddToList } from './AddToList.tsx'
import { AnswerPanel } from './AnswerPanel.tsx'
import { Button } from './Button.tsx'
import { Details, type DetailTab } from './Details.tsx'
import { ScanTable } from './ScanTable.tsx'
import { Search } from './Search.tsx'
import { WatchButton } from './WatchButton.tsx'

interface Props {
  planning: Planning
  freshness: Freshness
  requestLadders(itemIds: readonly ItemId[]): void
  target: Target
  overrides: PriceOverrides
  owned: OwnedStock
  sources: Sources
  surface: Pick<OpenSetting, 'opened' | 'open'>
  link: string
  onTarget(change: Partial<Target>): void
  list: ListState
  watchlist: Watchlist
  onView(view: View): void
}

export function Calculator({ planning, freshness, requestLadders, target, overrides, owned, sources, surface, link, onTarget, list, watchlist, onView }: Props) {
  const { index } = planning
  const [tab, setTab] = useState<DetailTab>('buy')
  const craftable = target.itemId === null ? null : (index.byId.get(target.itemId) ?? null)
  const plan = useMemo(
    () => (craftable ? planWanted(planning, new Map([[craftable.item.id, target.quantity]]), owned.counts, sources.choices) : null),
    [planning, craftable, target.quantity, owned.counts, sources.choices],
  )

  const risk = useMemo(
    () => (plan && Number.isFinite(plan.cost) ? costAtRisk(plan, { catalog: planning.catalog, owned: owned.counts }) : null),
    [plan, planning.catalog, owned.counts],
  )

  useBulkLadders(plan, planning.prices, freshness, requestLadders)

  return (
    <>
      <h1 className="sr-only">Calculator</h1>
      <Search craftables={index.craftables} autoFocus={craftable === null} onPick={(itemId) => onTarget({ itemId })} />
      {craftable === null && <Home planning={planning} loading={freshness.pending} watchlist={watchlist} onOpen={(itemId) => onTarget({ itemId })} />}
      {craftable && (
        <>
          <AnswerPanel
            craftable={craftable}
            plan={plan}
            risk={risk}
            planning={planning}
            freshness={freshness}
            quantity={target.quantity}
            overrides={overrides}
            surface={surface}
            onTarget={onTarget}
            after={
              plan && (
                <>
                  <AddToList itemId={craftable.item.id} quantity={target.quantity} list={list} onView={onView} />
                  <WatchButton itemId={craftable.item.id} watchlist={watchlist} />
                </>
              )
            }
          />
          {plan && !freshness.pending && (
            <Details
              plan={plan}
              planning={planning}
              overrides={overrides}
              owned={owned}
              sources={sources}
              link={link}
              tab={tab}
              onTab={setTab}
              rates={plan.targets[0]}
              risk={risk}
            />
          )}
        </>
      )}
    </>
  )
}

interface HomeProps {
  planning: Planning
  loading: boolean
  watchlist: Watchlist
  onOpen(itemId: ItemId): void
}

/** The calculator with no item open: the watchlist, then the five best margins, over one scan. */
function Home({ planning, loading, watchlist, onOpen }: HomeProps) {
  const { world, options } = planning
  const scan = useScan(planning)
  const best = useMemo(() => bestMargins(scan, 5), [scan])
  const shared = { world: world.name, loading, onOpen }
  return (
    <>
      {watchlist.watched.size > 0 && <Watching {...shared} scan={scan} tax={options.taxRate} watchlist={watchlist} />}
      <HomeSection
        {...shared}
        id="best"
        title="Best margins"
        meta={`After ${taxLabel(options.taxRate)} tax at your mastery. Open one, or search for any craftable item.`}
        rows={best}
        empty="No recipe has a margin with these prices yet."
      />
    </>
  )
}

interface WatchingProps extends Omit<SectionProps, 'id' | 'title' | 'meta' | 'rows' | 'empty'> {
  scan: readonly ScanRow[]
  tax: number
  watchlist: Watchlist
}

function Watching({ scan, tax, watchlist, ...shared }: WatchingProps) {
  const [sort, setSort] = useState<ScanSort>(DEFAULT_SCAN_SORT)
  const rows = useMemo(() => watchedRows(scan, watchlist.watched, sort), [scan, watchlist.watched, sort])
  return (
    <HomeSection
      {...shared}
      id="watching"
      title="Watching"
      action={<Button className="button-small" onClick={watchlist.resetAll}>Clear all</Button>}
      meta={`Margins after ${taxLabel(tax)} tax at your mastery, with every price refresh. Stop watching an item from its page.`}
      rows={rows}
      sort={sort}
      onSort={(key) => setSort((previous) => nextSort(previous, key))}
      empty="None of these items has a recipe on this world."
    />
  )
}

interface SectionProps {
  id: string
  /** Shown as "<title> on <world>". */
  title: string
  world: string
  action?: ReactNode
  meta: string
  rows: readonly ScanRow[]
  loading: boolean
  /** What the table says once prices are in and no row is left. */
  empty: string
  sort?: ScanSort
  onSort?(key: ScanKey): void
  onOpen(itemId: ItemId): void
}

function HomeSection({ id, title, world, action, meta, rows, loading, empty, sort, onSort, onOpen }: SectionProps) {
  const heading = `${title} on ${world}`
  return (
    <section className="stack" aria-labelledby={`${id}-title`}>
      <div className="stack-tight">
        <div className="group-head">
          <h2 className="section-title" id={`${id}-title`}><span>{heading}</span></h2>
          {action}
        </div>
        <p className="meta">{meta}</p>
      </div>
      <ScanTable label={heading} rows={loading ? [] : rows} onOpen={onOpen} sort={sort} onSort={onSort} empty={loading ? 'Loading prices from aion2.exchange.' : empty} />
    </section>
  )
}
