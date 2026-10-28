import { describe, expect, it } from 'vitest'
import { buildCatalog, type RatesFile, type RecipesFile } from './catalog.ts'
import { expBetween, expPerAttempt, planLeveling, type LevelingInput } from './leveling.ts'
import type { Mastery, Recipe, RecipeId } from './types.ts'

const MASTERY: Mastery = { Blacksmithing: 0, Tailoring: 0, Jewelcrafting: 0, Alchemy: 0, Cooking: 0 }
const FLAT = { success: 'one', combo: 'one' }
/** Level L needs 10 * L EXP, except the quest gate and the cap. */
const TABLE = Array.from({ length: 100 }, (_, at) => (at === 49 || at === 99 ? 0 : 10 * (at + 1)))

function craft(id: number, masteryLevel: number, more: Partial<Recipe> = {}): Recipe {
  return {
    id,
    section: 'craft',
    name: `recipe ${id}`,
    profession: 'Alchemy',
    race: 'Light',
    masteryLevel,
    product: { itemId: id + 1000, count: 1 },
    combo: null,
    rate: { kind: 'curve', family: 'material' },
    ingredients: [{ itemId: 1, count: 1 }],
    ...more,
  }
}

function catalogOf(recipes: Recipe[], curves: Record<string, number[]> = {}, codes: RatesFile['recipes'] = {}) {
  const recipesFile: RecipesFile = { items: {}, recipes, substitutes: {}, npcPrices: {} }
  const ratesFile: RatesFile = {
    curves: { one: [1], ...curves },
    recipes: codes,
    families: { basic: FLAT, expert: FLAT, artisan: FLAT, dragonlord: FLAT, consumable: FLAT, material: FLAT },
  }
  return buildCatalog('Light', recipesFile, ratesFile)
}

interface Route {
  recipes: Recipe[]
  exp: Record<RecipeId, number>
  kina: Record<RecipeId, number> | ((recipeId: RecipeId, level: number) => number)
  curves?: Record<string, number[]>
  codes?: RatesFile['recipes']
}

function plan(route: Route, from: number, to: number) {
  const input: LevelingInput = {
    profession: 'Alchemy',
    from,
    to,
    mastery: MASTERY,
    catalog: catalogOf(route.recipes, route.curves, route.codes),
    table: TABLE,
    candidates: route.recipes,
    expOf: (recipeId) => route.exp[recipeId],
    kinaPerAttempt: typeof route.kina === 'function' ? route.kina : (recipeId) => (route.kina as Record<RecipeId, number>)[recipeId],
  }
  return planLeveling(input)
}

describe('expBetween', () => {
  it('sums the levels from `from` up to `to`, with the quest gate at 0', () => {
    expect(expBetween(TABLE, 1, 2)).toBe(10)
    expect(expBetween(TABLE, 49, 52)).toBe(490 + 0 + 510)
    expect(expBetween(TABLE, 99, 100)).toBe(990)
  })

  it('is 0 when `to` is not above `from`', () => {
    expect(expBetween(TABLE, 5, 5)).toBe(0)
    expect(expBetween(TABLE, 7, 3)).toBe(0)
  })
})

describe('expPerAttempt', () => {
  it('weighs a success at 1.0 and a failure at 0.3 of the success EXP', () => {
    // 0.8 * 1.0 + 0.2 * 0.3 = 0.86
    expect(expPerAttempt(100, { levelDiff: 0, success: 0.8, comboSuccess: 0, source: 'material' })).toBeCloseTo(86)
  })

  it('lets a combo replace the normal roll at 1.3 for a success and 0.39 for a failure', () => {
    // normal roll 0.8 * (0.8 + 0.2 * 0.3) = 0.688, combo roll 0.2 * (0.5 * 1.3 + 0.5 * 0.39) = 0.169
    expect(expPerAttempt(100, { levelDiff: 0, success: 0.8, comboSuccess: 0.5, source: 'basic' }, 0.2)).toBeCloseTo(85.7)
  })

  it('is 0 while the success rate is 0', () => {
    expect(expPerAttempt(100, { levelDiff: -1, success: 0, comboSuccess: 0, source: 'basic' }, 0.2)).toBe(0)
  })
})

