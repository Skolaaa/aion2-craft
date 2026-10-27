import type { DepthLadder } from './types.ts'

/** A ladder from `[unitPrice, listings, units]` rows, cheapest first. */
export const ladderOf = (levels: [number, number, number][], more: Partial<DepthLadder> = {}): DepthLadder => ({
  capturedAt: '',
  complete: true,
  units: levels.reduce((n, [, , u]) => n + u, 0),
  levels: levels.map(([unitPrice, listings, units]) => ({ unitPrice, listings, units })),
  ...more,
})
