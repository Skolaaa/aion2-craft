import type { ItemId } from '../domain/types.ts'
import { kina, percent } from './format.ts'

export interface Segment {
  itemId: ItemId
  name: string
  amount: number
}

export const segmentColor = (rank: number) =>
  `color-mix(in srgb, var(--accent) ${Math.max(26, 100 - rank * 15)}%, var(--raised))`

interface Props {
  segments: readonly Segment[]
  cost: number
  buyTotal: number | null
  netSale: number | null
  taxLabel: string
  animateKey: string
}

export function CostRibbon({ segments, cost, buyTotal, netSale, taxLabel, animateKey }: Props) {
  const share = segments.reduce((sum, segment) => sum + segment.amount, 0)
  const scale = Math.max(cost, buyTotal ?? 0, netSale ?? 0)
  const at = (value: number) => (value / scale) * 100
  const label = (value: number) => (at(value) > 55 ? { right: `${100 - at(value)}%`, textAlign: 'right' as const } : { left: `${at(value)}%` })
  const gap = netSale === null ? null : { from: Math.min(cost, netSale), to: Math.max(cost, netSale), gain: netSale >= cost }

  return (
    <div className="ribbon" aria-hidden="true">
      <div className="ribbon-lane">
        {buyTotal !== null && (
          <span className="ribbon-label" style={label(buyTotal)}>Buy it now <b className="num">{kina(buyTotal)}</b></span>
        )}
      </div>
      <div className="ribbon-track">
        <div className="ribbon-cost" key={animateKey} style={{ width: `${at(cost)}%` }}>
          {segments.map((segment, rank) => (
            <span
              key={segment.itemId}
              className="ribbon-segment"
              style={{ flexGrow: segment.amount / share, background: segmentColor(rank) }}
              title={`${segment.name}: ${kina(segment.amount)} Kina, ${percent(segment.amount / share, 0)} of the cost`}
            />
          ))}
        </div>
        {gap && gap.to > gap.from && (
          <span
            className={`ribbon-gap ${gap.gain ? 'is-gain' : 'is-loss'}`}
            style={{ left: `${at(gap.from)}%`, width: `${at(gap.to) - at(gap.from)}%` }}
          />
        )}
        {buyTotal !== null && <span className="ribbon-tick" style={{ left: `${at(buyTotal)}%` }} />}
        {netSale !== null && <span className="ribbon-tick is-net" style={{ left: `${at(netSale)}%` }} />}
      </div>
      <div className="ribbon-lane">
        {netSale !== null && (
          <span className="ribbon-label" style={label(netSale)}>After {taxLabel} tax <b className="num">{kina(netSale)}</b></span>
        )}
      </div>
    </div>
  )
}
