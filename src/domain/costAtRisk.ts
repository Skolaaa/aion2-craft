import type { Catalog, ItemId, Owned, PlanResult, StepPlan } from './types.ts'

export interface RiskContext {
  catalog: Catalog
  owned?: Owned
  runs?: number
  seed?: number
}

export interface CostAtRisk {
  /** The cost that `share` of simulated runs come in at or under. Infinity when the plan's cost is. */
  cost: number
  /** Per target, in `plan.targets` order: the root step's attempts at the same share. */
  attempts: readonly number[]
  share: 0.9
  runs: number
}

const SHARE = 0.9
const DEFAULT_RUNS = 1000
const DEFAULT_SEED = 0x2545f491
/** Above this many expected attempts a step is sampled from the renewal normal approximation instead of attempt by attempt. */
const EXACT_LIMIT = 2000

const NO_STOCK: Owned = new Map()

/** mulberry32: a 32-bit seeded generator, so the same plan gives the same number on every render and in tests. */
function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** What one attempt of a step yields of the step's wanted item: the normal result and the combo result, each with its probability. */
interface Yield {
  product: { chance: number; count: number }
  combo: { chance: number; count: number }
  mean: number
  variance: number
  maxCount: number
}

function yieldOf(step: StepPlan, catalog: Catalog): Yield | null {
  const recipe = catalog.recipes.get(step.recipeId)
  if (!recipe || step.successRate === 0) return null
  const product = {
    chance: recipe.combo ? (1 - recipe.combo.chance) * step.successRate : step.successRate,
    count: recipe.product.itemId === step.itemId ? recipe.product.count : 0,
  }
  const combo = { chance: recipe.combo ? step.comboRate : 0, count: recipe.combo?.itemId === step.itemId ? recipe.combo.count : 0 }
  const mean = product.chance * product.count + combo.chance * combo.count
  if (mean <= 0) return null
  const variance = product.chance * product.count ** 2 + combo.chance * combo.count ** 2 - mean ** 2
  return { product, combo, mean, variance, maxCount: Math.max(product.count, combo.count) }
}

/** The attempts one run takes to make `needed` units: exact while the step is small, the renewal normal approximation above EXACT_LIMIT. */
function sampleAttempts(outcome: Yield, needed: number, random: () => number): number {
  const { product, combo, mean, variance, maxCount } = outcome
  const expected = needed / mean
  if (expected <= EXACT_LIMIT) {
    let attempts = 0
    for (let made = 0; made < needed; attempts++) {
      const roll = random()
      made += roll < product.chance ? product.count : roll < product.chance + combo.chance ? combo.count : 0
    }
    return attempts
  }
  const deviation = Math.sqrt((needed * variance) / mean ** 3)
  const normal = Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
  return Math.max(Math.ceil(needed / maxCount), Math.round(expected + deviation * normal))
}

const quantile = (values: number[]) => {
  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  return sorted[Math.ceil(SHARE * sorted.length) - 1]
}

/**
 * The cost `share` of simulated runs come in at or under. Each run replays the plan with its choices fixed,
 * rolling every step's attempts and spending the player's stock in the same tree order as the planner.
 */
export function costAtRisk(plan: PlanResult, { catalog, owned = NO_STOCK, runs = DEFAULT_RUNS, seed = DEFAULT_SEED }: RiskContext): CostAtRisk {
  const random = mulberry32(seed)
  const yields = new Map<StepPlan, Yield | null>()
  const yieldFor = (step: StepPlan) => {
    if (!yields.has(step)) yields.set(step, yieldOf(step, catalog))
    return yields.get(step) ?? null
  }
  // A line stock covered in full has no price of its own, so a run that outgrows the stock pays the cheapest way the planner weighed.
  const overflowUnit = (itemId: ItemId) => Math.min(...(plan.alternatives.get(itemId) ?? []).map((way) => way.unit))

  const costs: number[] = []
  const attempts = plan.targets.map(() => [] as number[])

  for (let run = 0; run < runs; run++) {
    const stock = new Map(owned)
    let cost = 0
    const takeStock = (itemId: ItemId, wanted: number) => {
      const held = stock.get(itemId) ?? 0
      const taken = Math.min(held, wanted)
      if (taken > 0) stock.set(itemId, held - taken)
      return taken
    }

    const walk = (step: StepPlan, needed: number): number => {
      const outcome = yieldFor(step)
      if (outcome === null) {
        cost = Infinity
        return Infinity
      }
      const tried = sampleAttempts(outcome, needed, random)
      for (const line of step.materials) {
        const units = tried * line.perAttempt
        const rest = units - takeStock(line.itemId, units)
        if (rest <= 0) continue
        const { acquisition } = line
        if (acquisition.method === 'buy') cost += rest * acquisition.unit
        else if (acquisition.method === 'owned') cost += rest * overflowUnit(line.itemId)
        else if (acquisition.method === 'none') cost = Infinity
        else walk(acquisition.step, rest)
      }
      // Byproducts are credited at their expected value per attempt, scaled to this run's attempts, not rolled.
      for (const byproduct of step.byproducts) cost -= (byproduct.credit / step.attempts) * tried
      return tried
    }

    plan.targets.forEach((target, at) => {
      attempts[at].push(walk(target.root, target.quantity))
    })
    costs.push(cost)
  }

  return { cost: quantile(costs), attempts: attempts.map(quantile), share: SHARE, runs }
}
