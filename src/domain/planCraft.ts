import { stepRates, type StepRates } from './rates.ts'
import type {
  Acquisition, Catalog, ItemId, Mastery, PlanInput, PlanOptions, PlanResult, Price, PriceBook, Recipe, RecipeId, StepPlan,
} from './types.ts'

interface Route {
  recipe: Recipe
  wanted: ItemId
}

type Choice =
  | { kind: 'buy'; unit: number; quote: Price }
  | { kind: 'route'; unit: number; route: Route }
  | { kind: 'none'; unit: number }

const NONE: Choice = { kind: 'none', unit: Infinity }

const sum = <T>(list: readonly T[], value: (entry: T) => number) => list.reduce((total, entry) => total + value(entry), 0)
const cheapest = <T extends { unit: number }>(list: T[]) => list.reduce((best, next) => (next.unit < best.unit ? next : best))
const methodOf = (recipe: Recipe) => (recipe.section === 'conversion' ? 'morph' : 'craft')

function outcomes(recipe: Recipe, rates: StepRates) {
  const { product, combo } = recipe
  if (!combo) return [{ itemId: product.itemId, perAttempt: rates.success * product.count }]
  return [
    { itemId: product.itemId, perAttempt: (1 - combo.chance) * rates.success * product.count },
    { itemId: combo.itemId, perAttempt: combo.chance * rates.comboSuccess * combo.count },
  ]
}

function planner(world: Catalog, mastery: Mastery, options: PlanOptions, prices: PriceBook) {
  const choices = new Map<ItemId, Choice>()
  const visiting = new Set<ItemId>()

  const creditValue = (itemId: ItemId) => {
    if (!options.byproductCredit) return 0
    const quote = prices.quote(itemId)
    return quote.kind === 'market' || quote.kind === 'manual' ? quote.unit * (1 - options.taxRate) : 0
  }

  const routesFor = (itemId: ItemId): Route[] => {
    const routes = (world.byProduct.get(itemId) ?? []).map((recipe) => ({ recipe, wanted: itemId }))
    const bound = world.boundOf.get(itemId)
    if (bound === undefined) return routes
    const morphs = (world.byProduct.get(bound) ?? []).filter((recipe) => recipe.section === 'conversion')
    return [...routes, ...morphs.map((recipe) => ({ recipe, wanted: bound }))]
  }

  const routeUnit = ({ recipe, wanted }: Route) => {
    const rates = stepRates(recipe, mastery, world)
    if (rates.success === 0) return Infinity
    const results = outcomes(recipe, rates)
    const made = sum(results.filter((o) => o.itemId === wanted), (o) => o.perAttempt)
    const inputs = sum(recipe.ingredients, (ing) => ing.count * choose(ing.itemId).unit)
    const credit = sum(results.filter((o) => o.itemId !== wanted), (o) => o.perAttempt * creditValue(o.itemId))
    return (inputs - credit) / made
  }

  function choose(itemId: ItemId): Choice {
    const known = choices.get(itemId)
    if (known) return known
    if (visiting.has(itemId)) return NONE
    visiting.add(itemId)
    const quote = prices.quote(itemId)
    const buy: Choice | null = quote.kind === 'none' ? null : { kind: 'buy', unit: quote.unit, quote }
    const allowed = { craft: options.allowCraft || !buy, morph: options.allowMorph || !buy }
    const routes: Choice[] = routesFor(itemId)
      .filter((route) => allowed[methodOf(route.recipe)])
      .map((route) => ({ kind: 'route', unit: routeUnit(route), route }))
    const candidates = buy ? [buy, ...routes] : routes
    const choice = candidates.length > 0 ? cheapest(candidates) : NONE
    visiting.delete(itemId)
    choices.set(itemId, choice)
    return choice
  }

  function acquire(itemId: ItemId, quantity: number): Acquisition {
    const choice = choose(itemId)
    if (choice.kind === 'none') return { method: 'none' }
    if (choice.kind === 'buy') return { method: 'buy', unit: choice.unit, quote: choice.quote }
    return { method: methodOf(choice.route.recipe), unit: choice.unit, step: buildStep(choice.route, quantity) }
  }

  function buildStep(route: Route, outputs: number): StepPlan {
    const { recipe, wanted } = route
    const rates = stepRates(recipe, mastery, world)
    const step = {
      recipeId: recipe.id,
      itemId: wanted,
      outputs,
      wantCombo: recipe.combo?.itemId === wanted && recipe.product.itemId !== wanted,
      levelDiff: rates.levelDiff,
      successRate: rates.success,
      comboRate: recipe.combo ? recipe.combo.chance * rates.comboSuccess : 0,
      rateSource: rates.source,
    }
    if (rates.success === 0) return { ...step, attempts: Infinity, materials: [], byproducts: [], cost: Infinity }

    const results = outcomes(recipe, rates)
    const attempts = outputs / sum(results.filter((o) => o.itemId === wanted), (o) => o.perAttempt)
    const materials = recipe.ingredients.map((ing) => {
      const expected = attempts * ing.count
      const acquisition = acquire(ing.itemId, expected)
      const subtotal = acquisition.method === 'none' ? Infinity : expected * acquisition.unit
      return { itemId: ing.itemId, perAttempt: ing.count, expected, acquisition, subtotal }
    })
    const byproducts = results
      .filter((o) => o.itemId !== wanted)
      .map((o) => {
        const expected = attempts * o.perAttempt
        return { itemId: o.itemId, expected, credit: expected * creditValue(o.itemId) }
      })
    const cost = sum(materials, (m) => m.subtotal) - sum(byproducts, (b) => b.credit)
    return { ...step, attempts, materials, byproducts, cost }
  }

  return function planRoot(itemId: ItemId, quantity: number): StepPlan | null {
    const routes = (world.byProduct.get(itemId) ?? []).map((recipe) => ({ recipe, wanted: itemId }))
    if (routes.length === 0) return null
    const best = cheapest(routes.map((route) => ({ route, unit: routeUnit(route) })))
    return buildStep(best.route, quantity)
  }
}

