import { describe, expect, it } from 'vitest'
import { buildCatalog, type RatesFile, type RecipesFile } from './catalog.ts'
import { costAtRisk } from './costAtRisk.ts'
import { planCraft } from './planCraft.ts'
import { makePriceBook } from './priceBook.ts'
import type { Catalog, ItemId, Mastery, Owned, PlanOptions, PlanResult, Recipe } from './types.ts'

const OPTIONS: PlanOptions = { allowCraft: true, allowMorph: true, byproductCredit: false, taxRate: 0.1 }
const MASTERY: Mastery = { Blacksmithing: 10, Tailoring: 0, Jewelcrafting: 0, Alchemy: 0, Cooking: 0 }
const FLAT = { success: 'one', combo: 'one' }

function craft(id: number, product: ItemId, ingredients: [ItemId, number][], success: number, more: Partial<Recipe> = {}): Recipe {
  return {
    id,
    section: 'craft',
    name: `recipe ${id}`,
    profession: 'Blacksmithing',
    race: 'Light',
    masteryLevel: 0,
    product: { itemId: product, count: 1 },
    combo: null,
    rate: { kind: 'fixed', success },
    ingredients: ingredients.map(([itemId, count]) => ({ itemId, count })),
    ...more,
  }
}

interface Planned {
  plan: PlanResult
  catalog: Catalog
}

function planned(recipes: Recipe[], market: Record<number, number>, wanted: [ItemId, number][], owned?: Owned, mastery = MASTERY): Planned {
  const recipesFile: RecipesFile = { items: {}, recipes, substitutes: {}, npcPrices: {} }
  const ratesFile: RatesFile = {
    curves: { one: [1] },
    recipes: {},
    families: { basic: FLAT, expert: FLAT, artisan: FLAT, dragonlord: FLAT, consumable: FLAT, material: FLAT },
  }
  const prices = makePriceBook({
    manual: new Map(),
    market: new Map(Object.entries(market).map(([id, lowest]) => [Number(id), { lowest, listings: 1, soldAvg: null, capturedAt: '' }])),
    npc: new Map(),
    ladders: new Map(),
  })
  const catalog = buildCatalog('Light', recipesFile, ratesFile)
  const plan = planCraft({ wanted: new Map(wanted), mastery, options: OPTIONS, prices, world: catalog, owned })
  if (!plan) throw new Error('no plan')
  return { plan, catalog }
}

/** The smallest attempt count n with P(attempts <= n) >= share, for `needed` successes at success rate p, one unit per success. */
function negativeBinomialQuantile(needed: number, p: number, share: number) {
  let logPmf = needed * Math.log(p)
  let cdf = Math.exp(logPmf)
  let n = needed
  while (cdf < share) {
    logPmf += Math.log(n / (n - needed + 1)) + Math.log(1 - p)
    n += 1
    cdf += Math.exp(logPmf)
  }
  return n
}

describe('costAtRisk', () => {
  it('gives the same number for the same seed and a close one for another', () => {
    const { plan, catalog } = planned([craft(1, 100, [[10, 2]], 0.6)], { 10: 50 }, [[100, 10]])
    const first = costAtRisk(plan, { catalog, seed: 7 })
    const again = costAtRisk(plan, { catalog, seed: 7 })
    const other = costAtRisk(plan, { catalog, seed: 8 })
    expect(again).toEqual(first)
    expect(Math.abs(other.cost - first.cost) / first.cost).toBeLessThan(0.05)
    expect(first.share).toBe(0.9)
    expect(first.runs).toBe(1000)
  })

  it('matches the negative binomial on a single bought-material step', () => {
    const { plan, catalog } = planned([craft(1, 100, [[10, 2], [11, 1]], 0.5)], { 10: 10, 11: 20 }, [[100, 10]])
    const risk = costAtRisk(plan, { catalog })
    const closed = negativeBinomialQuantile(10, 0.5, 0.9)
    expect(Math.abs(risk.attempts[0] - closed)).toBeLessThanOrEqual(1)
    expect(risk.cost).toBe(risk.attempts[0] * (2 * 10 + 1 * 20))
    expect(risk.cost).toBeGreaterThan(plan.cost)
  })

  it('lands within 2% of the closed form on the normal path', () => {
    const { plan, catalog } = planned([craft(1, 100, [[10, 1]], 0.5)], { 10: 1 }, [[100, 5000]])
    const risk = costAtRisk(plan, { catalog })
    const closed = negativeBinomialQuantile(5000, 0.5, 0.9)
    expect(plan.targets[0].root.attempts).toBeGreaterThan(2000)
    expect(Math.abs(risk.attempts[0] - closed) / closed).toBeLessThan(0.02)
  })

  it('charges only what a run needs beyond the player stock', () => {
    const recipes = [craft(1, 100, [[10, 2]], 0.5)]
    const bare = planned(recipes, { 10: 10 }, [[100, 10]])
    const stocked = planned(recipes, { 10: 10 }, [[100, 10]], new Map([[10, 44]]))
    expect(stocked.plan.targets[0].root.materials[0].acquisition.method).toBe('owned')
    const bareRisk = costAtRisk(bare.plan, { catalog: bare.catalog })
    const stockedRisk = costAtRisk(stocked.plan, { catalog: stocked.catalog, owned: new Map([[10, 44]]) })
    expect(stockedRisk.cost).toBeGreaterThan(0)
    expect(stockedRisk.cost).toBeLessThan(bareRisk.cost)
    expect(stockedRisk.attempts).toEqual(bareRisk.attempts)
  })

  it('rolls every level of a nested tree and is never under the expected cost', () => {
    const { plan, catalog } = planned([craft(1, 100, [[200, 1]], 0.5), craft(2, 200, [[300, 2]], 0.5)], { 200: 1000, 300: 10 }, [[100, 4]])
    expect(plan.targets[0].root.materials[0].acquisition.method).toBe('craft')
    const risk = costAtRisk(plan, { catalog })
    expect(risk.cost).toBeGreaterThanOrEqual(plan.cost)
    expect(Number.isFinite(risk.cost)).toBe(true)
  })

  it('is Infinity when a step is above the player mastery', () => {
    const locked = craft(1, 100, [[10, 1]], 0.5, { masteryLevel: 50, rate: { kind: 'curve', family: 'basic' } })
    const { plan, catalog } = planned([locked], { 10: 10 }, [[100, 1]])
    expect(plan.cost).toBe(Infinity)
    const risk = costAtRisk(plan, { catalog })
    expect(risk.cost).toBe(Infinity)
    expect(risk.attempts).toEqual([Infinity])
  })

  it('needs fewer attempts when a combo makes more of the same item', () => {
    const plain = planned([craft(1, 100, [[10, 1]], 0.5)], { 10: 10 }, [[100, 20]])
    const combo = planned([craft(1, 100, [[10, 1]], 0.5, { combo: { itemId: 100, count: 3, chance: 0.3 } })], { 10: 10 }, [[100, 20]])
    const plainRisk = costAtRisk(plain.plan, { catalog: plain.catalog })
    const comboRisk = costAtRisk(combo.plan, { catalog: combo.catalog })
    expect(comboRisk.attempts[0]).toBeLessThan(plainRisk.attempts[0])
    expect(comboRisk.cost).toBeLessThan(plainRisk.cost)
  })
})
