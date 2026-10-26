import type { ReactNode } from 'react'
import type { Pair } from '../state/craftables.ts'
import type { Item, ItemId, PlanResult, Recipe } from '../domain/types.ts'
import type { Planning } from '../state/planning.ts'
import { CostRibbon } from './CostRibbon.tsx'
import type { Segment } from './segments.ts'
import { ItemIcon } from './ItemIcon.tsx'
import { attemptsText, expected, kina, percent, rate, signedKina } from './format.ts'

type Verdict =
  | { kind: 'blocked' }
  | { kind: 'unpriced' }
  | { kind: 'no-market' }
  | { kind: 'compare'; buyTotal: number; gap: number }

function verdictOf(plan: PlanResult, quantity: number): Verdict {
  if (plan.blocked.length > 0) return { kind: 'blocked' }
  if (!Number.isFinite(plan.cost)) return { kind: 'unpriced' }
  if (!plan.market) return { kind: 'no-market' }
  const buyTotal = plan.market.lowest * quantity
  return { kind: 'compare', buyTotal, gap: buyTotal - plan.cost }
}

function soldGap(lowest: number, soldAvg: number) {
  const gap = lowest / soldAvg - 1
  if (Math.abs(gap) < 0.0005) return 'The lowest listing matches it'
  return `The lowest listing is ${percent(Math.abs(gap))} ${gap < 0 ? 'below' : 'above'} it`
}

function sentence(verdict: Verdict, worldName: string) {
  switch (verdict.kind) {
    case 'blocked': return 'Your mastery is too low for at least one step, so there is no cost to compare.'
    case 'unpriced': return 'Add the missing prices below to compare crafting with buying.'
    case 'no-market': return `There is no Market listing to compare with on ${worldName}. Enter a price below to see the margin.`
    case 'compare': {
      const { gap, buyTotal } = verdict
      if (Math.round(gap) === 0) return 'Crafting and buying cost the same.'
      const share = percent(Math.abs(gap) / buyTotal)
      return gap > 0
        ? `Crafting is cheaper than buying by ${kina(gap)} Kina, ${share} under the market price.`
        : `Buying is cheaper than crafting by ${kina(-gap)} Kina. Crafting costs ${share} more than the market price.`
    }
  }
}

interface HeaderProps {
  item: Item
  recipe: Recipe | undefined
  planning: Planning
  pair: Pair | undefined
  onItem(itemId: ItemId): void
}

export function ItemHeader({ item, recipe, planning, pair, onItem }: HeaderProps) {
  const profession = recipe?.profession ?? null
  return (
    <header className="item-head">
      <ItemIcon item={item} size={56} key={item.id} />
      <div className="item-head-text">
        <h2 className="item-name">{item.name}</h2>
        <dl className="facts">
          {profession && <div><dt>Profession</dt><dd>{profession}</dd></div>}
          {recipe && <div><dt>Recipe level</dt><dd className="num">{recipe.masteryLevel}</dd></div>}
          {profession && <div><dt>Your mastery</dt><dd className="num">{planning.mastery[profession]}</dd></div>}
          <div><dt>Grade</dt><dd>{item.grade}</dd></div>
          <div><dt>Item id</dt><dd className="num">{item.id}</dd></div>
        </dl>
      </div>
      {pair && (
        <fieldset className="segmented">
          <legend className="field-label">Result</legend>
          <label>
            <input type="radio" name="result" checked={item.id === pair.normal} onChange={() => onItem(pair.normal)} />
            <span>Normal</span>
          </label>
          <label>
            <input type="radio" name="result" checked={item.id === pair.splendent} onChange={() => onItem(pair.splendent)} />
            <span>Splendent</span>
          </label>
        </fieldset>
      )}
    </header>
  )
}

interface Props {
  plan: PlanResult
  planning: Planning
  quantity: number
  segments: readonly Segment[]
  children?: ReactNode
}

