import type { Item, PlanResult, Profession } from '../domain/types.ts'
import { planOne, type Planning } from './planning.ts'

export type ScanStatus = 'ready' | 'unpriced' | 'locked'

export interface ScanRow {
  item: Item
  profession: Profession | null
  level: number
  plan: PlanResult
  status: ScanStatus
  cost: number | null
  lowest: number | null
  sold: number | null
  listings: number
  margin: number | null
  marginPct: number | null
}

export function scanCraftables(planning: Planning): ScanRow[] {
  const rows: ScanRow[] = []
  for (const craftable of planning.index.craftables) {
    const plan = planOne(planning, craftable.item.id, 1)
    if (!plan) continue
    const recipe = planning.catalog.recipes.get(plan.root.recipeId)
    rows.push({
      item: craftable.item,
      profession: recipe?.profession ?? craftable.profession,
      level: recipe?.masteryLevel ?? craftable.level,
      plan,
      status: plan.blocked.length > 0 ? 'locked' : plan.missing.length > 0 ? 'unpriced' : 'ready',
      cost: Number.isFinite(plan.cost) ? plan.cost : null,
      lowest: plan.market?.lowest ?? null,
      sold: plan.market?.soldAvg ?? null,
      listings: plan.market?.listings ?? 0,
      margin: plan.margin,
      marginPct: plan.marginPct,
    })
  }
  return rows
}
