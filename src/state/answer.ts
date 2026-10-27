import type { Acquisition, Catalog, ItemId, Mastery, PlanResult, Profession, RateFamily, Recipe, RecipeId, StepPlan } from '../domain/types.ts'
import { decimal, kina, plural, rate, taxLabel } from './format.ts'

export type Verdict =
  | { kind: 'craft'; gap: number; margin: number }
  | { kind: 'buy'; gap: number; margin: number }
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

interface AnswerContext {
  catalog: Catalog
  mastery: Mastery
}

export const childStep = (acquisition: Acquisition): StepPlan | null =>
  acquisition.method === 'craft' || acquisition.method === 'morph' ? acquisition.step : null

function* stepsOf(step: StepPlan): Generator<StepPlan> {
  yield step
  for (const line of step.materials) {
    const child = childStep(line.acquisition)
    if (child) yield* stepsOf(child)
  }
}

function findStep(root: StepPlan, recipeId: RecipeId): StepPlan | null {
  for (const step of stepsOf(root)) if (step.recipeId === recipeId) return step
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
  const margin = plan.margin ?? 0
  return gap > 0 ? { kind: 'craft', gap, margin } : { kind: 'buy', gap: -gap, margin }
}

export function answerOf(plan: PlanResult, context: AnswerContext): Answer {
  const craft = Number.isFinite(plan.cost) ? plan.cost : null
  const buy = plan.market ? plan.market.lowest * plan.target.quantity : null
  return { verdict: verdictOf(plan, craft, buy, context), craft, buy, margin: plan.margin, marginPct: plan.marginPct }
}

interface Names {
  itemName(itemId: ItemId): string
  worldName: string
  taxRate: number
}

export interface Segment {
  kind: 'text' | 'kina' | 'percent'
  text: string
}

const kinaOf = (value: number): Segment => ({ kind: 'kina', text: kina(value) })

function said(strings: TemplateStringsArray, ...parts: (string | Segment | readonly Segment[])[]): Segment[] {
  const segments: Segment[] = []
  const add = (segment: Segment) => {
    if (segment.text !== '') segments.push(segment)
  }
  strings.forEach((text, index) => {
    add({ kind: 'text', text })
    const part = parts[index]
    if (part === undefined) return
    if (typeof part === 'string') add({ kind: 'text', text: part })
    else if ('kind' in part) add(part)
    else part.forEach(add)
  })
  return segments
}

function sellClause(margin: number, taxRate: number): Segment[] {
  const tax: Segment = { kind: 'percent', text: taxLabel(taxRate) }
  if (Math.round(margin) === 0) return said` Selling one would break even after ${tax} tax.`
  return margin > 0 ? said` Selling one earns ${kinaOf(margin)} Kina after ${tax} tax.` : said` Selling one would lose ${kinaOf(-margin)} Kina after ${tax} tax.`
}

export function sentenceOf(verdict: Verdict, { itemName, worldName, taxRate }: Names): Segment[] {
  switch (verdict.kind) {
    case 'craft':
      return said`Craft it if you need one. Expected cost is ${kinaOf(verdict.gap)} Kina under the lowest listing.${sellClause(verdict.margin, taxRate)}`
    case 'buy':
      return said`Buy it if you need one. The lowest listing is ${kinaOf(verdict.gap)} Kina under the expected cost.${sellClause(verdict.margin, taxRate)}`
    case 'even':
      return said`Either works. Crafting costs the same as the lowest listing.`
    case 'no-listing':
      return said`There is no listing on ${worldName} to compare with. Expected cost is ${kinaOf(verdict.cost)} Kina.`
    case 'missing': {
      const [first] = verdict.items
      const lead =
        first === undefined ? '' : verdict.items.length === 1 ? `${itemName(first)} has no price. ` : `${verdict.items.length} materials have no price. `
      return said`${lead}Enter the missing prices to compare.`
    }
    case 'blocked': {
      const need = verdict.profession ? `${verdict.profession} ${verdict.level}` : `mastery ${verdict.level}`
      const have = verdict.mastery === null ? '' : `, and your mastery is ${verdict.mastery}`
      return said`Crafting ${itemName(verdict.itemId)} needs ${need}${have}.`
    }
  }
}

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

const FAMILY_NOTE: Record<RateFamily, string> = {
  basic: 'the basic equipment curve',
  expert: "the Expert's curve",
  artisan: "the Artisan's curve",
  dragonlord: 'the Dragon Lord curve',
  consumable: 'the consumable curve',
  material: 'the material curve',
}

export function successNote(step: Pick<StepPlan, 'successRate' | 'rateSource'>): string {
  if (step.successRate === 0) return 'Your mastery is below the recipe level, so it cannot be attempted.'
  const source =
    step.rateSource === 'recipe'
      ? "from the game client's curve for this recipe"
      : step.rateSource === 'fixed'
        ? 'a fixed rate for this recipe'
        : `from ${FAMILY_NOTE[step.rateSource]}, since the client lists none for this recipe`
  return `The chance an attempt succeeds, ${source}.`
}

export type BuyLine =
  | { kind: 'buy'; itemId: ItemId; expected: number; owned: number; unit: number; subtotal: number }
  | { kind: 'missing'; itemId: ItemId; expected: number; owned: number }
  | { kind: 'owned'; itemId: ItemId; expected: number; owned: number }

export interface BuyList {
  lines: BuyLine[]
  credit: number
}

type Tally = { expected: number; owned: number }

const tally = (map: Map<ItemId, Tally>, itemId: ItemId, expected: number, owned: number) => {
  const entry = map.get(itemId) ?? { expected: 0, owned: 0 }
  entry.expected += expected
  entry.owned += owned
  map.set(itemId, entry)
}

/** Unpriced items first, then what is bought by subtotal, then what the player's stock covers in full. */
export function buyList(plan: PlanResult): BuyList {
  const missing = new Map<ItemId, Tally>()
  const covered = new Map<ItemId, Tally>()
  let credit = 0
  for (const step of stepsOf(plan.root)) {
    for (const byproduct of step.byproducts) credit += byproduct.credit
    for (const line of step.materials) {
      if (line.acquisition.method === 'none') tally(missing, line.itemId, line.expected, line.owned)
      else if (line.acquisition.method === 'owned') tally(covered, line.itemId, line.expected, line.owned)
    }
  }
  const unpriced: BuyLine[] = [...missing].map(([itemId, { expected, owned }]) => ({ kind: 'missing', itemId, expected, owned }))
  const bought: BuyLine[] = plan.shopping.map((entry) => ({ kind: 'buy', ...entry }))
  for (const line of [...unpriced, ...bought]) {
    const also = covered.get(line.itemId)
    if (!also) continue
    line.expected += also.expected
    line.owned += also.owned
    covered.delete(line.itemId)
  }
  const held: BuyLine[] = [...covered]
    .map(([itemId, { expected, owned }]) => ({ kind: 'owned' as const, itemId, expected, owned }))
    .sort((a, b) => b.expected - a.expected)
  return { lines: [...unpriced, ...bought, ...held], credit }
}

export const stepCount = (root: StepPlan): number => [...stepsOf(root)].length

/** Whether any line of the plan draws on what the player holds. */
export const usesStock = (root: StepPlan): boolean => [...stepsOf(root)].some((step) => step.materials.some((line) => line.owned > 0))

export const estimateGap = (plan: PlanResult, theirs: number): number | null =>
  Number.isFinite(plan.unitCost) ? plan.unitCost - theirs : null
