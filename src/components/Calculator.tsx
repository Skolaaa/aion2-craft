import { useMemo, useState } from 'react'
import type { ItemId } from '../domain/types.ts'
import type { ScanRow } from '../state/scan.ts'
import { planOne, type Planning } from '../state/planning.ts'
import { MAX_QUANTITY, type Target } from '../state/target.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import type { PriceFeed } from '../state/usePrices.ts'
import type { Segment } from './CostRibbon.tsx'
import { ItemIcon } from './ItemIcon.tsx'
import { Ladder } from './Ladder.tsx'
import { NumberField } from './NumberField.tsx'
import { Credit, PriceAge } from './PriceAge.tsx'
import type { Editing } from './PriceEditor.tsx'
import { PlanNotices } from './PlanNotices.tsx'
import { RecipePicker } from './RecipePicker.tsx'
import { ShoppingList } from './ShoppingList.tsx'
import { ItemHeader, Statement } from './Statement.tsx'
import { FACTION } from '../state/setup.ts'
import { kina, percent } from './format.ts'

interface Props {
  planning: Planning
  feed: PriceFeed
  target: Target
  scan: readonly ScanRow[]
  overrides: PriceOverrides
  now: number
  onTarget(change: Partial<Target>): void
}

export function Calculator({ planning, feed, target, scan, overrides, now, onTarget }: Props) {
  const { index, catalog, world } = planning
  const [editing, setEditing] = useState<Editing | null>(null)
  const craftable = target.itemId === null ? null : (index.byId.get(target.itemId) ?? null)
  const awaitingPrices = feed.status === 'loading' && feed.snapshot === null

  const plan = useMemo(
    () => (craftable ? planOne(planning, craftable.item.id, target.quantity) : null),
    [planning, craftable, target.quantity],
  )

  const { segments, ranks } = useMemo(() => {
    const parts: Segment[] = (plan?.root.materials ?? [])
      .filter((line) => Number.isFinite(line.subtotal) && line.subtotal > 0)
      .map((line) => ({ itemId: line.itemId, name: catalog.items.get(line.itemId)?.name ?? String(line.itemId), amount: line.subtotal }))
      .sort((a, b) => b.amount - a.amount)
    return { segments: parts, ranks: new Map(parts.map((part, rank) => [part.itemId, rank])) }
  }, [plan, catalog])

  const top = useMemo(
    () =>
      scan
        .filter((row) => row.status === 'ready' && row.marginPct !== null)
        .sort((a, b) => (b.marginPct ?? 0) - (a.marginPct ?? 0))
        .slice(0, 6),
    [scan],
  )

  return (
    <section className="calculator" aria-label="Calculator">
      <div className="target-bar">
        <RecipePicker craftables={index.craftables} selected={craftable?.item.id ?? null} onPick={(itemId) => onTarget({ itemId })} />
        <NumberField
          id="quantity"
          className="quantity"
          label="Quantity"
          value={target.quantity}
          min={1}
          max={MAX_QUANTITY}
          onChange={(quantity) => onTarget({ quantity })}
        />
      </div>

      {craftable === null && (
        <div className="empty">
          <h2 className="empty-title">Pick an item to price</h2>
          <p>
            Search above for anything you can craft on {FACTION[world.race]} worlds. You get the crafting cost, the market price,
            and the margin after tax at your mastery.
          </p>
          {awaitingPrices ? (
            <p className="empty-line">Loading prices from aion2.exchange.</p>
          ) : top.length > 0 ? (
            <>
              <h3 className="panel-title">Best margins on {world.name} right now</h3>
              <div className="top-head" aria-hidden="true"><span /><span>Item</span><span className="r">Margin</span><span className="r">Cost</span></div>
              <ul className="top-list">
                {top.map((row) => (
                  <li key={row.item.id}>
                    <button type="button" className="top-item" onClick={() => onTarget({ itemId: row.item.id })}>
                      <ItemIcon item={row.item} size={28} />
                      <span className="top-name">{row.item.name}</span>
                      <span className="num is-gain r">{percent(row.marginPct, 1, true)}</span>
                      <span className="num faint r">{kina(row.cost)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      )}

      {craftable !== null && awaitingPrices && (
        <div className="skeleton" role="status">
          <span className="skeleton-bar" />
          <p>Loading prices from aion2.exchange.</p>
        </div>
      )}

      {craftable !== null && !awaitingPrices && plan === null && (
        <div className="empty">
          <h2 className="empty-title">No {FACTION[world.race]} recipe makes {craftable.item.name}</h2>
          <p>Pick another item, or switch to a world of the other faction.</p>
        </div>
      )}

      {craftable !== null && !awaitingPrices && plan !== null && (
        <>
          <section className="panel result" aria-label="Result">
            <ItemHeader
              item={craftable.item}
              recipe={catalog.recipes.get(plan.root.recipeId)}
              planning={planning}
              pair={index.pairOf.get(craftable.item.id)}
              onItem={(itemId: ItemId) => onTarget({ itemId })}
            />
            <Statement plan={plan} planning={planning} quantity={target.quantity} segments={segments}>
              <PlanNotices plan={plan} planning={planning} overrides={overrides} />
            </Statement>
            <footer className="result-foot">
              <PriceAge feed={feed} now={now} />
              <Credit />
            </footer>
          </section>

          <div className="workbench">
            <Ladder
              key={craftable.item.id}
              plan={plan}
              planning={planning}
              overrides={overrides}
              editing={editing}
              ranks={ranks}
              quantity={target.quantity}
              now={now}
              onEdit={setEditing}
            />
            <ShoppingList plan={plan} planning={planning} overrides={overrides} editing={editing} onEdit={setEditing} />
          </div>
        </>
      )}
    </section>
  )
}
