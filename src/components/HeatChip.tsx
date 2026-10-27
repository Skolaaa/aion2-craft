import { percent, toneOf } from '../state/format.ts'
import { heatOf } from '../state/heat.ts'

export function HeatChip({ marginPct }: { marginPct: number | null }) {
  if (marginPct === null) return null
  const text = percent(marginPct, 1, true)
  const heat = heatOf(marginPct)
  if (heat === null) return <span className={`heat ${toneOf(marginPct, 'fraction') ?? ''}`}>{text}</span>
  return <span className="heat is-hot" style={{ background: heat.background, color: heat.color }}>{text}</span>
}
