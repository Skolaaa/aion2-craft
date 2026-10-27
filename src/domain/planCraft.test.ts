import { describe, expect, it } from 'vitest'
import { buildCatalog, type RatesFile, type RecipesFile } from './catalog.ts'
import { ladderOf } from './depth.fixture.ts'
import { planCraft } from './planCraft.ts'
import { makePriceBook } from './priceBook.ts'
import type { DepthLadder, ItemId, Mastery, PlanInput, PlanOptions, Recipe } from './types.ts'

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

interface Extra extends Partial<Omit<PlanInput, 'wanted'>> {
  ladders?: Record<number, DepthLadder>
}

function plan(world: World, market: Record<number, number>, wanted: [ItemId, number][], { ladders, ...rest }: Extra = {}) {
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
    ladders: new Map(Object.entries(ladders ?? {}).map(([id, ladder]) => [Number(id), ladder])),
  })
  return planCraft({ mastery: MASTERY, options: OPTIONS, prices, world: buildCatalog('Light', recipesFile, ratesFile), ...rest, wanted: new Map(wanted) })
}

function list(world: World, market: Record<number, number>, wanted: [ItemId, number][], extra: Extra = {}) {
  const result = plan(world, market, wanted, extra)
  if (!result) throw new Error('no plan')
  return result
}

/** One target, read as the plan was before lists: the merged fields and the one target's own side by side. */
function solo(world: World, market: Record<number, number>, { target, quantity = 1, ...extra }: Extra & { target: ItemId; quantity?: number }) {
  const result = list(world, market, [[target, quantity]], extra)
  return { ...result, ...result.targets[0] }
}

