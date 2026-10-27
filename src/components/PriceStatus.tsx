import type { Freshness } from '../state/useFreshness.ts'

export function PriceStatus({ freshness, worldName }: { freshness: Freshness; worldName: string }) {
  const { pending, age, stale } = freshness
  if (pending) return <p className="price-status meta" role="status">Loading prices from aion2.exchange.</p>
  const text =
    age === null
      ? `No prices from aion2.exchange for ${worldName} yet.`
      : stale
        ? `Prices are ${age} old. aion2.exchange may have stopped updating ${worldName}.`
        : `Prices from aion2.exchange, captured ${age} ago.`
  return <p className={`price-status meta ${stale ? 'is-stale' : ''}`}>{text}</p>
}

export function FreshnessPill({ freshness }: { freshness: Freshness }) {
  const { pending, age, stale, refreshing, note, refresh } = freshness
  const label = pending ? 'prices loading' : refreshing ? 'refreshing' : age === null ? 'no prices yet' : `prices ${age} ago`
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
        {label}
      </button>
      <span className="sr-only" role="status">{note}</span>
    </>
  )
}
