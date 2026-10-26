import type { ItemId } from '../domain/types.ts'
import { clamp } from './number.ts'
import { isFiniteNumber, isRecord } from './usePersistentState.ts'

export type View = 'calculator' | 'scanner'

export interface Target {
  itemId: ItemId | null
  quantity: number
}

export const MAX_QUANTITY = 999_999
export const DEFAULT_TARGET: Target = { itemId: null, quantity: 1 }
export const DEFAULT_VIEW: View = 'calculator'

export const parseView = (raw: unknown): View | null => (raw === 'calculator' || raw === 'scanner' ? raw : null)

export function parseTarget(raw: unknown): Target | null {
  if (!isRecord(raw)) return null
  return {
    itemId: isFiniteNumber(raw.itemId) ? raw.itemId : null,
    quantity: isFiniteNumber(raw.quantity) ? clamp(Math.round(raw.quantity), 1, MAX_QUANTITY) : 1,
  }
}
