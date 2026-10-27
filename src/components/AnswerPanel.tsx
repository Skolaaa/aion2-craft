import type { ReactNode } from 'react'
import type { ItemId, PlanResult } from '../domain/types.ts'
import { answerOf, sentenceOf, stepSummary, type Answer } from '../state/answer.ts'
import { itemName, type Craftable } from '../state/craftables.ts'
import { kina, plural, signedKina, taxLabel, toneOf } from '../state/format.ts'
import { SIDE } from '../market/worlds.ts'
import type { Planning } from '../state/planning.ts'
import { MAX_QUANTITY, type Target } from '../state/target.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import type { PriceFeed } from '../state/usePrices.ts'
import { NumberInput } from './NumberInput.tsx'
import { HeatChip } from './HeatChip.tsx'
import { ItemIcon } from './ItemIcon.tsx'
import { PriceCell } from './PriceCell.tsx'
import { PriceStatus } from './PriceStatus.tsx'

interface Props {
  craftable: Craftable
  plan: PlanResult | null
  planning: Planning
  feed: PriceFeed
  quantity: number
  overrides: PriceOverrides
  onTarget(change: Partial<Target>): void
}

interface FigureProps {
  label: string
  value: string | null
  empty: string
  tone?: string
  children: ReactNode
}

// Digits read in the mono face, like every other number on the page.
function MonoDigits({ text }: { text: string }) {
  return text.split(/([+−]?\d[\d,.]*%?)/).map((part, index) => (index % 2 === 1 ? <span className="mono" key={index}>{part}</span> : part))
}

function Figure({ label, value, empty, tone, children }: FigureProps) {
  return (
    <div className="figure">
      <dt className="figure-label">{label}</dt>
      <dd className={`figure-value ${value === null ? 'is-empty' : (tone ?? '')}`}>{value ?? empty}</dd>
      <dd className="figure-note meta">{children}</dd>
    </div>
  )
}

export function AnswerPanel({ craftable, plan, planning, feed, quantity, overrides, onTarget }: Props) {
  const { catalog, world, index, mastery, prices } = planning
  const { item } = craftable
  const recipe = plan ? catalog.recipes.get(plan.root.recipeId) : undefined
  const pair = index.pairOf.get(item.id)
  const profession = recipe?.profession ?? craftable.profession
  const level = recipe?.masteryLevel ?? craftable.level
  const facts = [profession ?? 'Any profession', `recipe level ${level}`, item.grade, recipe?.section === 'succession' ? 'transfer' : null]

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
            <fieldset className="segments">
              <legend className="sr-only">Result</legend>
              {(['normal', 'splendent'] as const).map((kind) => (
                <label className="segment" key={kind}>
                  <input type="radio" name="result" checked={item.id === pair[kind]} onChange={() => onTarget({ itemId: pair[kind] })} />
                  {kind === 'normal' ? 'Normal' : 'Splendent'}
                </label>
              ))}
            </fieldset>
          )}
          <div className="qty">
            <label className="lookup-key" htmlFor="quantity">qty</label>
            <NumberInput id="quantity" value={quantity} min={1} max={MAX_QUANTITY} onChange={(next) => onTarget({ quantity: next })} />
          </div>
        </div>
      </header>

      {plan === null ? (
        <p className="verdict">
          No {SIDE[world.race].name} recipe makes {item.name}. Pick another item or a world of the other faction.
        </p>
      ) : feed.pending ? null : (
        <Figures
          answer={answerOf(plan, { catalog, mastery })}
          plan={plan}
          planning={planning}
          stepNote={stepSummary(plan.root, recipe, mastery, 1)}
          onPrice={(price) => overrides.save(item.id, price)}
          ownPrice={prices.quote(item.id).kind === 'manual'}
        />
      )}

      <PriceStatus feed={feed} worldName={world.name} />
    </section>
  )
}

interface FiguresProps {
  answer: Answer
  plan: PlanResult
  planning: Planning
  stepNote: string
  ownPrice: boolean
  onPrice(price: number | null): void
}

function Figures({ answer, plan, planning, stepNote, ownPrice, onPrice }: FiguresProps) {
  const { catalog, world } = planning
  const { taxRate } = planning.options
  const { verdict, craft, buy, margin, marginPct } = answer
  const { market, target } = plan
  const nameOf = (itemId: ItemId) => itemName(catalog, itemId)
  const each = target.quantity > 1

  const craftNote =
    verdict.kind === 'blocked'
      ? `needs ${verdict.profession ?? 'mastery'} ${verdict.level}`
      : craft === null
        ? <span className="is-warn">{plan.missing.length} {plural(plan.missing.length, 'price', 'prices')} missing</span>
        : each
          ? `${kina(plan.unitCost)} each, ${stepNote}`
          : stepNote

  // One keyed editor across the three notes, so focus returns to it after a save.
  const priceEditor = (trigger: string) => (
    <PriceCell key="price" itemName={nameOf(target.itemId)} unit={market?.lowest ?? null} own={ownPrice} onSave={onPrice} trigger={trigger} />
  )

  const buyNote =
    market === null ? (
      <>nothing listed on {world.name}, {priceEditor('enter your price')}</>
    ) : ownPrice ? (
      <>{each ? `${kina(market.lowest)} each, ` : ''}your price, {priceEditor('change it')}</>
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
      <p className="verdict" aria-live="polite"><MonoDigits text={sentenceOf(verdict, { itemName: nameOf, worldName: world.name, taxRate })} /></p>
      <dl className="figures">
        <Figure label="craft" value={craft === null ? null : kina(craft)} empty="No total">{craftNote}</Figure>
        <Figure label="buy" value={buy === null ? null : kina(buy)} empty="No listing">{buyNote}</Figure>
        <Figure label="margin" value={margin === null ? null : signedKina(margin)} empty="No margin" tone={toneOf(margin, 'kina')}>{marginNote}</Figure>
      </dl>
    </>
  )
}
