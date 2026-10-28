import { stepRates, type StepRates } from './rates.ts'
import type { Catalog, Mastery, Profession, Recipe, RecipeId } from './types.ts'

export const MAX_MASTERY = 100
export const QUEST_LEVEL = 50

// Measured on the Korean client: a failed craft gives 30% of the success EXP, a combo 130%, a failed combo 30% of that.
const FAIL_SHARE = 0.3
const COMBO_SHARE = 1.3

/** EXP from `from` to `to` on the mastery table. 0 when to <= from. */
export function expBetween(table: readonly number[], from: number, to: number): number {
  return table.slice(from - 1, to - 1).reduce((total, exp) => total + exp, 0)
}

/** Expected mastery EXP of one attempt at these rates. A combo fires with `comboChance` and replaces the normal roll. */
export function expPerAttempt(successExp: number, rates: StepRates, comboChance = 0): number {
  // A success rate of 0 is a locked recipe, not a craft that always fails, so it gives nothing.
  if (rates.success === 0) return 0
  const normal = rates.success + (1 - rates.success) * FAIL_SHARE
  const combo = (rates.comboSuccess + (1 - rates.comboSuccess) * FAIL_SHARE) * COMBO_SHARE
  return successExp * ((1 - comboChance) * normal + comboChance * combo)
}

export interface LevelingInput {
  profession: Profession
  from: number
  to: number
  mastery: Mastery
  catalog: Catalog
  table: readonly number[]
  candidates: readonly Recipe[]
  expOf(recipeId: RecipeId): number
  kinaPerAttempt(recipeId: RecipeId, level: number): number
}

export interface LevelingSegment {
  recipeId: RecipeId
  from: number
  to: number
  exp: number
  attempts: number
  kina: number
}

export interface LevelingPlan {
  segments: LevelingSegment[]
  exp: number
  attempts: number
  kina: number
  /** The route crosses level 50, which needs the profession's upgrade quest. */
  quest: boolean
  /** The first level with no usable candidate, where the route stops; null when it reaches `to`. */
  stuckAt: number | null
}

interface Pick {
  recipeId: RecipeId
  exp: number
  kina: number
  score: number
}

/** The cheapest Kina per EXP among the candidates unlocked at `level`, ties to the lowest recipe id. Null when none can be made. */
function pickAt(input: LevelingInput, level: number): Pick | null {
  const mastery = { ...input.mastery, [input.profession]: level }
  let best: Pick | null = null
  for (const recipe of input.candidates) {
    if (recipe.masteryLevel > level) continue
    const exp = expPerAttempt(input.expOf(recipe.id), stepRates(recipe, mastery, input.catalog), recipe.combo?.chance ?? 0)
    const kina = input.kinaPerAttempt(recipe.id, level)
    if (exp <= 0 || !Number.isFinite(kina)) continue
    const score = kina / exp
    if (!best || score < best.score || (score === best.score && recipe.id < best.recipeId)) best = { recipeId: recipe.id, exp, kina, score }
  }
  return best
}

/** Greedy per level: the cheapest Kina per EXP among the recipes unlocked at that level, merged over consecutive levels. */
export function planLeveling(input: LevelingInput): LevelingPlan {
  const segments: LevelingSegment[] = []
  let quest = false
  let stuckAt: number | null = null
  for (let level = input.from; level < input.to; level++) {
    if (level === QUEST_LEVEL) {
      quest = true
      continue
    }
    const pick = pickAt(input, level)
    if (!pick) {
      stuckAt = level
      break
    }
    const exp = input.table[level - 1]
    const attempts = exp / pick.exp
    const kina = attempts * pick.kina
    const last = segments[segments.length - 1]
    if (last && last.recipeId === pick.recipeId && last.to === level) {
      last.to = level + 1
      last.exp += exp
      last.attempts += attempts
      last.kina += kina
    } else {
      segments.push({ recipeId: pick.recipeId, from: level, to: level + 1, exp, attempts, kina })
    }
  }
  const total = (value: (segment: LevelingSegment) => number) => segments.reduce((sum, segment) => sum + value(segment), 0)
  return { segments, exp: total((s) => s.exp), attempts: total((s) => s.attempts), kina: total((s) => s.kina), quest, stuckAt }
}
