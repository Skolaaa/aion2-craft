import type { PricePoint } from '../market/exchangeClient.ts'

export type Trend = 'up' | 'down' | 'flat'

export interface HistorySummary {
  low: number
  high: number
  first: number
  last: number
  trend: Trend
}

export interface Dot {
  x: number
  y: number
}

const FLAT_WITHIN = 0.02
const PAD = 1

/** The lowest-listing series of a week: its range, its two ends, and whether it moved more than 2% between them. */
export function historySummary(points: readonly PricePoint[]): HistorySummary | null {
  const lows = points.flatMap(({ low }) => (low === null ? [] : [low]))
  if (lows.length < 2) return null
  const first = lows[0]
  const last = lows[lows.length - 1]
  const trend = Math.abs(last - first) <= first * FLAT_WITHIN ? 'flat' : last > first ? 'up' : 'down'
  return { low: Math.min(...lows), high: Math.max(...lows), first, last, trend }
}

/**
 * Where each known `low` lands in a width x height box. A point keeps the x of its slot among all the points, so a
 * bucket with no listing leaves a gap in time instead of squeezing the line together.
 */
export function sparklinePoints(points: readonly PricePoint[], width: number, height: number): Dot[] {
  const known = points.flatMap(({ low }, slot) => (low === null ? [] : [{ low, slot }]))
  const lows = known.map(({ low }) => low)
  const min = Math.min(...lows)
  const span = Math.max(...lows) - min
  const step = points.length > 1 ? (width - 2 * PAD) / (points.length - 1) : 0
  return known.map(({ low, slot }) => ({
    x: PAD + slot * step,
    y: span === 0 ? height / 2 : PAD + (1 - (low - min) / span) * (height - 2 * PAD),
  }))
}

const coordinate = (value: number) => Number(value.toFixed(2))

export const sparklinePath = (points: readonly PricePoint[], width: number, height: number) =>
  sparklinePoints(points, width, height)
    .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${coordinate(x)} ${coordinate(y)}`)
    .join(' ')
