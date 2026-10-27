import { stepRates, type StepRates } from './rates.ts'
import type {
  Acquisition, Alternative, Catalog, Forced, ItemId, Mastery, Method, Owned, PlanInput, PlanOptions, PlanResult, Price, PriceBook, Recipe, RecipeId,
  StepPlan,
} from './types.ts'

interface Route {
  recipe: Recipe
  wanted: ItemId
}

type Candidate =
  | { kind: 'buy'; unit: number; quote: Price }
  | { kind: 'route'; unit: number; route: Route }

type Choice = Candidate | { kind: 'none'; unit: number }

const NONE: Choice = { kind: 'none', unit: Infinity }

const sum = <T>(list: readonly T[], value: (entry: T) => number) => list.reduce((total, entry) => total + value(entry), 0)
const cheapest = <T extends { unit: number }>(list: T[]) => list.reduce((best, next) => (next.unit < best.unit ? next : best))
const methodOf = (recipe: Recipe) => (recipe.section === 'conversion' ? 'morph' : 'craft')
const candidateMethod = (candidate: Candidate): Method => (candidate.kind === 'buy' ? 'buy' : methodOf(candidate.route.recipe))
const alternativeOf = (candidate: Candidate): Alternative =>
  candidate.kind === 'buy'
    ? { method: 'buy', unit: candidate.unit }
    : { method: methodOf(candidate.route.recipe), unit: candidate.unit, recipeId: candidate.route.recipe.id }

/** The cheapest candidate of each method, in the order the methods were offered. */
function alternativesOf(offered: Candidate[]): Alternative[] {
  const best = new Map<Method, Candidate>()
  for (const candidate of offered) {
    const method = candidateMethod(candidate)
    const held = best.get(method)
    if (!held || candidate.unit < held.unit) best.set(method, candidate)
  }
  return [...best.values()].map(alternativeOf)
}

function outcomes(recipe: Recipe, rates: StepRates) {
  const { product, combo } = recipe
  if (!combo) return [{ itemId: product.itemId, perAttempt: rates.success * product.count }]
  return [
    { itemId: product.itemId, perAttempt: (1 - combo.chance) * rates.success * product.count },
    { itemId: combo.itemId, perAttempt: combo.chance * rates.comboSuccess * combo.count },
  ]
}

const NO_STOCK: Owned = new Map()
const NO_CHOICES: Forced = new Map()

/** The units the plan buys of each item, summed over every step. */
type Demand = ReadonlyMap<ItemId, number>

interface Pass {
  root: StepPlan | null
  alternatives: PlanResult['alternatives']
}