describe('planCraft', () => {
  it('buys every material for a single step and divides by the success rate', () => {
    const world = {
      recipes: [craft(1, 100, [[10, 2], [11, 1]], { masteryLevel: 9 })],
      curves: { p: [0.5, 0.8] },
      codes: { 1: { success: 'p', combo: null } },
    }
    const result = solo(world, { 10: 10, 11: 20 }, { target: 100 })

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
    const result = solo(world, { 200: 100, 300: 10 }, { target: 100 })

    const ingot = result.root.materials[0]
    expect(ingot.acquisition.method).toBe('craft')
    expect(ingot.subtotal).toBeCloseTo(20)
    expect(result.cost).toBeCloseTo(20)
    const allBuy = solo(world, { 200: 100, 300: 10 }, { target: 100, options: { ...OPTIONS, allowCraft: false, allowMorph: false } })
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
    const result = solo(world, { 300: 50, 400: 20 }, { target: 100 })

    const ore = result.root.materials[0]
    expect(ore.acquisition.method).toBe('morph')
    expect(ore.acquisition.method === 'morph' && ore.acquisition.step.itemId).toBe(301)
    expect(result.cost).toBeCloseTo(40)
    expect(solo(world, { 300: 50, 400: 20 }, { target: 100, options: { ...OPTIONS, allowMorph: false } }).cost).toBeCloseTo(50)
  })

  it('runs a succession once and obtains its donor by crafting it', () => {
    const succession = craft(5, 500, [[501, 1], [502, 5]], { section: 'succession', rate: { kind: 'fixed', success: 1 } })
    const donor = craft(6, 501, [[503, 1]])
    const world = { recipes: [succession, donor], curves: { half: [0.5] }, codes: { 6: { success: 'half', combo: null } } }
    const result = solo(world, { 502: 10, 503: 100 }, { target: 500 })

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
    const blocked = solo(world, { 10: 10, 100: 50 }, { target: 100 })
    expect(blocked.root.successRate).toBe(0)
    expect(blocked.cost).toBe(Infinity)
    expect(blocked.margin).toBeNull()
    expect(blocked.blocked).toEqual([1])

    const capped = solo(world, { 10: 7 }, { target: 100, mastery: { ...MASTERY, Blacksmithing: 100 } })
    expect(capped.root.levelDiff).toBe(80)
    expect(capped.root.successRate).toBe(0.7)
    expect(capped.cost).toBeCloseTo(10)
  })

  it('buys an ingredient whose recipe needs more mastery than the player has', () => {
    const world = { recipes: [craft(1, 100, [[200, 1]]), craft(2, 200, [[300, 1]], { masteryLevel: 50 })] }
    const result = solo(world, { 200: 100, 300: 1 }, { target: 100 })
    expect(result.root.materials[0].acquisition.method).toBe('buy')
    expect(result.cost).toBeCloseTo(100)
  })

  it('credits the normal results of a combo craft at the taxed listing when enabled', () => {
    const recipe = craft(7, 700, [[702, 1]], { combo: { itemId: 701, count: 1, chance: 0.25 } })
    const world = { recipes: [recipe], curves: { p: [0.8], pc: [0.9] }, codes: { 7: { success: 'p', combo: 'pc' } } }
    const market = { 700: 100, 701: 1000, 702: 90 }

    const plain = solo(world, market, { target: 701 })
    expect(plain.root.wantCombo).toBe(true)
    expect(plain.root.comboRate).toBeCloseTo(0.225)
    expect(plain.root.attempts).toBeCloseTo(1 / 0.225)
    expect(plain.cost).toBeCloseTo(400)

    const credited = solo(world, market, { target: 701, options: { ...OPTIONS, byproductCredit: true } })
    expect(credited.root.byproducts[0].expected).toBeCloseTo(0.6 / 0.225)
    expect(credited.cost).toBeCloseTo(160)
    expect(credited.margin).toBeCloseTo(740)
    expect(credited.marginPct).toBeCloseTo(740 / 160)
  })

  it('counts both results when a combo doubles the same item', () => {
    const recipe = craft(8, 800, [[801, 1]], { combo: { itemId: 800, count: 2, chance: 0.25 } })
    const world = { recipes: [recipe], curves: { p: [0.8] }, codes: { 8: { success: 'p', combo: 'p' } } }
    const result = solo(world, { 801: 10 }, { target: 800 })
    expect(result.root.attempts).toBeCloseTo(1)
    expect(result.cost).toBeCloseTo(10)
  })

  it('uses what the player holds before buying, and shares that stock between steps', () => {
    const world = { recipes: [craft(1, 100, [[10, 2], [200, 1]]), craft(2, 200, [[10, 1], [11, 1]])] }
    const market = { 10: 10, 11: 5, 200: 100 }
    const partial = solo(world, market, { target: 100, owned: new Map([[10, 2.5]]) })
    const [ore, part] = partial.root.materials
    expect([ore.expected, ore.owned, ore.acquisition.method, ore.subtotal]).toEqual([2, 2, 'owned', 0])
    expect(part.acquisition.method).toBe('craft')
    const inner = part.acquisition.method === 'craft' ? part.acquisition.step.materials[0] : null
    expect(inner && [inner.expected, inner.owned, inner.acquisition.method, inner.subtotal]).toEqual([1, 0.5, 'buy', 5])
    expect(partial.cost).toBeCloseTo(10)
    expect(partial.shopping).toEqual([
      { itemId: 10, expected: 1, owned: 0.5, unit: 10, subtotal: 5, depth: null },
      { itemId: 11, expected: 1, owned: 0, unit: 5, subtotal: 5, depth: null },
    ])
    expect(solo(world, market, { target: 100 }).cost).toBeCloseTo(35)
  })

  it('does not call an item missing when the player holds enough of it', () => {
    const world = { recipes: [craft(1, 100, [[10, 1], [11, 1]])] }
    const result = solo(world, { 10: 5 }, { target: 100, owned: new Map([[11, 1]]) })
    expect(result.missing).toEqual([])
    expect(result.cost).toBeCloseTo(5)
    const short = solo(world, { 10: 5 }, { target: 100, owned: new Map([[11, 0.5]]) })
    expect(short.missing).toEqual([11])
  })

  it('lists an ingredient with no price and no recipe as missing', () => {
    const world = { recipes: [craft(1, 100, [[10, 1], [11, 1]])] }
    const result = solo(world, { 10: 5 }, { target: 100 })
    expect(result.missing).toEqual([11])
    expect(result.cost).toBe(Infinity)
  })

  describe('with several targets', () => {
    const SWORD = 100
    const SHIELD = 200
    const ORE = 10
    const two = { recipes: [craft(1, SWORD, [[ORE, 2]]), craft(2, SHIELD, [[ORE, 3]])] }

    it('spends the stock once across the targets, in list order', () => {
      const result = list(two, { [ORE]: 10 }, [[SWORD, 1], [SHIELD, 1]], { owned: new Map([[ORE, 4]]) })
      const [sword, shield] = result.targets
      expect(sword.root.materials[0]).toMatchObject({ expected: 2, owned: 2, subtotal: 0 })
      expect(shield.root.materials[0]).toMatchObject({ expected: 3, owned: 2, subtotal: 10 })
      // The sword's line is covered in full, so only the shield's reaches the shopping, one unit short.
      expect(result.shopping).toEqual([{ itemId: ORE, expected: 3, owned: 2, unit: 10, subtotal: 10, depth: null }])
      expect(result.cost).toBe(10)
    })

    it('quotes a material both targets buy along one ladder for the total bought', () => {
      // One cheap unit, then the price doubles, then it runs out after four.
      const thin = ladderOf([[10, 1, 1], [20, 1, 3]])
      const one = { recipes: [craft(1, SWORD, [[ORE, 1]]), craft(2, SHIELD, [[ORE, 1]])] }
      const result = list(one, { [ORE]: 10 }, [[SWORD, 2], [SHIELD, 2]], { ladders: { [ORE]: thin } })
      expect(result.shopping).toEqual([expect.objectContaining({ itemId: ORE, expected: 4, subtotal: 70 })])
      expect(result.shopping[0].depth).toMatchObject({ units: 4, cost: 70 })
      expect(result.targets.map((target) => target.cost)).toEqual([35, 35])
      expect(result.cost).toBe(70)
    })

    it('honours a forced source in every tree', () => {
      const PART = 300
      const shared = { recipes: [craft(1, SWORD, [[PART, 1]]), craft(2, SHIELD, [[PART, 1]]), craft(3, PART, [[ORE, 2]])] }
      const market = { [PART]: 100, [ORE]: 10 }
      expect(list(shared, market, [[SWORD, 1], [SHIELD, 1]]).cost).toBe(40)
      const bought = list(shared, market, [[SWORD, 1], [SHIELD, 1]], { forced: new Map([[PART, 'buy']]) })
      expect(bought.targets.map((target) => target.root.materials[0].acquisition.method)).toEqual(['buy', 'buy'])
      expect(bought.cost).toBe(200)
    })

    it('gives the same total and the same shopping in either order, while the first target draws on stock first', () => {
      const thin = ladderOf([[10, 1, 1], [20, 1, 3]])
      const extra: Extra = { owned: new Map([[ORE, 1]]), ladders: { [ORE]: thin } }
      const ahead = list(two, { [ORE]: 10 }, [[SWORD, 1], [SHIELD, 1]], extra)
      const behind = list(two, { [ORE]: 10 }, [[SHIELD, 1], [SWORD, 1]], extra)
      expect(ahead.targets.map((target) => target.root.materials[0].owned)).toEqual([1, 0])
      expect(behind.targets.map((target) => target.root.materials[0].owned)).toEqual([1, 0])
      expect(ahead.cost).toBe(behind.cost)
      expect(ahead.shopping).toEqual(behind.shopping)
      expect(ahead.targets.map((target) => target.itemId)).toEqual([SWORD, SHIELD])
      expect(behind.targets.map((target) => target.itemId)).toEqual([SHIELD, SWORD])
    })

    it('is no plan when the map is empty or an item has no recipe', () => {
      expect(plan(two, { [ORE]: 10 }, [])).toBeNull()
      expect(plan(two, { [ORE]: 10 }, [[SWORD, 1], [ORE, 1]])).toBeNull()
    })
  })

  describe('with depth ladders', () => {
    // One cheap unit, then the price doubles, then it runs out after four.
    const thin = ladderOf([[10, 1, 1], [20, 1, 3]])
    const world = { recipes: [craft(1, 100, [[10, 1]])] }

    it('prices a single unit at the lowest listing, the same as without a ladder', () => {
      const result = solo(world, { 10: 10 }, { target: 100, ladders: { 10: thin } })
      expect(result.cost).toBe(10)
      expect(result.shopping[0]).toMatchObject({ unit: 10, depth: null })
    })

    it('climbs the ladder when the plan buys more units than the cheapest listing holds', () => {
      const result = solo(world, { 10: 10 }, { target: 100, quantity: 3, ladders: { 10: thin } })
      expect(result.cost).toBe(50)
      expect(result.unitCost).toBeCloseTo(50 / 3)
      expect(result.shopping[0]).toMatchObject({ expected: 3, unit: 50 / 3, subtotal: 50 })
      expect(result.shopping[0].depth).toMatchObject({ units: 3, cost: 50, listings: 2, levels: 2, available: 4 })
      expect(result.root.materials[0].acquisition).toMatchObject({ method: 'buy', unit: 50 / 3 })
    })

    it('prices the units past the last listing at the top rung and keeps the shortfall visible', () => {
      const result = solo(world, { 10: 10 }, { target: 100, quantity: 6, ladders: { 10: thin } })
      expect(result.cost).toBe(10 + 5 * 20)
      expect(result.shopping[0].depth).toMatchObject({ units: 6, available: 4 })
    })

    it('sums the demand of one material across steps before quoting it', () => {
      const twoSteps = { recipes: [craft(1, 100, [[10, 1], [200, 1]]), craft(2, 200, [[10, 1]])] }
      const result = solo(twoSteps, { 10: 10, 200: 1000 }, { target: 100, quantity: 2, ladders: { 10: thin } })
      expect(result.shopping).toEqual([expect.objectContaining({ itemId: 10, expected: 4, subtotal: 70 })])
      expect(result.cost).toBe(70)
    })

    it('crafts a material once its depth-aware price passes the crafting cost', () => {
      const world = { recipes: [craft(1, 100, [[10, 1]]), craft(2, 10, [[11, 1]])] }
      const flat = solo(world, { 10: 10, 11: 15 }, { target: 100, quantity: 3 })
      expect(flat.root.materials[0].acquisition.method).toBe('buy')
      const deep = solo(world, { 10: 10, 11: 15 }, { target: 100, quantity: 3, ladders: { 10: thin } })
      expect(deep.root.materials[0].acquisition.method).toBe('craft')
      expect(deep.cost).toBe(45)
    })

    it('quotes only the bought part of a line along the ladder, never what the player holds', () => {
      const mostlyHeld = solo(world, { 10: 10 }, { target: 100, quantity: 3, ladders: { 10: thin }, owned: new Map([[10, 2]]) })
      expect(mostlyHeld.cost).toBe(10)
      expect(mostlyHeld.shopping[0]).toMatchObject({ expected: 3, owned: 2, unit: 10, subtotal: 10, depth: null })
      const partlyHeld = solo(world, { 10: 10 }, { target: 100, quantity: 3, ladders: { 10: thin }, owned: new Map([[10, 1]]) })
      expect(partlyHeld.cost).toBe(30)
      expect(partlyHeld.shopping[0]).toMatchObject({ expected: 3, owned: 1, unit: 15, subtotal: 30 })
      expect(partlyHeld.shopping[0].depth).toMatchObject({ units: 2, cost: 30 })
    })

    it('buys the target at the depth-aware cost and sells it at the lowest listing', () => {
      const result = solo(world, { 10: 10, 100: 100 }, { target: 100, quantity: 3, ladders: { 100: ladderOf([[100, 1, 1], [200, 1, 5]]) } })
      expect(result.market).toMatchObject({ lowest: 100, cost: 500, listings: 1 })
      expect(result.market?.depth).toMatchObject({ units: 3, listings: 2 })
      expect(result.margin).toBeCloseTo(100 * 0.9 * 3 - 30)
    })
  })

  describe('with a forced source', () => {
    // Crafting the part costs 20 against a listing of 100.
    const world = { recipes: [craft(1, 100, [[200, 1]]), craft(2, 200, [[300, 2]])] }
    const market = { 200: 100, 300: 10 }
    const methodOf = (result: ReturnType<typeof solo>) => result.root.materials[0].acquisition.method

    it('buys a part on request although crafting it is cheaper, and the cost rises by the gap', () => {
      const result = solo(world, market, { target: 100, forced: new Map([[200, 'buy']]) })
      expect(methodOf(result)).toBe('buy')
      expect(result.cost).toBeCloseTo(100)
      expect(result.alternatives.get(200)).toEqual([{ method: 'buy', unit: 100 }, { method: 'craft', unit: 20, recipeId: 2 }])
    })

    it('crafts a part on request with crafting switched off, and still lists crafting as a way', () => {
      const off = { ...OPTIONS, allowCraft: false }
      expect(methodOf(solo(world, market, { target: 100, options: off }))).toBe('buy')
      const result = solo(world, market, { target: 100, options: off, forced: new Map([[200, 'craft']]) })
      expect(methodOf(result)).toBe('craft')
      expect(result.cost).toBeCloseTo(20)
      expect(result.alternatives.get(200)).toEqual([{ method: 'buy', unit: 100 }, { method: 'craft', unit: 20, recipeId: 2 }])
    })

    it('falls back to the cheapest way when the requested one does not exist', () => {
      const result = solo(world, market, { target: 100, forced: new Map([[300, 'craft']]) })
      expect(result.cost).toBeCloseTo(20)
      expect(result.alternatives.get(300)).toEqual([{ method: 'buy', unit: 10 }])
    })

    it('morphs on request although the listing is cheaper', () => {
      const morph: Recipe = { ...craft(3, 301, [[400, 1]]), section: 'conversion', profession: null, rate: { kind: 'fixed', success: 0.5 } }
      const morphs = { recipes: [craft(1, 100, [[300, 1]]), morph], substitutes: { 300: 301 } }
      expect(solo(morphs, { 300: 30, 400: 20 }, { target: 100 }).cost).toBeCloseTo(30)
      const result = solo(morphs, { 300: 30, 400: 20 }, { target: 100, forced: new Map([[300, 'morph']]) })
      expect(methodOf(result)).toBe('morph')
      expect(result.cost).toBeCloseTo(40)
      expect(result.alternatives.get(300)).toEqual([{ method: 'buy', unit: 30 }, { method: 'morph', unit: 40, recipeId: 3 }])
    })

    it('lists a route the player cannot use at Infinity and does not honour a request for it', () => {
      const tooHigh = { recipes: [craft(1, 100, [[200, 1]]), craft(2, 200, [[300, 2]], { masteryLevel: 50 })] }
      const result = solo(tooHigh, market, { target: 100, forced: new Map([[200, 'craft']]) })
      expect(methodOf(result)).toBe('buy')
      expect(result.cost).toBeCloseTo(100)
      expect(result.alternatives.get(200)).toEqual([{ method: 'buy', unit: 100 }, { method: 'craft', unit: Infinity, recipeId: 2 }])
      const unpriced = solo(world, { 200: 100 }, { target: 100, forced: new Map([[200, 'craft']]) })
      expect(unpriced.cost).toBeCloseTo(100)
      expect(unpriced.alternatives.get(200)).toEqual([{ method: 'buy', unit: 100 }, { method: 'craft', unit: Infinity, recipeId: 2 }])
    })

    it('lists one way per method and takes the cheapest recipe of a requested one', () => {
      const two = { recipes: [craft(1, 100, [[200, 1]]), craft(2, 200, [[300, 2]]), craft(3, 200, [[300, 3]])] }
      const result = solo(two, market, { target: 100, forced: new Map([[200, 'craft']]) })
      expect(result.alternatives.get(200)).toEqual([{ method: 'buy', unit: 100 }, { method: 'craft', unit: 20, recipeId: 2 }])
      const part = result.root.materials[0].acquisition
      expect(part.method === 'craft' && part.step.recipeId).toBe(2)
    })

    it('applies the request to every step that uses the item', () => {
      const twice = { recipes: [craft(1, 100, [[200, 1], [250, 1]]), craft(2, 200, [[300, 2]]), craft(3, 250, [[200, 1]])] }
      const prices = { ...market, 250: 500 }
      expect(solo(twice, prices, { target: 100 }).cost).toBeCloseTo(40)
      const result = solo(twice, prices, { target: 100, forced: new Map([[200, 'buy']]) })
      const [part, assembly] = result.root.materials
      expect(part.acquisition.method).toBe('buy')
      expect(assembly.acquisition.method === 'craft' && assembly.acquisition.step.materials[0].acquisition.method).toBe('buy')
      expect(result.cost).toBeCloseTo(200)
      expect(result.shopping).toEqual([expect.objectContaining({ itemId: 200, expected: 2, subtotal: 200 })])
    })
  })
})
