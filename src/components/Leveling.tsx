import { useDeferredValue, useMemo } from 'react'
import { planLeveling, type LevelingSegment } from '../domain/leveling.ts'
import type { Item, Recipe } from '../domain/types.ts'
import { MASTERY_EXP } from '../data/mastery.ts'
import { decimal, kina, signedKina, taxLabel, toneOf } from '../state/format.ts'
import { DEFAULT_LEVELING, expOf, levelRange, levelingCandidates, netKinaPerAttempt, parseLevelingView } from '../state/leveling.ts'
import { itemName } from '../state/craftables.ts'
import type { Planning } from '../state/planning.ts'
import { PROFESSIONS } from '../state/setup.ts'
import { useCraftExp } from '../state/useCraftExp.ts'
import type { Freshness } from '../state/useFreshness.ts'
import { useNarrow } from '../state/useNarrow.ts'
import { usePersistentState } from '../state/usePersistentState.ts'
import { ExpCell } from './ExpCell.tsx'
import { ItemCell } from './ItemCell.tsx'
import { NumberInput } from './NumberInput.tsx'
import { PriceStatus } from './PriceStatus.tsx'
import { Segmented } from './Segmented.tsx'
import { Table, type Column } from './Table.tsx'

interface Props {
  planning: Planning
  freshness: Freshness
}

interface Step extends LevelingSegment {
  item: Item | undefined
  crafts: number
}

type RouteKey = 'recipe' | 'crafts' | 'kina' | 'perExp' | 'exp'
type ExpKey = 'recipe' | 'exp' | 'source'

const MINUS = '−'

// Kina spent is positive. A negative figure is a gain, so it reads signed and in the gain tone.
function spent(value: number) {
  return Math.round(value) < 0 ? <span className={toneOf(-value, 'kina')}>{signedKina(value)}</span> : kina(value)
}

const perExp = (spentKina: number, exp: number) => (exp > 0 ? decimal(spentKina / exp, 1).replace('-', MINUS) : null)

