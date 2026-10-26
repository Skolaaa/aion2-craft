import type { Catalog, ItemId, Mastery, PlanResult, Profession, Recipe, RecipeId, StepPlan } from '../domain/types.ts'
import { decimal, kina, plural, rate } from './format.ts'

export type Verdict =
  | { kind: 'craft'; gap: number }
  | { kind: 'buy'; gap: number }
  | { kind: 'even' }
  | { kind: 'no-listing'; cost: number }
  | { kind: 'missing'; items: readonly ItemId[] }
  | { kind: 'blocked'; itemId: ItemId; profession: Profession | null; level: number; mastery: number | null }

export interface Answer {
  verdict: Verdict
  craft: number | null
  buy: number | null
  margin: number | null
  marginPct: number | null
}

export interface AnswerContext {
  catalog: Catalog
  mastery: Mastery
}

const childStep = (line: StepPlan['materials'][number]) =>
  line.acquisition.method === 'craft' || line.acquisition.method === 'morph' ? line.acquisition.step : null

function findStep(step: StepPlan, recipeId: RecipeId): StepPlan | null {
  if (step.recipeId === recipeId) return step
  for (const line of step.materials) {
    const child = childStep(line)
    const found = child && findStep(child, recipeId)
    if (found) return found
  }
  return null
}

function verdictOf(plan: PlanResult, craft: number | null, buy: number | null, { catalog, mastery }: AnswerContext): Verdict {
  const blocked = plan.blocked[0]
  if (blocked !== undefined) {
    const recipe = catalog.recipes.get(blocked)
    const profession = recipe?.profession ?? null
    return {
      kind: 'blocked',
      itemId: findStep(plan.root, blocked)?.itemId ?? plan.target.itemId,
      profession,
      level: recipe?.masteryLevel ?? 0,
      mastery: profession ? mastery[profession] : null,
    }
  }
  if (craft === null) return { kind: 'missing', items: plan.missing }
  if (buy === null) return { kind: 'no-listing', cost: craft }
  const gap = buy - craft
  if (Math.round(gap) === 0) return { kind: 'even' }
  return gap > 0 ? { kind: 'craft', gap } : { kind: 'buy', gap: -gap }
}

export function answerOf(plan: PlanResult, context: AnswerContext): Answer {
  const craft = Number.isFinite(plan.cost) ? plan.cost : null
  const buy = plan.market ? plan.market.lowest * plan.target.quantity : null
  return { verdict: verdictOf(plan, craft, buy, context), craft, buy, margin: plan.margin, marginPct: plan.marginPct }
}

export interface Names {
  itemName(itemId: ItemId): string
  worldName: string
}

export function sentenceOf(verdict: Verdict, { itemName, worldName }: Names): string {
  switch (verdict.kind) {
    case 'craft':
      return `Craft it. Expected cost is ${kina(verdict.gap)} Kina under the lowest listing.`
    case 'buy':
      return `Buy it. The lowest listing is ${kina(verdict.gap)} Kina under the expected cost.`
    case 'even':
      return 'Either works. Crafting costs the same as the lowest listing.'
    case 'no-listing':
      return `There is no listing on ${worldName} to compare with. Expected cost is ${kina(verdict.cost)} Kina.`
    case 'missing': {
      const [first] = verdict.items
      const lead =
        first === undefined ? '' : verdict.items.length === 1 ? `${itemName(first)} has no price. ` : `${verdict.items.length} materials have no price. `
      return `${lead}Enter the missing prices to compare.`
    }
    case 'blocked': {
      const need = verdict.profession ? `${verdict.profession} ${verdict.level}` : `mastery ${verdict.level}`
      const have = verdict.mastery === null ? '' : `, and your mastery is ${verdict.mastery}`
      return `Crafting ${itemName(verdict.itemId)} needs ${need}${have}.`
    }
  }
}

// "4.13 attempts at 96.8% with a 25% combo" when the combo result is the one wanted, ", 25% combo
// instead" when combos make the other result, or what the step lacks to be attempted at all.
export function stepSummary(step: StepPlan, recipe: Recipe | undefined, mastery: Mastery, digits = 2): string {
  if (step.successRate === 0) {
    if (!recipe?.profession) return 'needs more mastery'
    return `needs ${recipe.profession} ${recipe.masteryLevel}, yours is ${mastery[recipe.profession]}`
  }
  const combo = recipe?.combo
  const note =
    !combo || combo.itemId === recipe.product.itemId ? '' : step.wantCombo ? ` with a ${rate(combo.chance)} combo` : `, ${rate(combo.chance)} combo instead`
  return `${decimal(step.attempts, digits)} ${plural(step.attempts, 'attempt', 'attempts')} at ${rate(step.successRate)}${note}`
}

export type BuyLine =
  | { kind: 'buy'; itemId: ItemId; expected: number; unit: number; subtotal: number }
  | { kind: 'missing'; itemId: ItemId; expected: number }

// The shopping list as planCraft aggregates it, with the unpriced items first and the
// byproduct credit that turns its sum into plan.cost.
export function buyList(plan: PlanResult): { lines: BuyLine[]; credit: number } {
  const missing = new Map<ItemId, number>()
  let credit = 0
  const walk = (step: StepPlan) => {
    for (const byproduct of step.byproducts) credit += byproduct.credit
    for (const line of step.materials) {
      const child = childStep(line)
      if (child) walk(child)
      else if (line.acquisition.method === 'none') missing.set(line.itemId, (missing.get(line.itemId) ?? 0) + line.expected)
    }
  }
  walk(plan.root)
  const unpriced: BuyLine[] = [...missing].map(([itemId, expected]) => ({ kind: 'missing', itemId, expected }))
  const bought: BuyLine[] = plan.shopping.map((entry) => ({ kind: 'buy', ...entry }))
  return { lines: [...unpriced, ...bought], credit }
}

// Per item, so it compares with aion2.exchange's estimate for one.
export const estimateGap = (plan: PlanResult, theirs: number): number | null =>
  Number.isFinite(plan.unitCost) ? plan.unitCost - theirs : null
