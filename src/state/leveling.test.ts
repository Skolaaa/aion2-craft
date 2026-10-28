import { describe, expect, it } from 'vitest'
import { buildCatalog, type RatesFile, type RecipesFile } from '../domain/catalog.ts'
import { makePriceBook } from '../domain/priceBook.ts'
import type { MarketQuote, Mastery, PlanOptions, Recipe } from '../domain/types.ts'
import type { World } from '../market/worlds.ts'
import { craftIndexFor } from './craftables.ts'
import { expOf, levelingCandidates, netKinaPerAttempt } from './leveling.ts'
import type { Planning } from './planning.ts'

const ORE = 1
const INGOT = 2
const GUARD = 3
const SPLENDENT = 4
const MASTERY: Mastery = { Blacksmithing: 0, Tailoring: 0, Jewelcrafting: 0, Alchemy: 0, Cooking: 0 }
const OPTIONS: PlanOptions = { allowCraft: true, allowMorph: true, byproductCredit: false, taxRate: 0.1 }
const WORLD: World = { id: 1, name: 'Siel', region: 'NA', regionName: 'Americas', race: 'Light', hasData: true }
const FLAT = { success: 'one', combo: 'one' }

function craft(id: number, masteryLevel: number, more: Partial<Recipe> = {}): Recipe {
  return {
    id,
    section: 'craft',
    name: `recipe ${id}`,
    profession: 'Blacksmithing',
    race: 'Light',
    masteryLevel,
    product: { itemId: id + 1000, count: 1 },
    combo: null,
    rate: { kind: 'curve', family: 'material' },
    ingredients: [{ itemId: ORE, count: 1 }],
    ...more,
  }
}

const INGOT_X1 = craft(10, 1, { product: { itemId: INGOT, count: 1 }, ingredients: [{ itemId: ORE, count: 2 }] })
const INGOT_X10 = craft(11, 25, { product: { itemId: INGOT, count: 10 }, ingredients: [{ itemId: ORE, count: 15 }] })
const GUARD_RECIPE = craft(20, 5, {
  product: { itemId: GUARD, count: 1 },
  combo: { itemId: SPLENDENT, count: 1, chance: 0.25 },
  rate: { kind: 'curve', family: 'basic' },
  ingredients: [{ itemId: INGOT, count: 3 }],
})
const RECIPES = [INGOT_X1, INGOT_X10, GUARD_RECIPE]
const SEED: Record<string, number> = { 10: 20, 11: 112, 20: 84 }
const MARKET = { [ORE]: 100, [INGOT]: 500, [GUARD]: 2000, [SPLENDENT]: 10_000 }

function catalogOf(recipes: Recipe[], craftExp: Record<string, number> = {}) {
  const recipesFile: RecipesFile = { items: {}, recipes, substitutes: {}, npcPrices: {} }
  const ratesFile: RatesFile = {
    curves: { one: [1], eighty: [0.8], half: [0.5] },
    recipes: { 20: { success: 'eighty', combo: 'half' } },
    families: { basic: FLAT, expert: FLAT, artisan: FLAT, dragonlord: FLAT, consumable: FLAT, material: FLAT },
  }
  return buildCatalog('Light', recipesFile, ratesFile, craftExp)
}

function planningOf(recipes: Recipe[], listed: Record<number, number>, craftExp = SEED, options = OPTIONS): Planning {
  const catalog = catalogOf(recipes, craftExp)
  const market = new Map<number, MarketQuote>(Object.entries(listed).map(([id, lowest]) => [Number(id), { lowest, listings: 3, soldAvg: null, capturedAt: '' }]))
  const prices = makePriceBook({ manual: new Map(), market, npc: new Map() })
  return { world: WORLD, catalog, index: craftIndexFor(catalog), mastery: MASTERY, options, prices, market }
}

