import { describe, expect, it } from 'vitest'
import { buildCatalog, type RatesFile, type RecipesFile } from '../domain/catalog.ts'
import { planCraft } from '../domain/planCraft.ts'
import { makePriceBook } from '../domain/priceBook.ts'
import type { Alternative, Catalog, ItemId, Mastery, Owned, PlanResult, PriceBook, Recipe, Wanted } from '../domain/types.ts'
import {
  answerOf, blockedNote, bulkBuys, buyList, depthCapturedAt, depthNote, extraCost, listSentenceOf, sentenceOf, stepSummary, successNote, targetStatus,
  type Answer,
} from './answer.ts'

const SWORD = 1
const BLADE = 2
const SHIELD = 3
const IRON = 10
const WOOD = 11
const NAMES: Record<number, string> = { [SWORD]: 'Sword', [BLADE]: 'Blade', [SHIELD]: 'Shield', [IRON]: 'Iron', [WOOD]: 'Wood' }
const MASTERY: Mastery = { Blacksmithing: 10, Tailoring: 0, Jewelcrafting: 0, Alchemy: 0, Cooking: 0 }
const FLAT = { success: 'one', combo: 'one' }

function recipe(id: number, product: ItemId, ingredients: [ItemId, number][], more: Partial<Recipe> = {}): Recipe {
  return {
    id,
    section: 'craft',
    name: NAMES[product] ?? String(product),
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

function catalogOf(recipes: Recipe[]): Catalog {
  const items = Object.fromEntries(Object.entries(NAMES).map(([id, name]) => [id, { name, grade: 'Rare', icon: null }]))
  const recipesFile: RecipesFile = { items, recipes, substitutes: {}, npcPrices: {} }
  const ratesFile: RatesFile = {
    curves: { one: [1] },
    recipes: {},
    families: { basic: FLAT, expert: FLAT, artisan: FLAT, dragonlord: FLAT, consumable: FLAT, material: FLAT },
  }
  return buildCatalog('Light', recipesFile, ratesFile)
}

const ONE_STEP = [recipe(100, SWORD, [[IRON, 2]])]

function answer(
  recipes: Recipe[], market: Record<number, number>, quantity: number | Wanted = 1, mastery = MASTERY, owned?: Owned,
): { plan: PlanResult; answer: Answer; catalog: Catalog; prices: PriceBook } {
  const catalog = catalogOf(recipes)
  const prices = makePriceBook({
    manual: new Map(),
    market: new Map(Object.entries(market).map(([id, lowest]) => [Number(id), { lowest, listings: 3, soldAvg: null, capturedAt: '' }])),
    npc: new Map(),
  })
  const plan = planCraft({
    wanted: typeof quantity === 'number' ? new Map([[SWORD, quantity]]) : quantity,
    mastery,
    options: { allowCraft: true, allowMorph: true, byproductCredit: false, taxRate: 0.05 },
    world: catalog,
    prices,
    owned,
  })
  if (!plan) throw new Error('no plan')
  return { plan, answer: answerOf(plan, { catalog, mastery }), catalog, prices }
}

const names = { itemName: (id: number) => NAMES[id] ?? String(id), worldName: 'Siel', taxRate: 0.05 }
const segments = (result: ReturnType<typeof answer>) => sentenceOf(result.answer.verdict, names)
const sentence = (result: ReturnType<typeof answer>) => segments(result).map((segment) => segment.text).join('')
const listSentence = (result: ReturnType<typeof answer>) =>
  listSentenceOf(result.plan, result.answer.verdict, names).map((segment) => segment.text).join('')

describe('answerOf', () => {
  it('says craft when the expected cost is under the lowest listing, with the spec sentence', () => {
    const result = answer(ONE_STEP, { [IRON]: 9_266_311, [SWORD]: 20_000_000 })
    expect(result.answer).toMatchObject({ craft: 18_532_622, buy: 20_000_000, verdict: { kind: 'craft', gap: 1_467_378 } })
    expect(result.answer.verdict).toMatchObject({ margin: expect.closeTo(467_378, 6) })
    expect(result.answer.margin).toBeCloseTo(467_378, 6)
    expect(sentence(result)).toBe('Craft it if you need one. Expected cost is 1,467,378 Kina under the lowest listing. Selling one earns 467,378 Kina after 5% tax.')
    expect(segments(result).filter((segment) => segment.kind !== 'text')).toEqual([
      { kind: 'kina', text: '1,467,378' },
      { kind: 'kina', text: '467,378' },
      { kind: 'percent', text: '5%' },
    ])
  })

  it('says buy when the lowest listing is under the expected cost', () => {
    const result = answer(ONE_STEP, { [IRON]: 600, [SWORD]: 1000 })
    expect(result.answer.verdict).toEqual({ kind: 'buy', gap: 200, margin: -250 })
    expect(sentence(result)).toBe('Buy it if you need one. The lowest listing is 200 Kina under the expected cost. Selling one would lose 250 Kina after 5% tax.')
  })

  it('calls a gap under half a Kina even', () => {
    const result = answer(ONE_STEP, { [IRON]: 500.2, [SWORD]: 1000 })
    expect(result.answer.verdict).toEqual({ kind: 'even' })
  })

  it('compares the whole quantity with the listing times the quantity', () => {
    const result = answer(ONE_STEP, { [IRON]: 100, [SWORD]: 1000 }, 3)
    expect(result.answer).toMatchObject({ craft: 600, buy: 3000, verdict: { kind: 'craft', gap: 2400 } })
  })

  it('keeps the cost and says so when nobody lists the item', () => {
    const result = answer(ONE_STEP, { [IRON]: 100 })
    expect(result.answer).toMatchObject({ craft: 200, buy: null, margin: null, verdict: { kind: 'no-listing', cost: 200 } })
    expect(sentence(result)).toBe('There is no listing on Siel to compare with. Expected cost is 200 Kina.')
  })

  it('asks for the missing prices and names a single one', () => {
    const one = answer(ONE_STEP, { [SWORD]: 1000 })
    expect(one.answer).toMatchObject({ craft: null, buy: 1000, verdict: { kind: 'missing', items: [IRON] } })
    expect(sentence(one)).toBe('Iron has no price. Enter the missing prices to compare.')

    const two = answer([recipe(100, SWORD, [[IRON, 2], [WOOD, 1]])], { [SWORD]: 1000 })
    expect(sentence(two)).toBe('2 materials have no price. Enter the missing prices to compare.')
  })

  it('names the profession and level of a recipe above the mastery, before any missing price', () => {
    const result = answer([recipe(100, SWORD, [[IRON, 2]], { masteryLevel: 30 })], { [SWORD]: 1000 })
    expect(result.answer.verdict).toEqual({ kind: 'blocked', itemId: SWORD, profession: 'Blacksmithing', level: 30, mastery: 10 })
    expect(sentence(result)).toBe('Crafting Sword needs Blacksmithing 30, and your mastery is 10.')
  })

  it('names the intermediate item whose recipe is out of reach', () => {
    const recipes = [recipe(100, SWORD, [[BLADE, 1], [IRON, 1]]), recipe(101, BLADE, [[IRON, 3]], { masteryLevel: 25 })]
    const result = answer(recipes, { [IRON]: 10, [SWORD]: 1000 })
    expect(result.answer.verdict).toMatchObject({ kind: 'blocked', itemId: BLADE, level: 25 })
    expect(sentence(result)).toBe('Crafting Blade needs Blacksmithing 25, and your mastery is 10.')
  })

  describe('over a list', () => {
    const recipes = [recipe(100, SWORD, [[IRON, 2]]), recipe(101, SHIELD, [[IRON, 1], [WOOD, 1]])]
    const both: Wanted = new Map([[SWORD, 2], [SHIELD, 1]])

    it('sums craft, buy and margin over the targets', () => {
      const result = answer(recipes, { [IRON]: 100, [WOOD]: 50, [SWORD]: 1000, [SHIELD]: 500 }, both)
      expect(result.answer).toMatchObject({ craft: 550, buy: 2500, verdict: { kind: 'craft', gap: 1950 } })
      expect(result.answer.margin).toBeCloseTo(2500 * 0.95 - 550)
      expect(result.answer.marginPct).toBeCloseTo((2500 * 0.95 - 550) / 550)
    })

    it('has no buy total and no margin while any target lacks a listing', () => {
      const result = answer(recipes, { [IRON]: 100, [WOOD]: 50, [SWORD]: 1000 }, both)
      expect(result.answer).toMatchObject({ craft: 550, buy: null, margin: null, marginPct: null, verdict: { kind: 'no-listing', cost: 550 } })
    })

    it('names the blocked item of whichever target holds it', () => {
      const locked = [recipe(100, SWORD, [[IRON, 2]]), recipe(101, SHIELD, [[BLADE, 1]]), recipe(102, BLADE, [[IRON, 3]], { masteryLevel: 25 })]
      const result = answer(locked, { [IRON]: 10, [SWORD]: 1000, [SHIELD]: 1000 }, both)
      expect(result.answer.verdict).toMatchObject({ kind: 'blocked', itemId: BLADE, level: 25 })
      expect(listSentence(result)).toBe('Crafting Blade needs Blacksmithing 25, and your mastery is 10.')
    })

    it('says whether crafting the whole list beats buying it, and which members are cheaper to buy', () => {
      const craft = answer(recipes, { [IRON]: 100, [WOOD]: 50, [SWORD]: 1000, [SHIELD]: 120 }, both)
      expect(listSentence(craft)).toBe('Crafting the list costs 1,570 Kina under buying it all. Shield is cheaper to buy than to craft.')
      const buy = answer(recipes, { [IRON]: 100, [WOOD]: 50, [SWORD]: 150, [SHIELD]: 120 }, both)
      expect(listSentence(buy)).toBe('Buying it all costs 130 Kina under crafting the list. Sword and Shield are cheaper to buy than to craft.')
      const even = answer(recipes, { [IRON]: 100, [WOOD]: 50, [SWORD]: 200, [SHIELD]: 150 }, both)
      expect(listSentence(even)).toBe('Crafting the list costs the same as buying it all.')
    })

    it('names the member with no listing instead of comparing', () => {
      const one = answer(recipes, { [IRON]: 100, [WOOD]: 50, [SWORD]: 1000 }, both)
      expect(listSentence(one)).toBe('Shield has no listing on Siel to compare with. Crafting the list costs 550 Kina.')
      const none = answer(recipes, { [IRON]: 100, [WOOD]: 50 }, both)
      expect(listSentence(none)).toBe('2 items on the list have no listing on Siel to compare with. Crafting the list costs 550 Kina.')
    })
  })
})

describe('targetStatus', () => {
  it('reads a nested blocked recipe as locked, a missing price as unpriced, and the rest as ready', () => {
    const recipes = [recipe(100, SWORD, [[IRON, 2]]), recipe(101, SHIELD, [[BLADE, 1]]), recipe(102, BLADE, [[WOOD, 3]], { masteryLevel: 25 })]
    const both: Wanted = new Map([[SWORD, 1], [SHIELD, 1]])
    const { plan } = answer(recipes, { [IRON]: 10, [WOOD]: 10, [BLADE]: 1000 }, both)
    expect(plan.targets.map(targetStatus)).toEqual(['ready', 'ready'])
    const locked = answer(recipes, { [IRON]: 10, [WOOD]: 10 }, both)
    expect(locked.plan.targets.map(targetStatus)).toEqual(['ready', 'locked'])
    const unpriced = answer(recipes, { [WOOD]: 10, [BLADE]: 1000 }, both)
    expect(unpriced.plan.targets.map(targetStatus)).toEqual(['unpriced', 'ready'])
  })
})

describe('successNote', () => {
  it('says where the success rate comes from, or that the step cannot be attempted', () => {
    expect(successNote({ successRate: 0.9, rateSource: 'recipe' })).toBe("The chance an attempt succeeds, from the game client's curve for this recipe.")
    expect(successNote({ successRate: 1, rateSource: 'fixed' })).toBe('The chance an attempt succeeds, a fixed rate for this recipe.')
    expect(successNote({ successRate: 0.5, rateSource: 'dragonlord' })).toBe(
      'The chance an attempt succeeds, from the Dragon Lord curve, since the client lists none for this recipe.',
    )
    expect(successNote({ successRate: 0, rateSource: 'recipe' })).toBe('Your mastery is below the recipe level, so it cannot be attempted.')
  })
})

describe('buyList', () => {
  it('lists unpriced items first with their expected count summed across steps', () => {
    const recipes = [recipe(100, SWORD, [[BLADE, 1], [WOOD, 2]]), recipe(101, BLADE, [[WOOD, 3], [IRON, 1]])]
    const { plan } = answer(recipes, { [IRON]: 50 })
    const { lines, credit } = buyList(plan)
    expect(lines).toEqual([
      { kind: 'missing', itemId: WOOD, expected: 5, owned: 0 },
      { kind: 'buy', itemId: IRON, expected: 1, owned: 0, unit: 50, subtotal: 50, depth: null },
    ])
    expect(credit).toBe(0)
  })

  it('merges a line that stock covers in one step with the same item bought in another, and lists fully held items last', () => {
    const recipes = [recipe(100, SWORD, [[BLADE, 1], [WOOD, 2]]), recipe(101, BLADE, [[WOOD, 3], [IRON, 1]])]
    const { plan } = answer(recipes, { [IRON]: 50, [WOOD]: 10 }, 1, MASTERY, new Map([[WOOD, 2], [IRON, 5]]))
    const { lines } = buyList(plan)
    expect(lines).toEqual([
      { kind: 'buy', itemId: WOOD, expected: 5, owned: 2, unit: 10, subtotal: 30, depth: null },
      { kind: 'owned', itemId: IRON, expected: 1, owned: 1 },
    ])
    expect(plan.cost).toBe(30)
  })

  it('sums a material two targets need into one line, with the stock spent once', () => {
    const recipes = [recipe(100, SWORD, [[IRON, 2]]), recipe(101, SHIELD, [[IRON, 3], [WOOD, 1]])]
    const { plan } = answer(recipes, { [IRON]: 10 }, new Map([[SWORD, 1], [SHIELD, 1]]), MASTERY, new Map([[IRON, 4]]))
    expect(buyList(plan).lines).toEqual([
      { kind: 'missing', itemId: WOOD, expected: 1, owned: 0 },
      { kind: 'buy', itemId: IRON, expected: 5, owned: 4, unit: 10, subtotal: 10, depth: null },
    ])
  })
})

describe('stepSummary', () => {
  it('describes the attempts and rate, or the mastery a step lacks', () => {
    const rootOf = (result: ReturnType<typeof answer>) => result.plan.targets[0].root
    const ready = answer(ONE_STEP, { [IRON]: 1 })
    expect(stepSummary(rootOf(ready), ready.catalog.recipes.get(100), MASTERY)).toBe('1 attempt at 100%')

    const withCombo = answer([recipe(100, SWORD, [[IRON, 1]], { combo: { itemId: BLADE, count: 1, chance: 0.25 } })], { [IRON]: 1 })
    expect(stepSummary(rootOf(withCombo), withCombo.catalog.recipes.get(100), MASTERY)).toBe('1.33 attempts at 100%, 25% combo instead')

    const locked = answer([recipe(100, SWORD, [[IRON, 2]], { masteryLevel: 30 })], {})
    expect(stepSummary(rootOf(locked), locked.catalog.recipes.get(100), MASTERY)).toBe('needs Blacksmithing 30, yours is 10')
  })
})

describe('source choices', () => {
  const craftWay = (result: ReturnType<typeof answer>, itemId: ItemId) => {
    const way = result.plan.alternatives.get(itemId)?.find((option) => option.method === 'craft')
    if (!way || way.method === 'buy') throw new Error('no craft way')
    return way
  }

  it('says why a listed way cannot be used', () => {
    const locked = answer([recipe(100, SWORD, [[BLADE, 1]]), recipe(101, BLADE, [[IRON, 1]], { masteryLevel: 30 })], { [BLADE]: 50, [IRON]: 1 })
    expect(craftWay(locked, BLADE).unit).toBe(Infinity)
    expect(blockedNote(craftWay(locked, BLADE), { catalog: locked.catalog, mastery: MASTERY })).toBe('needs Blacksmithing 30, yours is 10')
    const unpriced = answer([recipe(100, SWORD, [[BLADE, 1]]), recipe(101, BLADE, [[IRON, 1]])], { [BLADE]: 50 })
    expect(blockedNote(craftWay(unpriced, BLADE), { catalog: unpriced.catalog, mastery: MASTERY })).toBe('a material of it has no price yet')
  })

  it('prices a chosen way against the cheapest usable one for the line', () => {
    const ways: Alternative[] = [{ method: 'buy', unit: 100 }, { method: 'craft', unit: 20, recipeId: 2 }, { method: 'morph', unit: Infinity, recipeId: 3 }]
    expect(extraCost(ways, 'buy', 2.5)).toEqual({ over: 'craft', kina: 200 })
    expect(extraCost(ways, 'craft', 2.5)).toBeNull()
    expect(extraCost(ways, 'buy', 0)).toBeNull()
    expect(extraCost([{ method: 'buy', unit: 100 }, { method: 'craft', unit: 100.2, recipeId: 2 }], 'craft', 1)).toBeNull()
  })
})

describe('depth helpers', () => {
  const depth = (units: number, available: number, listings = 3, complete = true, capturedAt = '2026-10-06T11:53:19Z') => ({
    units, cost: 0, listings, levels: 2, available, complete, capturedAt,
  })

  it('names the listings spanned and the shortfall when the ladder runs out', () => {
    expect(depthNote(depth(5, 20))).toBe('across 3 listings')
    expect(depthNote(depth(5, 20), 15)).toBe('across 3 listings of 15')
    expect(depthNote(depth(5, 20, 1))).toBe('across 1 listing')
    expect(depthNote(depth(25, 20))).toBe('across all 3 listings, only 20 listed')
    expect(depthNote(depth(25, 20), 15)).toBe('across all 3 listings, only 20 listed')
    expect(depthNote(depth(25, 20, 3, false))).toBe('across the 3 listings captured')
  })

  it('asks for ladders of market-priced items bought in bulk beyond the stock held, and the target when buying several', () => {
    const recipes = [recipe(100, SWORD, [[BLADE, 1], [WOOD, 2], [IRON, 1]])]
    const { plan, prices } = answer(recipes, { [SWORD]: 500, [BLADE]: 50, [IRON]: 50, [WOOD]: 5 })
    expect(bulkBuys(plan, prices)).toEqual([WOOD])
    const held = answer(recipes, { [SWORD]: 500, [BLADE]: 50, [IRON]: 50, [WOOD]: 5 }, 1, MASTERY, new Map([[WOOD, 1]]))
    expect(bulkBuys(held.plan, held.prices)).toEqual([])
    const several = answer(recipes, { [SWORD]: 500, [BLADE]: 50, [IRON]: 50, [WOOD]: 5 }, 2)
    expect(several.plan.targets[0].market?.cost).toBe(1000)
    expect(bulkBuys(several.plan, several.prices)).toEqual([SWORD, BLADE, IRON, WOOD])
    const both = answer([...recipes, recipe(101, SHIELD, [[IRON, 1]])], { [SWORD]: 500, [SHIELD]: 100, [BLADE]: 50, [IRON]: 50, [WOOD]: 5 }, new Map([[SWORD, 1], [SHIELD, 3]]))
    expect(bulkBuys(both.plan, both.prices)).toEqual([SHIELD, IRON, WOOD])
  })

  it('reports the oldest depth poll a plan relies on', () => {
    const recipes = [recipe(100, SWORD, [[WOOD, 2]])]
    const { plan } = answer(recipes, { [WOOD]: 5 })
    expect(depthCapturedAt(plan)).toBeNull()
    const shopping = [{ ...plan.shopping[0], depth: depth(2, 9, 2, true, '2026-10-20T00:00:00Z') }]
    const market = { lowest: 1, soldAvg: null, listings: 1, cost: 1, depth: depth(1, 1) }
    expect(depthCapturedAt({ ...plan, shopping, targets: [{ ...plan.targets[0], market }] })).toBe('2026-10-06T11:53:19Z')
  })
})
