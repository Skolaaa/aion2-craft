import { useMemo, useState } from 'react'
import type { ItemId } from '../domain/types.ts'
import { taxLabel } from '../state/format.ts'
import { planOne, type Planning } from '../state/planning.ts'
import { bestMargins, type ScanRow } from '../state/scan.ts'
import type { Target } from '../state/target.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import type { PriceFeed } from '../state/usePrices.ts'
import { AnswerPanel } from './AnswerPanel.tsx'
import { Details, type DetailTab } from './Details.tsx'
import { ScanTable } from './ScanTable.tsx'
import { Search } from './Search.tsx'


interface Props {
  planning: Planning
  feed: PriceFeed
  target: Target
  scan: readonly ScanRow[]
  overrides: PriceOverrides
  onTarget(change: Partial<Target>): void
}

export function Calculator({ planning, feed, target, scan, overrides, onTarget }: Props) {
  const { index } = planning
  const [tab, setTab] = useState<DetailTab>('buy')
  const craftable = target.itemId === null ? null : (index.byId.get(target.itemId) ?? null)
  const plan = useMemo(
    () => (craftable ? planOne(planning, craftable.item.id, target.quantity) : null),
    [planning, craftable, target.quantity],
  )

  return (
    <>
      <h1 className="sr-only">Calculator</h1>
      <Search craftables={index.craftables} autoFocus={craftable === null} onPick={(itemId) => onTarget({ itemId })} />
      {craftable === null && <BestMargins planning={planning} scan={scan} loading={feed.pending} onOpen={(itemId) => onTarget({ itemId })} />}
      {craftable && (
        <>
          <AnswerPanel
            craftable={craftable}
            plan={plan}
            planning={planning}
            feed={feed}
            quantity={target.quantity}
            overrides={overrides}
            onTarget={onTarget}
          />
          {plan && !feed.pending && <Details plan={plan} planning={planning} overrides={overrides} tab={tab} onTab={setTab} />}
        </>
      )}
    </>
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
  return (
    <section className="stack" aria-labelledby="best-title">
      <div className="stack-tight">
        <h2 className="section-title" id="best-title">Best margins on {world.name}</h2>
        <p className="meta">After {taxLabel(options.taxRate)} tax at your mastery. Open one, or search for any craftable item.</p>
      </div>
      <ScanTable
        label={`Best margins on ${world.name}`}
        rows={loading ? [] : bestMargins(scan, 5)}
        onOpen={onOpen}
        empty={loading ? 'Loading prices from aion2.exchange.' : 'No recipe has a margin with these prices yet.'}
      />
    </section>
  )
}
