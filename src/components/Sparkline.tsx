import type { ItemId } from '../domain/types.ts'
import { kina } from '../state/format.ts'
import { historySummary, sparklinePath, sparklinePoints, type Trend } from '../state/history.ts'
import { usePriceHistory } from '../state/usePriceHistory.ts'

const WIDTH = 120
const HEIGHT = 24

const TREND_WORD: Record<Trend, string> = { up: 'rising', down: 'falling', flat: 'flat' }

interface Props {
  itemId: ItemId
  worldId: number
}

/** The lowest listing over seven days as a line with the week's low and high beside it. Nothing until there is a line to draw. */
export function Sparkline({ itemId, worldId }: Props) {
  const points = usePriceHistory(itemId, worldId)
  const summary = points && historySummary(points)
  if (!points || !summary) return null

  const dots = sparklinePoints(points, WIDTH, HEIGHT)
  const end = dots[dots.length - 1]
  const range = `low ${kina(summary.low)}, high ${kina(summary.high)}`

  return (
    <div className="trend">
      <svg
        className="spark"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label={`Lowest listing over 7 days, ${range}, ${TREND_WORD[summary.trend]}`}
      >
        <path className="spark-line" d={sparklinePath(points, WIDTH, HEIGHT)} />
        <circle className="spark-dot" cx={end.x} cy={end.y} r={2} />
      </svg>
      <span className="meta">7 d: {range}</span>
    </div>
  )
}
