import { useId, useMemo, useState } from 'react'
import { costAtRisk, type CostAtRisk } from '../domain/costAtRisk.ts'
import type { ItemId, PlanResult, TargetPlan } from '../domain/types.ts'
import { answerOf, depthCapturedAt, listSentenceOf, lockedStep, riskNote, stepCount, stepSummary, targetStatus, usesStock, type Answer } from '../state/answer.ts'
import { itemName } from '../state/craftables.ts'
import { kina, plural, signedKina, taxLabel, toneOf } from '../state/format.ts'
import type { ListState } from '../state/list.ts'
import { planWanted, type Planning } from '../state/planning.ts'
import { MAX_QUANTITY, type View } from '../state/target.ts'
import type { Freshness } from '../state/useFreshness.ts'
import { useBulkLadders } from '../state/useLadders.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import type { OwnedStock } from '../state/useOwned.ts'
import type { Sources } from '../state/useSources.ts'
import { Button } from './Button.tsx'
import { Details, type DetailTab } from './Details.tsx'
import { Figure, typeset } from './Figure.tsx'
import { HeatChip } from './HeatChip.tsx'
import { ItemCell } from './ItemCell.tsx'
import { NumberInput } from './NumberInput.tsx'
import { PriceStatus } from './PriceStatus.tsx'
import { Table, type Column } from './Table.tsx'

interface Props {
  planning: Planning
  freshness: Freshness
  requestLadders(itemIds: readonly ItemId[]): void
  list: ListState
  overrides: PriceOverrides
  owned: OwnedStock
  sources: Sources
  link: string
  onOpen(itemId: ItemId, quantity: number): void
  onView(view: View): void
}

/** The third view: what is on the list, the craft, buy and margin for all of it, and the same tabs as the calculator over the merged plan. */
export function ListView({ planning, freshness, requestLadders, list, overrides, owned, sources, link, onOpen, onView }: Props) {
  const { world } = planning
  const [tab, setTab] = useState<DetailTab>('buy')
  const plan = useMemo(
    () => (list.wanted.size > 0 ? planWanted(planning, list.wanted, owned.counts, sources.choices) : null),
    [planning, list.wanted, owned.counts, sources.choices],
  )
  const risk = useMemo(
    () => (plan && Number.isFinite(plan.cost) ? costAtRisk(plan, { catalog: planning.catalog, owned: owned.counts }) : null),
    [plan, planning.catalog, owned.counts],
  )
  useBulkLadders(plan, planning.prices, freshness, requestLadders)

  return (
    <section className="stack" aria-labelledby="list-title">
      <div className="stack-tight">
        <h1 className="section-title" id="list-title"><span>Your list on {world.name}</span></h1>
        <p className="meta">
          {plan === null
            ? 'Nothing on it yet. Open an item in the calculator and choose Add to list.'
            : 'Planned together, top to bottom. What you hold is spent once, bulk prices follow the total you buy, and a list item never feeds another.'}
        </p>
        {plan && <PriceStatus freshness={freshness} worldName={world.name} depthCapturedAt={depthCapturedAt(plan)} />}
      </div>
      {plan === null ? (
        <div>
          <Button onClick={() => onView('calculator')}>Open the calculator</Button>
        </div>
      ) : (
        <>
          <Lines plan={plan} planning={planning} list={list} onOpen={onOpen} />
          {!freshness.pending && <ListFigures plan={plan} risk={risk} planning={planning} />}
          {!freshness.pending && (
            <Details plan={plan} planning={planning} overrides={overrides} owned={owned} sources={sources} link={link} tab={tab} onTab={setTab} />
          )}
        </>
      )}
    </section>
  )
}

interface LinesProps {
  plan: PlanResult
  planning: Planning
  list: ListState
  onOpen(itemId: ItemId, quantity: number): void
}

