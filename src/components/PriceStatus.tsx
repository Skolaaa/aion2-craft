import { useState } from 'react'
import { age, isStale } from '../state/format.ts'
import { useNow } from '../state/useNow.ts'
import type { PriceFeed } from '../state/usePrices.ts'
import { Button } from './Button.tsx'
import { Glyph } from './Glyph.tsx'

const NEWEST = 'These are the newest. aion2.exchange updates each world once an hour.'

function useFreshness(feed: PriceFeed) {
  const now = useNow()
  const [note, setNote] = useState<string | null>(null)
  const captured = feed.snapshot?.capturedAt ?? null
  const refresh = async () => {
    setNote(null)
    if ((await feed.refresh()) === 'recent') setNote(NEWEST)
  }
  return {
    captured,
    age: captured === null ? null : age(captured, now),
    stale: captured !== null && isStale(captured, now),
    refreshing: feed.status === 'loading',
    note,
    refresh,
  }
}

export function PriceStatus({ feed, worldName }: { feed: PriceFeed; worldName: string }) {
  const { age, stale, refreshing, note, refresh } = useFreshness(feed)

  if (feed.pending) {
    return <p className="price-status meta" role="status">Loading prices from aion2.exchange.</p>
  }

  const text =
    age === null
      ? `No prices from aion2.exchange for ${worldName} yet.`
      : stale
        ? `Prices are ${age} old. aion2.exchange may have stopped updating ${worldName}.`
        : `Prices from aion2.exchange, captured ${age} ago.`

  return (
    <div className={`price-status meta ${stale ? 'is-stale' : ''}`}>
      <span>{text}</span>
      <Button className="button-small" onClick={() => void refresh()} disabled={refreshing}>
        <Glyph name="refresh" />
        {refreshing ? 'Refreshing' : 'Refresh'}
      </Button>
      <span role="status">{note}</span>
    </div>
  )
}

export function FreshnessPill({ feed }: { feed: PriceFeed }) {
  const { age, stale, refreshing, note, refresh } = useFreshness(feed)
  const label = feed.pending ? 'prices loading' : refreshing ? 'refreshing' : age === null ? 'no prices yet' : `prices ${age} ago`
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
