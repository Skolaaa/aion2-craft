import { useMemo, useState } from 'react'
import type { ItemId } from '../domain/types.ts'
import { taxLabel } from '../state/format.ts'
import { planOne, type Planning } from '../state/planning.ts'
import { bestMargins } from '../state/scan.ts'
import type { Target } from '../state/target.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import type { OwnedStock } from '../state/useOwned.ts'
import type { Freshness } from '../state/useFreshness.ts'
import { useScan } from '../state/useScan.ts'
import { AnswerPanel } from './AnswerPanel.tsx'
import { Details, type DetailTab } from './Details.tsx'
import { ScanTable } from './ScanTable.tsx'
import { Search } from './Search.tsx'

interface Props {
  planning: Planning
  freshness: Freshness
  target: Target
  overrides: PriceOverrides
  owned: OwnedStock
  onTarget(change: Partial<Target>): void
}

export function Calculator({ planning, freshness, target, overrides, owned, onTarget }: Props) {
  const { index } = planning
  const [tab, setTab] = useState<DetailTab>('buy')
  const craftable = target.itemId === null ? null : (index.byId.get(target.itemId) ?? null)
  const plan = useMemo(
    () => (craftable ? planOne(planning, craftable.item.id, target.quantity, owned.counts) : null),
    [planning, craftable, target.quantity, owned.counts],
  )

  return (
    <>
      <h1 className="sr-only">Calculator</h1>
      <Search craftables={index.craftables} autoFocus={craftable === null} onPick={(itemId) => onTarget({ itemId })} />
      {craftable === null && <BestMargins planning={planning} loading={freshness.pending} onOpen={(itemId) => onTarget({ itemId })} />}
      {craftable && (
        <>
          <AnswerPanel
            craftable={craftable}
            plan={plan}
            planning={planning}
            freshness={freshness}
            quantity={target.quantity}
            overrides={overrides}
            onTarget={onTarget}
          />
          {plan && !freshness.pending && <Details plan={plan} planning={planning} overrides={overrides} owned={owned} tab={tab} onTab={setTab} />}
        </>
      )}
    </>
  )
}

interface BestProps {
  planning: Planning
  loading: boolean
  onOpen(itemId: ItemId): void
}

function BestMargins({ planning, loading, onOpen }: BestProps) {
  const { world, options } = planning
  const scan = useScan(planning)
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
