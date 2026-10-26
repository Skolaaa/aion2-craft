import { describe, expect, it } from 'vitest'
import { buildCatalog, type RatesFile, type RecipesFile } from './catalog.ts'
import { planCraft } from './planCraft.ts'
import { makePriceBook } from './priceBook.ts'
import type { ItemId, Mastery, PlanInput, PlanOptions, Recipe } from './types.ts'

const OPTIONS: PlanOptions = { allowCraft: true, allowMorph: true, byproductCredit: false, taxRate: 0.1 }
const MASTERY: Mastery = { Blacksmithing: 10, Tailoring: 0, Jewelcrafting: 0, Alchemy: 0, Cooking: 0 }
const FLAT = { success: 'one', combo: 'one' }

function craft(id: number, product: ItemId, ingredients: [ItemId, number][], more: Partial<Recipe> = {}): Recipe {
  return {
    id,
    section: 'craft',
    name: `recipe ${id}`,
    profession: 'Blacksmithing',
    race: 'Light',
    masteryLevel: 0,
    product: { itemId: product, count: 1 },
    combo: null,
    rate: { kind: 'curve', family: 'basic' },
    ingredients: ingredients.map(([itemId, count]) => ({ itemId, count })),
    ...more,
  }
}

interface World {
  recipes: Recipe[]
  curves?: Record<string, number[]>
  codes?: RatesFile['recipes']
  substitutes?: Record<string, ItemId>
}

function plan(world: World, market: Record<number, number>, extra: Partial<Omit<PlanInput, 'target'>> & { target: ItemId }) {
  const recipesFile: RecipesFile = { items: {}, recipes: world.recipes, substitutes: world.substitutes ?? {}, npcPrices: {} }
  const ratesFile: RatesFile = {
    curves: { one: [1], ...world.curves },
    recipes: world.codes ?? {},
    families: { basic: FLAT, expert: FLAT, artisan: FLAT, dragonlord: FLAT, consumable: FLAT, material: FLAT },
  }
  const prices = makePriceBook({
    manual: new Map(),
    market: new Map(Object.entries(market).map(([id, lowest]) => [Number(id), { lowest, listings: 1, soldAvg: null, capturedAt: '' }])),
    npc: new Map(),
  })
  const result = planCraft({
    mastery: MASTERY,
    options: OPTIONS,
    prices,
    world: buildCatalog('Light', recipesFile, ratesFile),
    ...extra,
    target: { itemId: extra.target, quantity: 1 },
  })
  if (!result) throw new Error('no plan')
  return result
}