function planner(world: Catalog, mastery: Mastery, options: PlanOptions, prices: PriceBook, owned: Owned, forced: Forced, demand: Demand) {
  const choices = new Map<ItemId, Choice>()
  const alternatives = new Map<ItemId, Alternative[]>()
  const visiting = new Set<ItemId>()
  // Stock is spent in tree order, so a material two steps need shares one budget.
  const stock = new Map(owned)

  const takeStock = (itemId: ItemId, wanted: number) => {
    const held = stock.get(itemId) ?? 0
    const taken = Math.min(held, wanted)
    if (taken > 0) stock.set(itemId, held - taken)
    return taken
  }

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
    const quote = prices.quote(itemId, demand.get(itemId))
    const buy: Candidate | null = quote.kind === 'none' ? null : { kind: 'buy', unit: quote.unit, quote }
    const routes: Candidate[] = routesFor(itemId).map((route) => ({ kind: 'route', unit: routeUnit(route), route }))
    const offered = buy ? [buy, ...routes] : routes
    const want = forced.get(itemId)
    // An explicit choice is narrower than the global switch, so a forced craft or morph competes with that switch off.
    const allowed: Record<Method, boolean> = {
      buy: true,
      craft: options.allowCraft || !buy || want === 'craft',
      morph: options.allowMorph || !buy || want === 'morph',
    }
    const candidates = offered.filter((candidate) => allowed[candidateMethod(candidate)])
    const wanted = candidates.filter((candidate) => candidateMethod(candidate) === want && Number.isFinite(candidate.unit))
    const choice = wanted.length > 0 ? cheapest(wanted) : candidates.length > 0 ? cheapest(candidates) : NONE
    visiting.delete(itemId)
    choices.set(itemId, choice)
    alternatives.set(itemId, alternativesOf(offered))
    return choice
  }

  function acquire(itemId: ItemId, quantity: number): Exclude<Acquisition, { method: 'owned' }> {
    const choice = choose(itemId)
    if (choice.kind === 'none') return { method: 'none' }
    if (choice.kind === 'buy') return { method: 'buy', unit: choice.unit, quote: choice.quote }
    // The built step can cost less than the memoised route when stock covers part of it.
    const step = buildStep(choice.route, quantity)
    return { method: methodOf(choice.route.recipe), unit: step.cost / quantity, step }
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
      const owned = takeStock(ing.itemId, expected)
      const rest = expected - owned
      if (rest <= 1e-9) return { itemId: ing.itemId, perAttempt: ing.count, expected, owned, acquisition: { method: 'owned' } as const, subtotal: 0 }
      const acquisition = acquire(ing.itemId, rest)
      const subtotal = acquisition.method === 'none' ? Infinity : rest * acquisition.unit
      return { itemId: ing.itemId, perAttempt: ing.count, expected, owned, acquisition, subtotal }
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

  return function planRoot(itemId: ItemId, quantity: number): Pass {
    const routes = (world.byProduct.get(itemId) ?? []).map((recipe) => ({ recipe, wanted: itemId }))
    if (routes.length === 0) return { root: null, alternatives }
    const best = cheapest(routes.map((route) => ({ route, unit: routeUnit(route) })))
    return { root: buildStep(best.route, quantity), alternatives }
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
    if (acquisition.method === 'owned') continue
    if (acquisition.method === 'none') leaves.missing.add(line.itemId)
    else if (acquisition.method !== 'buy') collectLeaves(acquisition.step, leaves)
    else {
      const { shopping } = leaves
      const depth = acquisition.quote.kind === 'market' ? acquisition.quote.depth : null
      const entry = shopping.get(line.itemId) ?? { itemId: line.itemId, expected: 0, owned: 0, unit: acquisition.unit, subtotal: 0, depth }
      entry.expected += line.expected
      entry.owned += line.owned
      entry.subtotal += line.subtotal
      shopping.set(line.itemId, entry)
    }
  }
}

function leavesOf(root: StepPlan): Leaves {
  const leaves: Leaves = { shopping: new Map(), missing: new Set(), blocked: new Set() }
  collectLeaves(root, leaves)
  return leaves
}

const demandOf = (root: StepPlan): Demand =>
  new Map([...leavesOf(root).shopping.values()].map(({ itemId, expected, owned }) => [itemId, expected - owned]))

const sameDemand = (a: Demand, b: Demand) => a.size === b.size && [...a].every(([itemId, units]) => Math.abs((b.get(itemId) ?? 0) - units) < 1e-9)

const MAX_PASSES = 4

// Depth-aware prices depend on how many units the plan buys, which depends on the prices, so the plan is
// re-run with the previous pass's demand until it settles. The first pass quotes every item for one unit.
function settle(prices: PriceBook, plan: (demand: Demand) => Pass): Pass {
  const laddered = (demand: Demand) =>
    [...demand].some(([itemId, units]) => {
      const quote = prices.quote(itemId, units)
      return quote.kind === 'market' && quote.depth !== null
    })
  let demand: Demand = new Map()
  let pass = plan(demand)
  for (let count = 1; pass.root && count < MAX_PASSES; count++) {
    const next = demandOf(pass.root)
    // Another pass changes nothing unless a ladder priced the old demand or would price the new one.
    if (sameDemand(next, demand) || !(laddered(next) || laddered(demand))) break
    demand = next
    pass = plan(demand)
  }
  return pass
}

export function planCraft({ target, mastery, options, world, prices, owned = NO_STOCK, forced = NO_CHOICES }: PlanInput): PlanResult | null {
  const { root, alternatives } = settle(prices, (demand) =>
    planner(world, mastery, options, prices, owned, forced, demand)(target.itemId, target.quantity),
  )
  if (!root) return null

  const quote = prices.quote(target.itemId, target.quantity)
  const market =
    quote.kind === 'market' ? { lowest: quote.lowest, soldAvg: quote.soldAvg, listings: quote.listings, cost: quote.unit * target.quantity, depth: quote.depth }
    : quote.kind === 'manual' ? { lowest: quote.unit, soldAvg: null, listings: 0, cost: quote.unit * target.quantity, depth: null }
    : null
  const margin = market && Number.isFinite(root.cost)
    ? market.lowest * (1 - options.taxRate) * target.quantity - root.cost
    : null

  const leaves = leavesOf(root)

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
    alternatives,
  }
}