export function Leveling({ planning, freshness }: Props) {
  const { world, catalog, options } = planning
  const craftExp = useCraftExp()
  const narrow = useNarrow()
  const [view, update] = usePersistentState('leveling', DEFAULT_LEVELING, parseLevelingView)
  const { profession, sell } = view
  const { from, to } = levelRange(view, planning.mastery)
  const label = PROFESSIONS.find(({ id }) => id === profession)?.label ?? profession

  const setFrom = (next: number) =>
    update((previous) => ({ ...previous, from: next, to: Math.max(levelRange(previous, planning.mastery).to, next + 1) }))
  // Typing "70" passes through 7, so a level at or under `from` is left out rather than dragging `from` down with it.
  const setTo = (next: number) =>
    update((previous) => {
      const range = levelRange(previous, planning.mastery)
      return next > range.from ? { ...previous, from: range.from, to: next } : previous
    })

  const deferred = useDeferredValue(planning)
  const { yours } = craftExp
  const plan = useMemo(() => {
    const candidates = levelingCandidates(deferred, profession, yours)
    const byId = new Map(candidates.map((recipe) => [recipe.id, recipe]))
    return {
      candidates,
      result: planLeveling({
        profession,
        from,
        to,
        mastery: deferred.mastery,
        catalog: deferred.catalog,
        table: MASTERY_EXP,
        candidates,
        expOf: (recipeId) => expOf(deferred.catalog, yours, recipeId) ?? 0,
        kinaPerAttempt: (recipeId, level) => {
          const recipe = byId.get(recipeId)
          return recipe ? netKinaPerAttempt(deferred, recipe, level, sell) : Infinity
        },
      }),
    }
  }, [deferred, profession, from, to, sell, yours])

  const loading = freshness.pending
  const { result } = plan
  const steps = useMemo<Step[]>(
    () =>
      loading
        ? []
        : result.segments.map((segment) => {
            const recipe = catalog.recipes.get(segment.recipeId)
            return { ...segment, item: recipe && catalog.items.get(recipe.product.itemId), crafts: Math.ceil(segment.attempts) }
          }),
    [loading, result, catalog],
  )
  const crafts = steps.reduce((sum, step) => sum + step.crafts, 0)
  const { stuckAt } = result
  const unpriced = stuckAt !== null && plan.candidates.some((recipe) => recipe.masteryLevel <= stuckAt)

  const routeColumns: Column<Step, RouteKey>[] = [
    {
      key: 'recipe',
      header: 'Recipe',
      render: (step) => <ItemCell item={step.item} meta={<span className="mono">level {step.from} to {step.to}</span>} />,
    },
    { key: 'crafts', header: 'Crafts', numeric: true, width: narrow ? 72 : undefined, render: (step) => kina(step.crafts) },
    { key: 'kina', header: 'Kina', numeric: true, width: narrow ? 110 : undefined, render: (step) => spent(step.kina) },
    { key: 'perExp', header: 'Kina per EXP', numeric: true, hideNarrow: true, render: (step) => perExp(step.kina, step.exp) },
    { key: 'exp', header: 'EXP', numeric: true, hideNarrow: true, render: (step) => kina(step.exp) },
  ]

  const known = useMemo(
    () =>
      [...catalog.recipes.values()]
        .filter((recipe) => recipe.section === 'craft' && recipe.profession === profession && recipe.masteryLevel >= 1 && recipe.masteryLevel < to)
        .sort((a, b) => a.masteryLevel - b.masteryLevel || a.id - b.id),
    [catalog, profession, to],
  )

  const expColumns: Column<Recipe, ExpKey>[] = [
    {
      key: 'recipe',
      header: 'Recipe',
      render: (recipe) => (
        <ItemCell
          item={catalog.items.get(recipe.product.itemId)}
          meta={
            <span className="mono">
              level {recipe.masteryLevel}
              {recipe.product.count > 1 && `, makes ${recipe.product.count}`}
            </span>
          }
        />
      ),
    },
    {
      key: 'exp',
      header: 'EXP',
      numeric: true,
      width: narrow ? 100 : undefined,
      render: (recipe) => {
        const name = itemName(catalog, recipe.product.itemId)
        return (
          <ExpCell
            recipeName={recipe.product.count > 1 ? `${name} (makes ${recipe.product.count})` : name}
            exp={expOf(catalog, yours, recipe.id)}
            yours={yours.has(recipe.id)}
            onSave={(exp) => craftExp.save(recipe.id, exp)}
          />
        )
      },
    },
    {
      key: 'source',
      header: 'Source',
      hideNarrow: true,
      render: (recipe) => <span className="meta">{yours.has(recipe.id) ? 'yours' : catalog.craftExp.has(recipe.id) ? 'measured' : 'unknown'}</span>,
    },
  ]

  return (
    <section className="stack leveling" aria-labelledby="leveling-title">
      <div className="stack-tight">
        <h1 className="section-title" id="leveling-title"><span>Level a profession on {world.name}</span></h1>
        {!narrow && <PriceStatus freshness={freshness} worldName={world.name} />}
      </div>

      <div className="leveling-controls">
        <Segmented
          label="Profession"
          options={PROFESSIONS.map(({ id, label: name }) => ({ value: id, label: name }))}
          value={profession}
          onChange={(id) => update((previous) => ({ ...previous, profession: id, from: null, to: null }))}
        />
        <div className="leveling-fields">
          <label className="leveling-field" htmlFor="leveling-from">
            <span className="lookup-key">from</span>
            <NumberInput id="leveling-from" value={from} min={1} max={99} onChange={setFrom} />
          </label>
          <label className="leveling-field" htmlFor="leveling-to">
            <span className="lookup-key">to</span>
            <NumberInput id="leveling-to" value={to} min={2} max={100} onChange={setTo} />
          </label>
          <label className="check">
            <input type="checkbox" checked={sell} onChange={(event) => update((previous) => ({ ...previous, sell: event.target.checked }))} />
            <span>Count selling what you make</span>
          </label>
        </div>
      </div>

      <div className="stack-tight">
        <p className="meta">
          Prices on {world.name} after {taxLabel(options.taxRate)} tax at each level's success rate. Single crafts only, a batch of ten gives less EXP.
        </p>
        {!loading && result.quest && <p className="meta">Level 50 needs the profession's upgrade quest before you can go on.</p>}
        {!loading && stuckAt !== null && (
          <p className="meta">
            {unpriced
              ? `The route stops at level ${stuckAt}: the recipes with a known EXP that unlock by then have no price. Enter the EXP of another recipe below.`
              : `The route stops at level ${stuckAt}: no recipe with a known EXP unlocks there. Enter the EXP of one that does below.`}
          </p>
        )}
        <Table
          className="leveling-table"
          label={`Route from ${from} to ${to}`}
          columns={routeColumns}
          rows={steps}
          rowKey={(step) => `${step.recipeId}-${step.from}`}
          footer={
            steps.length === 0
              ? undefined
              : [{ recipe: 'Total', crafts: kina(crafts), kina: spent(result.kina), perExp: perExp(result.kina, result.exp), exp: kina(result.exp) }]
          }
          empty={loading ? 'Loading prices from aion2.exchange.' : `No recipe of ${label} has a known EXP yet. Enter one below.`}
        />
      </div>

      <section className="stack" aria-labelledby="leveling-exp-title">
        <div className="stack-tight">
          <h2 className="section-title" id="leveling-exp-title"><span>EXP per craft</span></h2>
          <p className="meta">
            The game shows the mastery EXP after each craft. Enter it for a recipe and the route uses it. Measured values come from the Korean client, whose mastery table matches.
          </p>
        </div>
        <Table
          className="leveling-table exp-table"
          label="EXP per craft"
          columns={expColumns}
          rows={known}
          rowKey={(recipe) => String(recipe.id)}
          empty={`No recipe of ${label} unlocks below level ${to}.`}
        />
      </section>
    </section>
  )
}
