import { useMemo, useState } from 'react'
import { costAtRisk } from '../domain/costAtRisk.ts'
import type { ItemId } from '../domain/types.ts'
import { taxLabel } from '../state/format.ts'
import type { ListState } from '../state/list.ts'
import type { OpenSetting } from '../state/openSetting.ts'
import { planWanted, type Planning } from '../state/planning.ts'
import { bestMargins, DEFAULT_SCAN_SORT, nextSort, type ScanRow, type ScanSort } from '../state/scan.ts'
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

function Home({ planning, loading, watchlist, onOpen }: HomeProps) {
  const scan = useScan(planning)
  return (
    <>
      {watchlist.watched.size > 0 && <Watching planning={planning} scan={scan} loading={loading} watchlist={watchlist} onOpen={onOpen} />}
      <BestMargins planning={planning} scan={scan} loading={loading} onOpen={onOpen} />
    </>
  )
}

interface WatchingProps {
  planning: Planning
  scan: readonly ScanRow[]
  loading: boolean
  watchlist: Watchlist
  onOpen(itemId: ItemId): void
}

function Watching({ planning, scan, loading, watchlist, onOpen }: WatchingProps) {
  const { world, options } = planning
  const [sort, setSort] = useState<ScanSort>(DEFAULT_SCAN_SORT)
  const rows = useMemo(() => watchedRows(scan, watchlist.watched, sort), [scan, watchlist.watched, sort])
  return (
    <section className="stack" aria-labelledby="watching-title">
      <div className="stack-tight">
        <div className="group-head">
          <h2 className="section-title" id="watching-title"><span>Watching on {world.name}</span></h2>
          {watchlist.watched.size > 1 && <Button className="button-small" onClick={watchlist.resetAll}>Clear all</Button>}
        </div>
        <p className="meta">Margins after {taxLabel(options.taxRate)} tax at your mastery, with every price refresh. Stop watching an item from its page.</p>
      </div>
      <ScanTable
        label={`Watching on ${world.name}`}
        rows={loading ? [] : rows}
        onOpen={onOpen}
        sort={sort}
        onSort={(key) => setSort((previous) => nextSort(previous, key))}
        empty={loading ? 'Loading prices from aion2.exchange.' : 'None of these items has a recipe on this world.'}
      />
    </section>
  )
}

interface BestProps {
  planning: Planning
  scan: readonly ScanRow[]
  loading: boolean
  onOpen(itemId: ItemId): void
}

function BestMargins({ planning, scan, loading, onOpen }: BestProps) {
  const { world, options } = planning
  const best = useMemo(() => bestMargins(scan, 5), [scan])
  return (
    <section className="stack" aria-labelledby="best-title">
      <div className="stack-tight">
        <h2 className="section-title" id="best-title"><span>Best margins on {world.name}</span></h2>
        <p className="meta">After {taxLabel(options.taxRate)} tax at your mastery. Open one, or search for any craftable item.</p>
      </div>
      <ScanTable
        label={`Best margins on ${world.name}`}
        rows={loading ? [] : best}
        onOpen={onOpen}
        empty={loading ? 'Loading prices from aion2.exchange.' : 'No recipe has a margin with these prices yet.'}
      />
    </section>
  )
}
