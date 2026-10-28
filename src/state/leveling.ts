import type { Catalog, Profession, Recipe, RecipeId } from '../domain/types.ts'
import { planWanted, type Planning } from './planning.ts'

/** The success EXP of one craft: what the player measured, else the seed, else null. */
export const expOf = (catalog: Catalog, yours: ReadonlyMap<RecipeId, number>, recipeId: RecipeId): number | null =>
  yours.get(recipeId) ?? catalog.craftExp.get(recipeId) ?? null

/** The craft recipes of `profession` with a known EXP, one per product and count (the lowest id), by mastery level. */
export function levelingCandidates(planning: Planning, profession: Profession, yours: ReadonlyMap<RecipeId, number>): Recipe[] {
  const byProduct = new Map<string, Recipe>()
  for (const recipe of planning.catalog.recipes.values()) {
    if (recipe.section !== 'craft' || recipe.profession !== profession || expOf(planning.catalog, yours, recipe.id) === null) continue
    const key = `${recipe.product.itemId}x${recipe.product.count}`
    const held = byProduct.get(key)
    if (!held || recipe.id < held.id) byProduct.set(key, recipe)
  }
  return [...byProduct.values()].sort((a, b) => a.masteryLevel - b.masteryLevel || a.id - b.id)
}

/**
 * Net Kina of one attempt at `recipe` with the profession at `level`, materials at Market prices.
 * When `sell`, what the attempt's results fetch at the lowest listing after tax comes off, so it can go negative.
 * Infinity when the recipe cannot be made.
 */
export function netKinaPerAttempt(planning: Planning, recipe: Recipe, level: number, sell: boolean): number {
  if (recipe.profession === null) return Infinity
  const { product, combo } = recipe
  const plan = planWanted(
    {
      ...planning,
      mastery: { ...planning.mastery, [recipe.profession]: level },
      // The attempt's own outputs are priced below, so the planner must not credit the combo product too.
      options: { ...planning.options, byproductCredit: false },
      // The product's other recipes make the same item, and the attempt is this recipe's.
      catalog: { ...planning.catalog, byProduct: new Map(planning.catalog.byProduct).set(product.itemId, [recipe]) },
    },
    new Map([[product.itemId, 1]]),
  )
  if (!plan || !Number.isFinite(plan.cost)) return Infinity
  const [{ root }] = plan.targets
  const cost = plan.cost / root.attempts
  if (!sell) return cost
  const afterTax = (itemId: number) => (planning.market.get(itemId)?.lowest ?? 0) * (1 - planning.options.taxRate)
  const normalShare = (1 - (combo?.chance ?? 0)) * root.successRate
  const sales = normalShare * product.count * afterTax(product.itemId) + (combo ? root.comboRate * combo.count * afterTax(combo.itemId) : 0)
  return cost - sales
}
