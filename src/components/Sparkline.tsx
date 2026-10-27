import type { ItemId } from '../domain/types.ts'
import { kina } from '../state/format.ts'
import { historySummary, sparklinePath, sparklinePoints, type Trend } from '../state/history.ts'
import { settingKey, type OpenSetting } from '../state/openSetting.ts'
import { usePriceHistory } from '../state/usePriceHistory.ts'

const WIDTH = 120
const HEIGHT = 24

const TREND_WORD: Record<Trend, string> = { up: 'rising', down: 'falling', flat: 'flat' }

interface Props {
  itemId: ItemId
  worldId: number
  surface: Pick<OpenSetting, 'opened' | 'open'>
}

/** The lowest listing over seven days as a line with the week's low and high beside it, opening the full chart. Nothing until there is a line to draw. */
export function Sparkline({ itemId, worldId, surface }: Props) {
  const points = usePriceHistory(itemId, worldId)
  const summary = points && historySummary(points)
  if (!points || !summary) return null

  const dots = sparklinePoints(points, WIDTH, HEIGHT)
  const end = dots[dots.length - 1]
  const range = `low ${kina(summary.low)}, high ${kina(summary.high)}`
  const setting = { kind: 'history', itemId } as const

  return (
    <div className="trend">
      <button
        type="button"
        className="spark-open"
        aria-label={`Open the price history, ${TREND_WORD[summary.trend]} over 7 days, ${range}`}
        aria-haspopup="dialog"
        aria-expanded={surface.opened !== null && settingKey(surface.opened.setting) === settingKey(setting)}
        onClick={(event) => surface.open(setting, event.currentTarget)}
      >
        <svg className="spark" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} aria-hidden="true">
          <path className="spark-line" d={sparklinePath(points, WIDTH, HEIGHT)} />
          <circle className="spark-dot" cx={end.x} cy={end.y} r={2} />
        </svg>
      </button>
      <span className="meta">7 d: {range}</span>
    </div>
  )
}