function Lines({ plan, planning, list, onOpen }: LinesProps) {
  const base = useId()
  const { catalog, mastery } = planning
  const recipeOf = (root: TargetPlan['root']) => catalog.recipes.get(root.recipeId)

  const note = (row: TargetPlan) => {
    const status = targetStatus(row)
    if (status === 'ready') return stepSummary(row.root, recipeOf(row.root), mastery, 1)
    const locked = lockedStep(row.root)
    return <span className="is-warn">{locked ? stepSummary(locked, recipeOf(locked), mastery) : 'a price is missing'}</span>
  }

  const columns: Column<TargetPlan>[] = [
    {
      key: 'item',
      header: 'Item',
      render: (row) => (
        <ItemCell
          item={catalog.items.get(row.itemId)}
          meta={note(row)}
          narrowMeta={Number.isFinite(row.cost) ? `${kina(row.cost)} Kina` : undefined}
          onOpen={() => onOpen(row.itemId, row.quantity)}
        />
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      numeric: true,
      render: (row) => (
        <NumberInput
          id={`${base}-${row.itemId}`}
          label={`Quantity of ${itemName(catalog, row.itemId)}`}
          value={row.quantity}
          min={1}
          max={MAX_QUANTITY}
          onChange={(quantity) => list.save(row.itemId, quantity)}
        />
      ),
    },
    { key: 'cost', header: 'Cost', numeric: true, hideNarrow: true, render: (row) => (Number.isFinite(row.cost) ? kina(row.cost) : null) },
    {
      key: 'remove',
      header: '',
      render: (row) => (
        <Button className="button-small" aria-label={`Remove ${itemName(catalog, row.itemId)} from the list`} onClick={() => list.save(row.itemId, null)}>
          Remove
        </Button>
      ),
    },
  ]

  return (
    <div className="list-lines">
      <Table label="Your list" columns={columns} rows={plan.targets} rowKey={(row) => String(row.itemId)} />
      {plan.targets.length > 1 && (
        <div className="panel-tools">
          <span className="meta">Earlier lines draw on your stock first. The total does not depend on the order.</span>
          <Button className="button-small" onClick={list.resetAll}>Clear list</Button>
        </div>
      )}
    </div>
  )
}

function ListFigures({ plan, risk, planning }: { plan: PlanResult; risk: CostAtRisk | null; planning: Planning }) {
  const { catalog, mastery, world, options } = planning
  const { taxRate } = options
  const answer: Answer = answerOf(plan, { catalog, mastery })
  const { verdict, craft, buy, margin, marginPct } = answer
  const nameOf = (itemId: ItemId) => itemName(catalog, itemId)
  const count = plan.targets.length
  const unlisted = plan.targets.filter((target) => target.market === null)

  const craftNote =
    verdict.kind === 'blocked'
      ? `needs ${verdict.profession ?? 'mastery'} ${verdict.level}`
      : craft === null
        ? <span className="is-warn">{plan.missing.length} {plural(plan.missing.length, 'price', 'prices')} missing</span>
        : `${count} ${plural(count, 'item', 'items')} over ${stepCount(plan)} ${plural(stepCount(plan), 'step', 'steps')}${usesStock(plan) ? ', what you hold counted as free' : ''}`

  const buyNote =
    buy === null
      ? unlisted.length === 1 ? `${nameOf(unlisted[0].itemId)} has no listing on ${world.name}` : `${unlisted.length} items have no listing on ${world.name}`
      : plan.targets.some((target) => target.market?.depth)
        ? 'along the listing ladder where you buy several'
        : `lowest listings, one per item`

  const marginNote =
    marginPct !== null
      ? <><HeatChip marginPct={marginPct} /> after {taxLabel(taxRate)} tax</>
      : craft === null
        ? 'needs a craft cost'
        : 'needs a listing for every item'

  return (
    <div className="stack-tight">
      <p className="verdict" aria-live="polite">{typeset(listSentenceOf(plan, verdict, { itemName: nameOf, worldName: world.name, taxRate }))}</p>
      <dl className="figures">
        <Figure label="craft" value={craft === null ? null : kina(craft)} empty="No total" sub={riskNote(risk)}>{craftNote}</Figure>
        <Figure label="buy" value={buy === null ? null : kina(buy)} empty="No total">{buyNote}</Figure>
        <Figure label="margin" value={margin === null ? null : signedKina(margin)} empty="No margin" tone={toneOf(margin, 'kina')}>{marginNote}</Figure>
      </dl>
    </div>
  )
}