describe('expOf', () => {
  const catalog = catalogOf([craft(10, 1), craft(11, 1), craft(12, 1, { race: 'Dark' })], { 10: 20, 12: 50 })

  it('takes the seed when the player measured nothing', () => {
    expect(expOf(catalog, new Map(), 10)).toBe(20)
  })

  it('lets the player measurement win over the seed', () => {
    expect(expOf(catalog, new Map([[10, 25]]), 10)).toBe(25)
  })

  it('is null for a recipe nobody measured', () => {
    expect(expOf(catalog, new Map(), 11)).toBeNull()
  })

  it('does not seed the other race recipes into this catalog', () => {
    expect(catalog.craftExp.has(12)).toBe(false)
  })
})

describe('levelingCandidates', () => {
  const unmeasured = craft(40, 10)
  const tailoring = craft(30, 1, { profession: 'Tailoring' })
  const morph = craft(50, 1, { section: 'conversion' })
  const twin = craft(12, 1, { product: { itemId: INGOT, count: 1 } })

  it('keeps the craft recipes of the profession with a known EXP, by mastery level', () => {
    const planning = planningOf([...RECIPES, unmeasured, tailoring, morph], MARKET, { ...SEED, 30: 20, 50: 20 })
    expect(levelingCandidates(planning, 'Blacksmithing', new Map()).map((r) => r.id)).toEqual([10, 20, 11])
  })

  it('admits a recipe the player measured', () => {
    const planning = planningOf([...RECIPES, unmeasured], MARKET)
    expect(levelingCandidates(planning, 'Blacksmithing', new Map([[40, 30]])).map((r) => r.id)).toEqual([10, 20, 40, 11])
  })

  it('keeps the lowest id of twins making the same product and count', () => {
    const planning = planningOf([twin, ...RECIPES], MARKET, { ...SEED, 12: 20 })
    expect(levelingCandidates(planning, 'Blacksmithing', new Map()).map((r) => r.id)).toEqual([10, 20, 11])
  })
})

describe('netKinaPerAttempt', () => {
  it('is the material cost of one attempt at the level', () => {
    // 3 ingots at 200 each, crafted since the listing is 500, at success 0.8 and combo 0.25
    expect(netKinaPerAttempt(planningOf(RECIPES, MARKET), GUARD_RECIPE, 5, false)).toBeCloseTo(600)
  })

  it('is Infinity below the recipe level', () => {
    expect(netKinaPerAttempt(planningOf(RECIPES, MARKET), GUARD_RECIPE, 4, false)).toBe(Infinity)
  })

  it('is Infinity when a material has no price and no recipe', () => {
    expect(netKinaPerAttempt(planningOf(RECIPES, { [INGOT]: 500 }), INGOT_X1, 1, false)).toBe(Infinity)
  })

  it('prices this recipe even when another recipe makes the product cheaper', () => {
    const planning = planningOf(RECIPES, MARKET)
    expect(netKinaPerAttempt(planning, INGOT_X1, 30, false)).toBeCloseTo(200)
    expect(netKinaPerAttempt(planning, INGOT_X10, 30, false)).toBeCloseTo(1500)
  })

  it('takes off what the results fetch after tax, the normal share and the combo share', () => {
    // 600 - 0.75 * 0.8 * 2000 * 0.9 - 0.25 * 0.5 * 10000 * 0.9
    expect(netKinaPerAttempt(planningOf(RECIPES, MARKET), GUARD_RECIPE, 5, true)).toBeCloseTo(600 - 1080 - 1125)
  })

  it('sells a result without a listing for nothing', () => {
    const planning = planningOf(RECIPES, { [ORE]: 100, [INGOT]: 500, [GUARD]: 2000 })
    expect(netKinaPerAttempt(planning, GUARD_RECIPE, 5, true)).toBeCloseTo(600 - 1080)
  })

  it('does not credit the combo product twice when the plan options credit byproducts', () => {
    const planning = planningOf(RECIPES, MARKET, SEED, { ...OPTIONS, byproductCredit: true })
    expect(netKinaPerAttempt(planning, GUARD_RECIPE, 5, false)).toBeCloseTo(600)
    expect(netKinaPerAttempt(planning, GUARD_RECIPE, 5, true)).toBeCloseTo(600 - 1080 - 1125)
  })
})
