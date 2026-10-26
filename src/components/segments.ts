import type { ItemId } from '../domain/types.ts'

export interface Segment {
  itemId: ItemId
  name: string
  amount: number
}

export const segmentColor = (rank: number) =>
  `color-mix(in srgb, var(--accent) ${Math.max(26, 100 - rank * 15)}%, var(--raised))`
