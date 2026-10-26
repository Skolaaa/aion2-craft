import { useMemo, useState } from 'react'
import { planOne, type Planning } from '../state/planning.ts'
import type { Target } from '../state/target.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import type { PriceFeed } from '../state/usePrices.ts'
import { AnswerPanel } from './AnswerPanel.tsx'
import { Details, type DetailTab } from './Details.tsx'
import { Search } from './Search.tsx'

interface Props {
  planning: Planning
  feed: PriceFeed
  target: Target
  overrides: PriceOverrides
  now: number
  onTarget(change: Partial<Target>): void
}

export function Calculator({ planning, feed, target, overrides, now, onTarget }: Props) {
  const { index } = planning
  const [tab, setTab] = useState<DetailTab>('buy')
  const craftable = target.itemId === null ? null : (index.byId.get(target.itemId) ?? null)
  const plan = useMemo(
    () => (craftable ? planOne(planning, craftable.item.id, target.quantity) : null),
    [planning, craftable, target.quantity],
  )
  const loading = feed.status === 'loading' && feed.snapshot === null

  return (
    <>
      <h1 className="sr-only">Calculator</h1>
      <Search craftables={index.craftables} autoFocus={craftable === null} onPick={(itemId) => onTarget({ itemId })} />
      {craftable && (
        <>
          <AnswerPanel
            craftable={craftable}
            plan={plan}
            planning={planning}
            feed={feed}
            quantity={target.quantity}
            overrides={overrides}
            now={now}
            onTarget={onTarget}
          />
          {plan && !loading && <Details plan={plan} planning={planning} overrides={overrides} tab={tab} now={now} onTab={setTab} />}
        </>
      )}
    </>
  )
}