describe('planLeveling', () => {
  it('switches to the cheaper recipe per EXP from the level it unlocks, merging the levels on each', () => {
    const route = { recipes: [craft(10, 1), craft(11, 3)], exp: { 10: 20, 11: 100 }, kina: { 10: 100, 11: 200 } }
    const result = plan(route, 1, 5)
    expect(result.segments).toEqual([
      { recipeId: 10, from: 1, to: 3, exp: 30, attempts: 1.5, kina: 150 },
      { recipeId: 11, from: 3, to: 5, exp: 70, attempts: 0.7, kina: 140 },
    ])
    expect(result).toMatchObject({ exp: 100, attempts: 2.2, kina: 290, quest: false, stuckAt: null })
  })

  it('breaks a tie in Kina per EXP by the lower recipe id', () => {
    const route = { recipes: [craft(12, 1), craft(11, 1)], exp: { 11: 10, 12: 20 }, kina: { 11: 50, 12: 100 } }
    expect(plan(route, 1, 3).segments.map((s) => s.recipeId)).toEqual([11])
  })

  it('stops where nothing is unlocked', () => {
    const route = { recipes: [craft(11, 3)], exp: { 11: 100 }, kina: { 11: 200 } }
    expect(plan(route, 1, 5)).toEqual({ segments: [], exp: 0, attempts: 0, kina: 0, quest: false, stuckAt: 1 })
  })

  it('stops at the first level nothing can be made, keeping the route so far', () => {
    const route = { recipes: [craft(10, 1), craft(11, 3)], exp: { 10: 20, 11: 100 }, kina: (id: RecipeId, level: number) => (level >= 3 ? Infinity : 100) }
    const result = plan(route, 1, 5)
    expect(result.segments).toEqual([{ recipeId: 10, from: 1, to: 3, exp: 30, attempts: 1.5, kina: 150 }])
    expect(result.stuckAt).toBe(3)
  })

  it('skips a recipe that cannot be made at a level, splitting the segments around it', () => {
    const route = {
      recipes: [craft(10, 1), craft(11, 1)],
      exp: { 10: 20, 11: 20 },
      kina: (id: RecipeId, level: number) => (id === 10 ? (level === 2 ? Infinity : 100) : 150),
    }
    expect(plan(route, 1, 4).segments.map((s) => [s.recipeId, s.from, s.to])).toEqual([[10, 1, 2], [11, 2, 3], [10, 3, 4]])
  })

  it('cannot use a recipe while its success rate is 0, and gains EXP as the rate rises', () => {
    const route = {
      recipes: [craft(10, 1), craft(11, 3)],
      exp: { 10: 20, 11: 20 },
      kina: { 10: 100, 11: 10 },
      curves: { rise: [0, 0.5, 1] },
      codes: { 11: { success: 'rise', combo: null } },
    }
    const result = plan(route, 1, 6)
    expect(result.segments.map((s) => [s.recipeId, s.from, s.to])).toEqual([[10, 1, 4], [11, 4, 6]])
    // level 4: 40 EXP at 20 * (0.5 + 0.5 * 0.3) = 13 per attempt; level 5: 50 EXP at 20 per attempt
    expect(result.segments[1].attempts).toBeCloseTo(40 / 13 + 50 / 20)
  })

  it('crosses level 50 by the quest, not a craft, and does not merge across it', () => {
    const route = { recipes: [craft(10, 1)], exp: { 10: 20 }, kina: { 10: 100 } }
    const result = plan(route, 49, 52)
    expect(result.segments).toEqual([
      { recipeId: 10, from: 49, to: 50, exp: 490, attempts: 24.5, kina: 2450 },
      { recipeId: 10, from: 51, to: 52, exp: 510, attempts: 25.5, kina: 2550 },
    ])
    expect(result).toMatchObject({ exp: 1000, quest: true, stuckAt: null })
  })

  it('sees the combo chance of the recipe and the mastery override at each level', () => {
    const recipe = craft(10, 1, { combo: { itemId: 2000, count: 1, chance: 0.2 }, rate: { kind: 'curve', family: 'basic' } })
    const route = { recipes: [recipe], exp: { 10: 100 }, kina: { 10: 100 } }
    // flat rates of 1: 0.8 * 1.0 + 0.2 * 1.3 = 1.06 of 100 EXP per attempt
    expect(plan(route, 1, 2).attempts).toBeCloseTo(10 / 106)
  })
})