describe('planCraft', () => {
  it('buys every material for a single step and divides by the success rate', () => {
    const world = {
      recipes: [craft(1, 100, [[10, 2], [11, 1]], { masteryLevel: 9 })],
      curves: { p: [0.5, 0.8] },
      codes: { 1: { success: 'p', combo: null } },
    }
    const result = plan(world, { 10: 10, 11: 20 }, { target: 100 })

    expect(result.root.successRate).toBe(0.8)
    expect(result.root.attempts).toBeCloseTo(1.25)
    expect(result.cost).toBeCloseTo(50)
    expect(result.root.materials.map((m) => [m.itemId, m.expected, m.acquisition.method])).toEqual([
      [10, 2.5, 'buy'],
      [11, 1.25, 'buy'],
    ])
    expect(result.shopping.map((s) => [s.itemId, s.subtotal])).toEqual([[10, 25], [11, 25]])
  })

  it('crafts an ingredient when that is cheaper than its listing, and buys it with crafting and morphing off', () => {
    const world = { recipes: [craft(1, 100, [[200, 1]]), craft(2, 200, [[300, 2]])] }
    const result = plan(world, { 200: 100, 300: 10 }, { target: 100 })

    const ingot = result.root.materials[0]
    expect(ingot.acquisition.method).toBe('craft')
    expect(ingot.subtotal).toBeCloseTo(20)
    expect(result.cost).toBeCloseTo(20)
    const allBuy = plan(world, { 200: 100, 300: 10 }, { target: 100, options: { ...OPTIONS, allowCraft: false, allowMorph: false } })
    expect(allBuy.root.materials[0].acquisition.method).toBe('buy')
    expect(allBuy.cost).toBeCloseTo(100)
    expect(result.cost).toBeLessThan(allBuy.cost)
  })

  it('morphs Odyle into the Bound variant of a material the recipe lists unbound', () => {
    const morph: Recipe = {
      ...craft(3, 301, [[400, 1]]),
      section: 'conversion',
      profession: null,
      rate: { kind: 'fixed', success: 0.5 },
    }
    const world = { recipes: [craft(1, 100, [[300, 1]]), morph], substitutes: { 300: 301 } }
    const result = plan(world, { 300: 50, 400: 20 }, { target: 100 })

    const ore = result.root.materials[0]
    expect(ore.acquisition.method).toBe('morph')
    expect(ore.acquisition.method === 'morph' && ore.acquisition.step.itemId).toBe(301)
    expect(result.cost).toBeCloseTo(40)
    expect(plan(world, { 300: 50, 400: 20 }, { target: 100, options: { ...OPTIONS, allowMorph: false } }).cost).toBeCloseTo(50)
  })

  it('runs a succession once and obtains its donor by crafting it', () => {
    const succession = craft(5, 500, [[501, 1], [502, 5]], { section: 'succession', rate: { kind: 'fixed', success: 1 } })
    const donor = craft(6, 501, [[503, 1]])
    const world = { recipes: [succession, donor], curves: { half: [0.5] }, codes: { 6: { success: 'half', combo: null } } }
    const result = plan(world, { 502: 10, 503: 100 }, { target: 500 })

    expect(result.root.rateSource).toBe('fixed')
    expect(result.root.attempts).toBe(1)
    expect(result.root.materials[0].acquisition.method).toBe('craft')
    expect(result.cost).toBeCloseTo(250)
  })

  it('reports a recipe above the player mastery as not craftable and clamps past the end of the curve', () => {
    const world = {
      recipes: [craft(1, 100, [[10, 1]], { masteryLevel: 20 })],
      curves: { p: [0.5, 0.6, 0.7] },
      codes: { 1: { success: 'p', combo: null } },
    }
    const blocked = plan(world, { 10: 10, 100: 50 }, { target: 100 })
    expect(blocked.root.successRate).toBe(0)
    expect(blocked.cost).toBe(Infinity)
    expect(blocked.margin).toBeNull()
    expect(blocked.blocked).toEqual([1])

    const capped = plan(world, { 10: 7 }, { target: 100, mastery: { ...MASTERY, Blacksmithing: 100 } })
    expect(capped.root.levelDiff).toBe(80)
    expect(capped.root.successRate).toBe(0.7)
    expect(capped.cost).toBeCloseTo(10)
  })

  it('buys an ingredient whose recipe needs more mastery than the player has', () => {
    const world = { recipes: [craft(1, 100, [[200, 1]]), craft(2, 200, [[300, 1]], { masteryLevel: 50 })] }
    const result = plan(world, { 200: 100, 300: 1 }, { target: 100 })
    expect(result.root.materials[0].acquisition.method).toBe('buy')
    expect(result.cost).toBeCloseTo(100)
  })

  it('credits the normal results of a combo craft at the taxed listing when enabled', () => {
    const recipe = craft(7, 700, [[702, 1]], { combo: { itemId: 701, count: 1, chance: 0.25 } })
    const world = { recipes: [recipe], curves: { p: [0.8], pc: [0.9] }, codes: { 7: { success: 'p', combo: 'pc' } } }
    const market = { 700: 100, 701: 1000, 702: 90 }

    const plain = plan(world, market, { target: 701 })
    expect(plain.root.wantCombo).toBe(true)
    expect(plain.root.comboRate).toBeCloseTo(0.225)
    expect(plain.root.attempts).toBeCloseTo(1 / 0.225)
    expect(plain.cost).toBeCloseTo(400)

    const credited = plan(world, market, { target: 701, options: { ...OPTIONS, byproductCredit: true } })
    expect(credited.root.byproducts[0].expected).toBeCloseTo(0.6 / 0.225)
    expect(credited.cost).toBeCloseTo(160)
    expect(credited.margin).toBeCloseTo(740)
    expect(credited.marginPct).toBeCloseTo(740 / 160)
  })

  it('counts both results when a combo doubles the same item', () => {
    const recipe = craft(8, 800, [[801, 1]], { combo: { itemId: 800, count: 2, chance: 0.25 } })
    const world = { recipes: [recipe], curves: { p: [0.8] }, codes: { 8: { success: 'p', combo: 'p' } } }
    const result = plan(world, { 801: 10 }, { target: 800 })
    expect(result.root.attempts).toBeCloseTo(1)
    expect(result.cost).toBeCloseTo(10)
  })

  it('lists an ingredient with no price and no recipe as missing', () => {
    const world = { recipes: [craft(1, 100, [[10, 1], [11, 1]])] }
    const result = plan(world, { 10: 5 }, { target: 100 })
    expect(result.missing).toEqual([11])
    expect(result.cost).toBe(Infinity)
  })
})
