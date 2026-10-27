import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { ItemId } from '../domain/types.ts'
import type { PricePoint } from '../market/exchangeClient.ts'
import { kina, timeOf } from '../state/format.ts'
import { chartModel, dateTicks, historySummary, nearestPoint, pointText, RANGES, type HistorySummary, type Range } from '../state/history.ts'
import { usePriceHistory } from '../state/usePriceHistory.ts'
import { Segmented } from './Segmented.tsx'

const WIDTH = 560
const HEIGHT = 220
const EDGE = 24

const RANGE_OPTIONS = (Object.keys(RANGES) as Range[]).map((value) => ({ value, label: RANGES[value].label }))

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })

const MOVES: Record<string, (index: number, last: number) => number> = {
  ArrowLeft: (index) => Math.max(0, index - 1),
  ArrowRight: (index, last) => Math.min(last, index + 1),
  Home: () => 0,
  End: (_, last) => last,
}

const anchorOf = (x: number) => (x < EDGE ? 'start' : x > WIDTH - EDGE ? 'end' : 'middle')

interface Props {
  itemId: ItemId
  worldId: number
}

/** The full price history of an item on a world: a range control, the chart, the readout of one point and the range's summary. */
export function PriceChart({ itemId, worldId }: Props) {
  const [range, setRange] = useState<Range>('7d')
  const points = usePriceHistory(itemId, worldId, range)
  const summary = points && historySummary(points)
  return (
    <div className="stack">
      <Segmented label="Range" options={RANGE_OPTIONS} value={range} onChange={setRange} />
      {points === null ? (
        <p className="chart-wait meta" role="status">Loading the price history from aion2.exchange.</p>
      ) : summary === null ? (
        <p className="meta">No price history on aion2.exchange for this item yet.</p>
      ) : (
        <Chart key={range} points={points} summary={summary} range={range} />
      )}
    </div>
  )
}

interface ChartProps {
  points: PricePoint[]
  summary: HistorySummary
  range: Range
}

function Chart({ points, summary, range }: ChartProps) {
  const [selected, setSelected] = useState(points.length - 1)
  const { label, tickEvery } = RANGES[range]
  const model = useMemo(() => chartModel(points, dateTicks(points, tickEvery), WIDTH, HEIGHT), [points, tickEvery])
  const point = points[selected]
  const at = timeOf(point.ts)
  const readout = `${WEEKDAY.format(at)} ${TIME.format(at)}, ${pointText(point)}`
  const x = model.xs[selected]

  const select = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    setSelected(nearestPoint(points, (event.clientX - box.left) / box.width))
  }

  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    const move = MOVES[event.key]
    if (!move) return
    event.preventDefault()
    setSelected((index) => move(index, points.length - 1))
  }

  return (
    <>
      <svg
        className="chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Lowest listing over ${label}, ${readout}. The arrow keys move the point.`}
        tabIndex={0}
        data-autofocus
        onPointerMove={select}
        onPointerDown={select}
        onKeyDown={onKey}
      >
        <g className="chart-rules">
          {model.yTicks.map(({ y, value }) => (
            <g key={value}>
              <line x1={0} x2={WIDTH} y1={y} y2={y} />
              <text x={4} y={y - 4}>{kina(value)}</text>
            </g>
          ))}
        </g>
        <path className="chart-band" d={model.band} />
        <line className="chart-hair" x1={x} x2={x} y1={model.plot.top} y2={model.plot.bottom} />
        <path className="chart-avg" d={model.avg} />
        <path className="chart-low" d={model.low} />
        {model.end && <circle className="chart-dot" cx={model.end.x} cy={model.end.y} r={3} />}
        <g className="chart-dates">
          {model.xTicks.map(({ x, at }) => (
            <g key={at}>
              <line x1={x} x2={x} y1={model.plot.bottom} y2={model.plot.bottom + 4} />
              <text x={x} y={HEIGHT - 6} textAnchor={anchorOf(x)}>{DAY.format(at)}</text>
            </g>
          ))}
        </g>
      </svg>
      <p className="meta" aria-live="polite">{readout}</p>
      <p className="meta">
        {label}: low {kina(summary.low)} on {DAY.format(timeOf(summary.lowAt))}, high {kina(summary.high)} on {DAY.format(timeOf(summary.highAt))}, now{' '}
        {kina(summary.now)}
      </p>
    </>
  )
}
