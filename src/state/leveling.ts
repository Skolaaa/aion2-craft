import { QUEST_LEVEL } from '../domain/leveling.ts'
import { MAX_MASTERY, type Catalog, type Mastery, type Profession, type Recipe, type RecipeId } from '../domain/types.ts'
import { clamp } from './number.ts'
import { planWanted, type Planning } from './planning.ts'
import { PROFESSIONS } from './setup.ts'
import { isFiniteNumber, isRecord, type Parse } from './usePersistentState.ts'

/** The success EXP of one craft: what the player measured, else the seed, else null. */
export const expOf = (catalog: Catalog, yours: ReadonlyMap<RecipeId, number>, recipeId: RecipeId): number | null =>
  yours.get(recipeId) ?? catalog.craftExp.get(recipeId) ?? null

/** The craft recipes of `profession` on this catalog, by mastery level then id. */
export const craftRecipes = (catalog: Catalog, profession: Profession): Recipe[] =>
  [...catalog.recipes.values()]
    .filter((recipe) => recipe.section === 'craft' && recipe.profession === profession)
    .sort((a, b) => a.masteryLevel - b.masteryLevel || a.id - b.id)

/** The craft recipes of `profession` with a known EXP, one per product and count (the lowest id), by mastery level. */
export function levelingCandidates(planning: Planning, profession: Profession, yours: ReadonlyMap<RecipeId, number>): Recipe[] {
  const byProduct = new Map<string, Recipe>()
  for (const recipe of craftRecipes(planning.catalog, profession)) {
    if (expOf(planning.catalog, yours, recipe.id) === null) continue
    const key = `${recipe.product.itemId}x${recipe.product.count}`
    if (!byProduct.has(key)) byProduct.set(key, recipe)
  }
  return [...byProduct.values()]
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
  const afterTax = (itemId: number) => {
    const quote = planning.market.get(itemId)
    // Dozens of crafts sell into real demand, not one listing: the lower of the lowest listing and the 28-day average, and nothing without a sale in 28 days.
    if (!quote || quote.lowest === null || quote.soldAvg === null) return 0
    return Math.min(quote.lowest, quote.soldAvg) * (1 - planning.options.taxRate)
  }
  const normalShare = (1 - (combo?.chance ?? 0)) * root.successRate
  const sales = normalShare * product.count * afterTax(product.itemId) + (combo ? root.comboRate * combo.count * afterTax(combo.itemId) : 0)
  return cost - sales
}

/** What the leveling view remembers. A null level follows the default for the profession, so the mastery on the Setup shows until the player picks one. */
export interface LevelingView {
  profession: Profession
  from: number | null
  to: number | null
  sell: boolean
}

export const DEFAULT_LEVELING: LevelingView = { profession: 'Blacksmithing', from: null, to: null, sell: true }

const isLevel = (raw: unknown, low: number, high: number): raw is number => isFiniteNumber(raw) && Number.isInteger(raw) && raw >= low && raw <= high

export const parseLevelingView: Parse<LevelingView> = (raw) => {
  if (!isRecord(raw)) return null
  const profession = PROFESSIONS.find(({ id }) => id === raw.profession)?.id
  if (!profession) return null
  const { from, to } = raw
  const bounded = isLevel(from, 1, MAX_MASTERY - 1) && isLevel(to, 2, MAX_MASTERY) && to > from
  return {
    profession,
    from: bounded ? from : null,
    to: bounded ? to : null,
    sell: typeof raw.sell === 'boolean' ? raw.sell : DEFAULT_LEVELING.sell,
  }
}

/** The levels the route spans: the view's own, else from the player's mastery to the quest gate, or to the cap once past it. */
export function levelRange({ profession, from, to }: LevelingView, mastery: Mastery): { from: number; to: number } {
  // Mastery at the cap is the setup default more often than a maxed profession, so the route starts at 1.
  const start = from ?? (mastery[profession] >= MAX_MASTERY ? 1 : clamp(mastery[profession], 1, MAX_MASTERY - 1))
  const end = to ?? (start < QUEST_LEVEL ? QUEST_LEVEL : MAX_MASTERY)
  return { from: start, to: Math.max(end, start + 1) }
}
