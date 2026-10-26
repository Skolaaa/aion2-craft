import { describe, expect, it } from 'vitest'
import { buildCatalog, type RatesFile, type RecipesFile } from '../domain/catalog.ts'
import { planCraft } from '../domain/planCraft.ts'
import { makePriceBook } from '../domain/priceBook.ts'
import type { Catalog, ItemId, Mastery, PlanResult, Recipe } from '../domain/types.ts'
import { answerOf, buyList, sentenceOf, stepSummary, type Answer } from './answer.ts'

const SWORD = 1
const BLADE = 2
const IRON = 10
const WOOD = 11
const NAMES: Record<number, string> = { [SWORD]: 'Sword', [BLADE]: 'Blade', [IRON]: 'Iron', [WOOD]: 'Wood' }
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

function answer(recipes: Recipe[], market: Record<number, number>, quantity = 1, mastery = MASTERY): { plan: PlanResult; answer: Answer; catalog: Catalog } {
  const catalog = catalogOf(recipes)
  const prices = makePriceBook({
    manual: new Map(),
    market: new Map(Object.entries(market).map(([id, lowest]) => [Number(id), { lowest, listings: 3, soldAvg: null, capturedAt: '' }])),
    npc: new Map(),
  })
  const plan = planCraft({
    target: { itemId: SWORD, quantity },
    mastery,
    options: { allowCraft: true, allowMorph: true, byproductCredit: false, taxRate: 0.05 },
    world: catalog,
    prices,
  })
  if (!plan) throw new Error('no plan')
  return { plan, answer: answerOf(plan, { catalog, mastery }), catalog }
}

const sentence = (result: ReturnType<typeof answer>) =>
  sentenceOf(result.answer.verdict, { itemName: (id) => NAMES[id] ?? String(id), worldName: 'Siel', taxRate: 0.05 })

describe('answerOf', () => {
  it('says craft when the expected cost is under the lowest listing, with the spec sentence', () => {
    const result = answer(ONE_STEP, { [IRON]: 9_266_311, [SWORD]: 20_000_000 })
    expect(result.answer).toMatchObject({ craft: 18_532_622, buy: 20_000_000, verdict: { kind: 'craft', gap: 1_467_378 } })
    expect(result.answer.verdict).toMatchObject({ margin: expect.closeTo(467_378, 6) })
    expect(result.answer.margin).toBeCloseTo(467_378, 6)
    expect(sentence(result)).toBe('Craft it if you need one. Expected cost is 1,467,378 Kina under the lowest listing. Selling one earns 467,378 Kina after 5% tax.')
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
})

describe('buyList', () => {
  it('lists unpriced items first with their expected count summed across steps', () => {
    const recipes = [recipe(100, SWORD, [[BLADE, 1], [WOOD, 2]]), recipe(101, BLADE, [[WOOD, 3], [IRON, 1]])]
    const { plan } = answer(recipes, { [IRON]: 50 })
    const { lines, credit } = buyList(plan)
    expect(lines).toEqual([
      { kind: 'missing', itemId: WOOD, expected: 5 },
      { kind: 'buy', itemId: IRON, expected: 1, unit: 50, subtotal: 50 },
    ])
    expect(credit).toBe(0)
  })
})

describe('stepSummary', () => {
  it('describes the attempts and rate, or the mastery a step lacks', () => {
    const ready = answer(ONE_STEP, { [IRON]: 1 })
    expect(stepSummary(ready.plan.root, ready.catalog.recipes.get(100), MASTERY)).toBe('1 attempt at 100%')

    const withCombo = answer([recipe(100, SWORD, [[IRON, 1]], { combo: { itemId: BLADE, count: 1, chance: 0.25 } })], { [IRON]: 1 })
    expect(stepSummary(withCombo.plan.root, withCombo.catalog.recipes.get(100), MASTERY)).toBe('1.33 attempts at 100%, 25% combo instead')

    const locked = answer([recipe(100, SWORD, [[IRON, 2]], { masteryLevel: 30 })], {})
    expect(stepSummary(locked.plan.root, locked.catalog.recipes.get(100), MASTERY)).toBe('needs Blacksmithing 30, yours is 10')
  })
})
