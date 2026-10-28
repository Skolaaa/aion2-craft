import { describe, expect, it } from 'vitest'
import { buildCatalog, type RatesFile, type RecipesFile } from '../domain/catalog.ts'
import type { Recipe } from '../domain/types.ts'
import { expOf } from './leveling.ts'

const FLAT = { success: 'one', combo: 'one' }

function craft(id: number, more: Partial<Recipe> = {}): Recipe {
  return {
    id,
    section: 'craft',
    name: `recipe ${id}`,
    profession: 'Alchemy',
    race: 'Light',
    masteryLevel: 1,
    product: { itemId: id + 1000, count: 1 },
    combo: null,
    rate: { kind: 'curve', family: 'material' },
    ingredients: [{ itemId: 1, count: 1 }],
    ...more,
  }
}

function catalogOf(recipes: Recipe[], craftExp: Record<string, number> = {}) {
  const recipesFile: RecipesFile = { items: {}, recipes, substitutes: {}, npcPrices: {} }
  const ratesFile: RatesFile = {
    curves: { one: [1] },
    recipes: {},
    families: { basic: FLAT, expert: FLAT, artisan: FLAT, dragonlord: FLAT, consumable: FLAT, material: FLAT },
  }
  return buildCatalog('Light', recipesFile, ratesFile, craftExp)
}

describe('expOf', () => {
  const catalog = catalogOf([craft(10), craft(11), craft(12, { race: 'Dark' })], { 10: 20, 12: 50 })

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
