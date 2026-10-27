import type { PricePoint } from '../market/exchangeClient.ts'
import { kina, plural, timeOf } from './format.ts'

export type Trend = 'up' | 'down' | 'flat'

export interface HistorySummary {
  low: number
  lowAt: string
  high: number
  highAt: string
  first: number
  last: number
  /** The last poll's lowest listing, the close of the last bucket rather than its low. */
  now: number
  trend: Trend
}

export interface Dot {
  x: number
  y: number
}

export type Range = '7d' | '30d'

/** One request shape per range; the date ticks fall on every `tickEvery`-th local midnight. */
export const RANGES: Record<Range, { label: string; bucket: string; tickEvery: number }> = {
  '7d': { label: '7 days', bucket: '1h', tickEvery: 1 },
  '30d': { label: '30 days', bucket: '6h', tickEvery: 5 },
}

export interface ChartModel {
  plot: { top: number; bottom: number }
  /** The x of every point, by time, so a bucket the exchange left out keeps its gap. */
  xs: number[]
  low: string
  avg: string
  band: string
  end: Dot | null
  yTicks: { y: number; value: number }[]
  xTicks: { x: number; at: number }[]
}

const FLAT_WITHIN = 0.02
const PAD = 1
const PLOT_TOP = 16
const PLOT_BOTTOM = 26
const Y_TICKS = 4

type Known = PricePoint & { low: number }

const known = (points: readonly PricePoint[]) => points.filter((point): point is Known => point.low !== null)

const highOf = (point: Known) => point.high ?? point.low

/** The lowest-listing series: its range with the dates of the extremes, its two ends, and whether it moved more than 2% between them. */
export function historySummary(points: readonly PricePoint[]): HistorySummary | null {
  const seen = known(points)
  if (seen.length < 2) return null
  const first = seen[0].low
  const end = seen[seen.length - 1]
  const trend = Math.abs(end.low - first) <= first * FLAT_WITHIN ? 'flat' : end.low > first ? 'up' : 'down'
  let lowest = seen[0]
  let highest = seen[0]
  for (const point of seen) {
    if (point.low < lowest.low) lowest = point
    if (highOf(point) > highOf(highest)) highest = point
  }
  return { low: lowest.low, lowAt: lowest.ts, high: highOf(highest), highAt: highest.ts, first, last: end.low, now: end.close ?? end.low, trend }
}

/**
 * Where each known `low` lands in a width x height box. A point keeps the x of its slot among all the points, so a
 * bucket with no listing leaves a gap in time instead of squeezing the line together.
 */
export function sparklinePoints(points: readonly PricePoint[], width: number, height: number): Dot[] {
  const seen = points.flatMap(({ low }, slot) => (low === null ? [] : [{ low, slot }]))
  const lows = seen.map(({ low }) => low)
  const min = Math.min(...lows)
  const span = Math.max(...lows) - min
  const step = points.length > 1 ? (width - 2 * PAD) / (points.length - 1) : 0
  return seen.map(({ low, slot }) => ({
    x: PAD + slot * step,
    y: span === 0 ? height / 2 : PAD + (1 - (low - min) / span) * (height - 2 * PAD),
  }))
}

const coordinate = (value: number) => Number(value.toFixed(2))

const lineTo = ({ x, y }: Dot) => `L${coordinate(x)} ${coordinate(y)}`

const pathOf = (dots: readonly Dot[]) => dots.map((dot, index) => (index === 0 ? `M${coordinate(dot.x)} ${coordinate(dot.y)}` : lineTo(dot))).join(' ')

export const sparklinePath = (points: readonly PricePoint[], width: number, height: number) => pathOf(sparklinePoints(points, width, height))

// d3's tick step: the power of ten under span / count, times 1, 2, 5 or 10 by where the remainder falls.
function tickStep(span: number, count: number) {
  const raw = span / count
  const power = 10 ** Math.floor(Math.log10(raw))
  const error = raw / power
  return power * (error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1)
}

function roundValues(lo: number, hi: number): number[] {
  const step = tickStep(hi - lo, Y_TICKS)
  const values: number[] = []
  for (let k = Math.ceil(lo / step); k <= Math.floor(hi / step); k++) values.push(k * step)
  return values
}

const timeSpan = (points: readonly PricePoint[]) => [timeOf(points[0].ts), timeOf(points[points.length - 1].ts)] as const

/** Every `every`-th local midnight the series spans, as timestamps for the date ticks. */
export function dateTicks(points: readonly PricePoint[], every: number): number[] {
  if (points.length === 0) return []
  const [from, to] = timeSpan(points)
  const day = new Date(from)
  day.setHours(0, 0, 0, 0)
  if (day.getTime() < from) day.setDate(day.getDate() + 1)
  const starts: number[] = []
  for (; day.getTime() <= to; day.setDate(day.getDate() + 1)) starts.push(day.getTime())
  return starts.filter((_, index) => index % every === 0)
}

/**
 * The chart of a series in a width x height box: the low line, the avg line and the band between low and high, scaled
 * by time in x and over the lows and highs in y, with round Kina values for the rules and the given timestamps as date
 * ticks. The date strip takes the bottom of the box and the top leaves room for the label over the top rule.
 */
export function chartModel(points: readonly PricePoint[], ticks: readonly number[], width: number, height: number): ChartModel {
  const seen = known(points)
  const plot = { top: PLOT_TOP, bottom: height - PLOT_BOTTOM }
  const [from, to] = timeSpan(points)
  const x = (at: number) => PAD + (to === from ? 0 : (at - from) / (to - from)) * (width - 2 * PAD)
  const min = Math.min(...seen.map((point) => point.low))
  const max = Math.max(...seen.map(highOf))
  const pad = min === max ? Math.max(1, min * 0.05) : 0
  const lo = min - pad
  const hi = max + pad
  const y = (value: number) => plot.top + (1 - (value - lo) / (hi - lo)) * (plot.bottom - plot.top)
  const dots = (value: (point: Known) => number) => seen.map((point) => ({ x: x(timeOf(point.ts)), y: y(value(point)) }))
  const lows = dots((point) => point.low)
  const highs = dots(highOf)
  return {
    plot,
    xs: points.map((point) => x(timeOf(point.ts))),
    low: pathOf(lows),
    avg: pathOf(dots((point) => point.avg ?? point.low)),
    band: lows.length === 0 ? '' : `${pathOf(lows)} ${[...highs].reverse().map(lineTo).join(' ')} Z`,
    end: lows.length === 0 ? null : lows[lows.length - 1],
    yTicks: roundValues(lo, hi).map((value) => ({ y: coordinate(y(value)), value })),
    xTicks: ticks.map((at) => ({ x: coordinate(x(at)), at })),
  }
}

/** The index of the point nearest to a fraction of the chart's width, by time. */
export function nearestPoint(points: readonly PricePoint[], fraction: number): number {
  const [from, to] = timeSpan(points)
  const target = from + Math.min(1, Math.max(0, fraction)) * (to - from)
  let best = 0
  points.forEach((point, index) => {
    if (Math.abs(timeOf(point.ts) - target) < Math.abs(timeOf(points[best].ts) - target)) best = index
  })
  return best
}

/** One point as text after its time: the spread when the bucket has one, else the one price, then the listing count. */
export function pointText({ low, high, avg, listings }: PricePoint): string {
  if (low === null) return 'no listing'
  const count = listings === null ? '' : `, ${listings} ${plural(listings, 'listing', 'listings')}`
  const prices = high !== null && high !== low ? `low ${kina(low)}, avg ${kina(avg ?? low)}, high ${kina(high)}` : kina(low)
  return `${prices}${count}`
}
