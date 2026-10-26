import type { Item, PlanResult, Profession } from '../domain/types.ts'
import { answerOf, type Verdict } from './answer.ts'
import { planOne, type Planning } from './planning.ts'
import { matches, termsOf } from './search.ts'

export type ScanStatus = 'ready' | 'unpriced' | 'locked'

export interface ScanRow {
  item: Item
  profession: Profession | null
  level: number
  plan: PlanResult
  verdict: Verdict
  status: ScanStatus
  cost: number | null
  lowest: number | null
  sold: number | null
  listings: number
  margin: number | null
  marginPct: number | null
}

const statusOf = (verdict: Verdict): ScanStatus =>
  verdict.kind === 'blocked' ? 'locked' : verdict.kind === 'missing' ? 'unpriced' : 'ready'

export function scanCraftables(planning: Planning): ScanRow[] {
  const rows: ScanRow[] = []
  for (const craftable of planning.index.craftables) {
    const plan = planOne(planning, craftable.item.id, 1)
    if (!plan) continue
    const recipe = planning.catalog.recipes.get(plan.root.recipeId)
    const { verdict } = answerOf(plan, planning)
    rows.push({
      item: craftable.item,
      profession: recipe?.profession ?? craftable.profession,
      level: recipe?.masteryLevel ?? craftable.level,
      plan,
      verdict,
      status: statusOf(verdict),
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

export type ScanKey = 'item' | 'cost' | 'lowest' | 'margin' | 'marginPct'

export interface Sort<Key extends string> {
  key: Key
  direction: 'asc' | 'desc'
}

export type ScanSort = Sort<ScanKey>

export interface ScanQuery {
  profession: Profession | null
  name: string
  showHidden: boolean
  sort: ScanSort
}

export const DEFAULT_SCAN_SORT: ScanSort = { key: 'margin', direction: 'desc' }

const VALUE: Record<Exclude<ScanKey, 'item'>, (row: ScanRow) => number | null> = {
  cost: (row) => row.cost,
  lowest: (row) => row.lowest,
  margin: (row) => row.margin,
  marginPct: (row) => row.marginPct,
}

export function nextSort(sort: ScanSort, key: ScanKey): ScanSort {
  if (sort.key === key) return { key, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
  return { key, direction: key === 'item' ? 'asc' : 'desc' }
}

function compare(sort: ScanSort) {
  const sign = sort.direction === 'asc' ? 1 : -1
  const byName = (a: ScanRow, b: ScanRow) => a.item.name.localeCompare(b.item.name) || a.item.id - b.item.id
  if (sort.key === 'item') return (a: ScanRow, b: ScanRow) => sign * byName(a, b)
  const value = VALUE[sort.key]
  return (a: ScanRow, b: ScanRow) => {
    const x = value(a)
    const y = value(b)
    if (x === null || y === null) return x === y ? byName(a, b) : x === null ? 1 : -1
    return sign * (x - y) || byName(a, b)
  }
}

// Rows that need a price or more mastery have no margin to rank, so they stay out of the
// table unless asked for; `hidden` counts them either way.
export function viewScan(rows: readonly ScanRow[], { profession, name, showHidden, sort }: ScanQuery) {
  const terms = termsOf(name)
  const matching = rows.filter((row) => (profession === null || row.profession === profession) && matches(row.item.name, terms))
  const hidden = matching.filter((row) => row.status !== 'ready').length
  const shown = showHidden ? matching : matching.filter((row) => row.status === 'ready')
  return { rows: [...shown].sort(compare(sort)), hidden }
}

export function bestMargins(rows: readonly ScanRow[], count: number): ScanRow[] {
  const order = compare(DEFAULT_SCAN_SORT)
  const best: ScanRow[] = []
  for (const row of rows) {
    if (row.status !== 'ready' || row.margin === null) continue
    const at = best.findIndex((other) => order(row, other) < 0)
    if (at !== -1) best.splice(at, 0, row)
    else if (best.length < count) best.push(row)
    if (best.length > count) best.pop()
  }
  return best
}
