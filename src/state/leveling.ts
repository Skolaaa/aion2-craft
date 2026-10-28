import type { Catalog, RecipeId } from '../domain/types.ts'

/** The success EXP of one craft: what the player measured, else the seed, else null. */
export const expOf = (catalog: Catalog, yours: ReadonlyMap<RecipeId, number>, recipeId: RecipeId): number | null =>
  yours.get(recipeId) ?? catalog.craftExp.get(recipeId) ?? null
