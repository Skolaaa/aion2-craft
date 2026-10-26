import type { Catalog, Mastery, RateSource, Recipe } from './types.ts'

export interface StepRates {
  levelDiff: number | null
  success: number
  comboSuccess: number
  source: RateSource
}

// A combo replaces the normal roll: it fires with the recipe's combo chance and then
// succeeds at comboSuccess, so `chance * comboSuccess` of attempts end in the combo result.
export function stepRates(recipe: Recipe, mastery: Mastery, catalog: Catalog): StepRates {
  if (recipe.rate.kind === 'fixed') {
    return { levelDiff: null, success: recipe.rate.success, comboSuccess: recipe.rate.success, source: 'fixed' }
  }
  const own = catalog.curves.get(recipe.id)
  const curve = own ?? catalog.families[recipe.rate.family]
  const source: RateSource = own ? 'recipe' : recipe.rate.family
  const levelDiff = (recipe.profession === null ? 0 : mastery[recipe.profession]) - recipe.masteryLevel
  if (levelDiff < 0) return { levelDiff, success: 0, comboSuccess: 0, source }
  const at = (row: number[]) => row[Math.min(levelDiff, row.length - 1)]
  return { levelDiff, success: at(curve.success), comboSuccess: curve.combo ? at(curve.combo) : 0, source }
}
