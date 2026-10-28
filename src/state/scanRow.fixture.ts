import type { PlanResult, Profession } from '../domain/types.ts'
import type { TargetStatus, Verdict } from './answer.ts'
import type { ScanRow } from './scan.ts'

const VERDICT: Record<TargetStatus, Verdict> = {
  ready: { kind: 'even' },
  unpriced: { kind: 'missing', items: [] },
  locked: { kind: 'blocked', itemId: 0, profession: 'Blacksmithing', level: 50, mastery: 10 },
}

let nextId = 1

interface Shape {
  id?: number
  name: string
  profession?: Profession
  margin: number | null
  status?: TargetStatus
  cost?: number | null
}

/** One scan row for the state tests, with the lowest listing derived from the cost and the margin. */
export function scanRow({ id = nextId++, name, profession = 'Blacksmithing', margin, status = 'ready', cost = 1000 }: Shape): ScanRow {
  return {
    item: { id, name, grade: 'Rare', icon: null },
    profession,
    level: 10,
    plan: {} as PlanResult,
    verdict: VERDICT[status],
    status,
    cost,
    lowest: margin === null || cost === null ? null : cost + margin,
    sold: null,
    listings: 1,
    margin,
    marginPct: margin === null || cost === null ? null : margin / cost,
  }
}
