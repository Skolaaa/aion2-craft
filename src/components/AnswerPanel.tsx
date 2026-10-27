import type { ReactNode } from 'react'
import type { ItemId, PlanResult } from '../domain/types.ts'
import { answerOf, depthCapturedAt, depthNote, sentenceOf, stepSummary, usesStock, type Answer } from '../state/answer.ts'
import { itemName, type Craftable } from '../state/craftables.ts'
import { kina, plural, signedKina, taxLabel, toneOf } from '../state/format.ts'
import { gradeName } from '../state/grade.ts'
import { SIDE } from '../market/worlds.ts'
import type { OpenSetting } from '../state/openSetting.ts'
import type { Planning } from '../state/planning.ts'
import { MAX_QUANTITY, type Target } from '../state/target.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import type { Freshness } from '../state/useFreshness.ts'
import { Figure, typeset } from './Figure.tsx'
import { NumberInput } from './NumberInput.tsx'
import { HeatChip } from './HeatChip.tsx'
import { ItemIcon } from './ItemIcon.tsx'
import { PriceCell } from './PriceCell.tsx'
import { PriceStatus } from './PriceStatus.tsx'
import { Segmented } from './Segmented.tsx'
import { Sparkline } from './Sparkline.tsx'

interface Props {
  craftable: Craftable
  plan: PlanResult | null
  planning: Planning
  freshness: Freshness
  quantity: number
  overrides: PriceOverrides
  /** Opens the price history from the sparkline. */
  surface: Pick<OpenSetting, 'opened' | 'open'>
  onTarget(change: Partial<Target>): void
  /** Rendered last among the controls, after the quantity. */
  after?: ReactNode
}

export function AnswerPanel({ craftable, plan, planning, freshness, quantity, overrides, surface, onTarget, after }: Props) {
  const { catalog, world, index, mastery, prices } = planning
  const { item } = craftable
  const recipe = plan ? catalog.recipes.get(plan.targets[0].root.recipeId) : undefined
  const pair = index.pairOf.get(item.id)
  const profession = recipe?.profession ?? craftable.profession
  const level = recipe?.masteryLevel ?? craftable.level
  const facts = [profession ?? 'Any profession', `recipe level ${level}`, gradeName(item.grade), recipe?.section === 'succession' ? 'transfer' : null]

  return (
    <section className="answer" aria-labelledby="answer-name">
      <header className="answer-head" data-grade={item.grade}>
        <ItemIcon item={item} size={48} />
        <div className="answer-title">
          <h2 className="item-name" id="answer-name">{item.name}</h2>
          <p className="meta">{facts.filter(Boolean).join(', ')}</p>
        </div>
        <div className="answer-controls">
          {pair && (
            <Segmented
              label="Result"
              options={[{ value: pair.normal, label: 'Normal' }, { value: pair.splendent, label: 'Splendent' }]}
              value={item.id}
              onChange={(itemId) => onTarget({ itemId })}
            />
          )}
          <div className="qty">
            <label className="lookup-key" htmlFor="quantity">qty</label>
            <NumberInput id="quantity" value={quantity} min={1} max={MAX_QUANTITY} onChange={(next) => onTarget({ quantity: next })} />
          </div>
          {after}
        </div>
      </header>

      {plan === null ? (
        <p className="verdict">
          No {SIDE[world.race].name} recipe makes {item.name}. Pick another item or a world of the other faction.
        </p>
      ) : freshness.pending ? null : (
        <Figures
          answer={answerOf(plan, { catalog, mastery })}
          plan={plan}
          planning={planning}
          stepNote={stepSummary(plan.targets[0].root, recipe, mastery, 1)}
          surface={surface}
          onPrice={(price) => overrides.save(item.id, price)}
          ownPrice={prices.quote(item.id).kind === 'manual'}
        />
      )}

      <PriceStatus freshness={freshness} worldName={world.name} depthCapturedAt={plan ? depthCapturedAt(plan) : null} />
    </section>
  )
}

interface FiguresProps {
  answer: Answer
  plan: PlanResult
  planning: Planning
  stepNote: string
  ownPrice: boolean
  surface: Pick<OpenSetting, 'opened' | 'open'>
  onPrice(price: number | null): void
}

function Figures({ answer, plan, planning, stepNote, ownPrice, surface, onPrice }: FiguresProps) {
  const { catalog, world } = planning
  const { taxRate } = planning.options
  const { verdict, craft, buy, margin, marginPct } = answer
  const [{ itemId, quantity, unitCost, market }] = plan.targets
  const nameOf = (itemId: ItemId) => itemName(catalog, itemId)
  const each = quantity > 1

  const craftNote =
    verdict.kind === 'blocked'
      ? `needs ${verdict.profession ?? 'mastery'} ${verdict.level}`
      : craft === null
        ? <span className="is-warn">{plan.missing.length} {plural(plan.missing.length, 'price', 'prices')} missing</span>
        : `${each ? `${kina(unitCost)} each, ` : ''}${stepNote}${usesStock(plan) ? ', what you hold counted as free' : ''}`

  // One keyed editor across the three notes, so focus returns to it after a save.
  const priceEditor = (trigger: string) => (
    <PriceCell key="price" itemName={nameOf(itemId)} unit={market?.lowest ?? null} own={ownPrice} onSave={onPrice} trigger={trigger} />
  )

  const buyNote =
    market === null ? (
      <>nothing listed on {world.name}, {priceEditor('enter your price')}</>
    ) : ownPrice ? (
      <>{each ? `${kina(market.lowest)} each, ` : ''}your price, {priceEditor('change it')}</>
    ) : market.depth ? (
      <>{kina(market.cost / quantity)} each {depthNote(market.depth)}</>
    ) : (
      <>
        {each ? `${kina(market.lowest)} each, ` : ''}
        {market.listings === 1 ? 'the only listing' : `lowest of ${market.listings} listings`}
      </>
    )

  const marginNote =
    marginPct !== null
      ? <><HeatChip marginPct={marginPct} /> after {taxLabel(taxRate)} tax</>
      : craft === null
        ? 'needs a craft cost'
        : buy === null
          ? 'needs a listing or your price'
          : `after ${taxLabel(taxRate)} tax`

  return (
    <>
      <p className="verdict" aria-live="polite">{typeset(sentenceOf(verdict, { itemName: nameOf, worldName: world.name, taxRate }))}</p>
      <dl className="figures">
        <Figure label="craft" value={craft === null ? null : kina(craft)} empty="No total">{craftNote}</Figure>
        <Figure label="buy" value={buy === null ? null : kina(buy)} empty="No listing">
          {buyNote}
          {market !== null && <Sparkline itemId={itemId} worldId={world.id} surface={surface} />}
        </Figure>
        <Figure label="margin" value={margin === null ? null : signedKina(margin)} empty="No margin" tone={toneOf(margin, 'kina')}>{marginNote}</Figure>
      </dl>
    </>
  )
}
