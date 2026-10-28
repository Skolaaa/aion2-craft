import type { ItemId } from '../domain/types.ts'
import { clamp } from './number.ts'
import { isFiniteNumber, isRecord, type Parse } from './usePersistentState.ts'

/** The one list of views, in nav order. Workspace switches over it with a `never` default, so a new view fails the build where it is not handled. */
export const VIEWS = ['calculator', 'list', 'scanner', 'leveling'] as const
export type View = (typeof VIEWS)[number]

export interface Target {
  itemId: ItemId | null
  quantity: number
}

export const MAX_QUANTITY = 999_999
export const DEFAULT_TARGET: Target = { itemId: null, quantity: 1 }
export const DEFAULT_VIEW: View = 'calculator'

export const parseView = (raw: unknown): View | null => VIEWS.find((view) => view === raw) ?? null

/** The one rule for a quantity, for the open item and for every list line: a whole number from 1 to MAX_QUANTITY. */
export const parseQuantity: Parse<number> = (raw) => (isFiniteNumber(raw) ? clamp(Math.round(raw), 1, MAX_QUANTITY) : null)

export function parseTarget(raw: unknown): Target | null {
  if (!isRecord(raw)) return null
  return { itemId: isFiniteNumber(raw.itemId) ? raw.itemId : null, quantity: parseQuantity(raw.quantity) ?? 1 }
}