interface Leaves {
  shopping: Map<ItemId, PlanResult['shopping'][number]>
  missing: Set<ItemId>
  blocked: Set<RecipeId>
}

function collectLeaves(step: StepPlan, leaves: Leaves) {
  if (step.successRate === 0) leaves.blocked.add(step.recipeId)
  for (const line of step.materials) {
    const { acquisition } = line
    if (acquisition.method === 'none') leaves.missing.add(line.itemId)
    else if (acquisition.method !== 'buy') collectLeaves(acquisition.step, leaves)
    else {
      const { shopping } = leaves
      const entry = shopping.get(line.itemId) ?? { itemId: line.itemId, expected: 0, unit: acquisition.unit, subtotal: 0 }
      entry.expected += line.expected
      entry.subtotal += line.subtotal
      shopping.set(line.itemId, entry)
    }
  }
}

export function planCraft({ target, mastery, options, world, prices }: PlanInput): PlanResult | null {
  const root = planner(world, mastery, options, prices)(target.itemId, target.quantity)
  if (!root) return null

  const quote = prices.quote(target.itemId)
  const market =
    quote.kind === 'market' ? { lowest: quote.unit, soldAvg: quote.soldAvg, listings: quote.listings }
    : quote.kind === 'manual' ? { lowest: quote.unit, soldAvg: null, listings: 0 }
    : null
  const margin = market && Number.isFinite(root.cost)
    ? market.lowest * (1 - options.taxRate) * target.quantity - root.cost
    : null

  const leaves: Leaves = { shopping: new Map(), missing: new Set(), blocked: new Set() }
  collectLeaves(root, leaves)

  return {
    target,
    root,
    cost: root.cost,
    unitCost: root.cost / target.quantity,
    market,
    margin,
    marginPct: margin !== null && root.cost > 0 ? margin / root.cost : null,
    shopping: [...leaves.shopping.values()].sort((a, b) => b.subtotal - a.subtotal),
    missing: [...leaves.missing],
    blocked: [...leaves.blocked],
  }
}
