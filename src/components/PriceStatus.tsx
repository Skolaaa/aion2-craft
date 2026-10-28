import { age as ageOf, isStale, timeOf } from '../state/format.ts'
import type { Freshness } from '../state/useFreshness.ts'
import { useNow } from '../state/useNow.ts'

interface Props {
  freshness: Freshness
  worldName: string
  depthCapturedAt?: string | null
}

export function PriceStatus({ freshness, worldName, depthCapturedAt }: Props) {
  const now = useNow()
  const { pending, capturedAt, age, stale } = freshness
  if (pending) return <p className="price-status meta" role="status">Loading prices from aion2.exchange.</p>
  const text =
    age === null
      ? `No prices from aion2.exchange for ${worldName} yet.`
      : stale
        ? `Prices are ${age} old. aion2.exchange may have stopped updating ${worldName}.`
        : `Prices from aion2.exchange, captured ${age} ago.`
  // The exchange polls listing depth less often than prices, so a ladder stale against the prices is said to be.
  const depthText =
    depthCapturedAt != null && capturedAt !== null && isStale(depthCapturedAt, timeOf(capturedAt))
      ? ` Bulk prices follow the listing ladder from ${ageOf(depthCapturedAt, now)} ago, scaled to today's lowest listing.`
      : ''
  return <p className={`price-status meta ${stale ? 'is-stale' : ''}`}>{text}{depthText}</p>
}

export function FreshnessPill({ freshness }: { freshness: Freshness }) {
  const { pending, age, stale, refreshing, note, refresh } = freshness
  const label = pending ? 'prices loading' : refreshing ? 'refreshing' : age === null ? 'no prices yet' : null
  return (
    <>
      <button
        type="button"
        className={`fresh ${stale ? 'is-stale' : age === null ? '' : 'is-fresh'}`}
        title={note ?? 'Refresh the prices from aion2.exchange'}
        disabled={refreshing}
        onClick={() => void refresh()}
      >
        <span className="fresh-dot" aria-hidden="true" />
        {label ?? <><span className="fresh-word">prices </span>{age}<span className="fresh-word"> ago</span></>}
      </button>
      <span className="sr-only" role="status">{note}</span>
    </>
  )
}