export function Statement({ plan, planning, quantity, segments, children }: Props) {
  const { options, world, catalog } = planning
  const { root, market } = plan
  const verdict = verdictOf(plan, quantity)
  const taxLabel = `${Math.round(options.taxRate * 1000) / 10}%`
  const recipe = catalog.recipes.get(root.recipeId)
  const finite = Number.isFinite(plan.cost)
  const buyTotal = market ? market.lowest * quantity : null
  const netSale = buyTotal === null ? null : buyTotal * (1 - options.taxRate)
  const trigger = recipe?.combo?.chance
  const sameItemCombo = recipe?.combo && recipe.combo.itemId === recipe.product.itemId
  const allBuyGain = Number.isFinite(plan.costAllBuy) && finite ? plan.costAllBuy - plan.cost : null
  const tone = plan.margin === null ? '' : plan.margin >= 0 ? 'is-gain' : 'is-loss'

  return (
    <div className="statement">
      <dl className="figures">
        <div className="figure">
          <dt>Craft it</dt>
          <dd className="figure-value num">{finite ? kina(plan.cost) : 'No total'}{finite && <span className="unit">Kina</span>}</dd>
          <dd className="figure-note">
            {!Number.isFinite(root.attempts) ? 'Needs more mastery' : quantity > 1 && finite ? `${kina(plan.unitCost)} each` : `${attemptsText(root.attempts)} expected`}
          </dd>
        </div>
        <div className="figure">
          <dt>Buy it now</dt>
          <dd className="figure-value num">{buyTotal === null ? 'No listings' : kina(buyTotal)}{buyTotal !== null && <span className="unit">Kina</span>}</dd>
          <dd className="figure-note">
            {market === null ? `None on ${world.name}` : market.listings === 0 ? 'Your price' : `${quantity > 1 ? `${kina(market.lowest)} each, ` : ''}${market.listings} ${market.listings === 1 ? 'listing' : 'listings'} on ${world.name}`}
          </dd>
        </div>
        <div className={`figure ${tone}`}>
          <dt>Margin after {taxLabel} tax</dt>
          <dd className="figure-value num">{signedKina(plan.margin)}{plan.margin !== null && <span className="unit">Kina</span>}</dd>
          <dd className="figure-note">
            {plan.marginPct === null ? 'Needs a market price and a full cost' : `${percent(plan.marginPct, 1, true)} on the cost`}
          </dd>
        </div>
      </dl>

      <p className="verdict">{sentence(verdict, world.name)}</p>

      {children}

      {finite && segments.length > 0 && (
        <CostRibbon
          segments={segments}
          cost={plan.cost}
          buyTotal={buyTotal}
          netSale={netSale}
          taxLabel={taxLabel}
          animateKey={String(root.itemId)}
        />
      )}

      <dl className="rates">
        <div><dt>Success per attempt</dt><dd className="num">{rate(root.successRate)}</dd></div>
        <div>
          <dt>Combo rate</dt>
          <dd className="num">{root.comboRate > 0 ? rate(root.comboRate) : 'No combo'}</dd>
          {trigger !== undefined && <dd className="rate-note">{Math.round(trigger * 100)}% trigger, then the combo success rate</dd>}
        </div>
        <div><dt>Expected attempts</dt><dd className="num">{Number.isFinite(root.attempts) ? expected(root.attempts) : 'n/a'}</dd></div>
        <div><dt>Unit cost</dt><dd className="num">{kina(plan.unitCost)}</dd></div>
        <div>
          <dt>Cost with every material bought</dt>
          <dd className="num">{kina(plan.costAllBuy)}</dd>
          {allBuyGain !== null && (
            <dd className="rate-note">
              {Math.round(allBuyGain) > 0 ? `Crafting parts saves ${kina(allBuyGain)}` : Math.round(allBuyGain) < 0 ? `Crafting parts costs ${kina(-allBuyGain)} more` : 'Same as the ladder'}
            </dd>
          )}
        </div>
        <div>
          <dt>28-day sold average</dt>
          <dd className="num">{market?.soldAvg == null ? 'No sales recorded' : kina(market.soldAvg)}</dd>
          {market?.soldAvg != null && market.lowest > 0 && (
            <dd className="rate-note">{soldGap(market.lowest, market.soldAvg)}</dd>
          )}
        </div>
      </dl>
      {sameItemCombo && recipe?.combo && (
        <p className="field-hint">
          A combo craft gives {recipe.combo.count} instead of {recipe.product.count}, so the attempts above already count it.
        </p>
      )}
    </div>
  )
}
