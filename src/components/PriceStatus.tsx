import { useState } from 'react'
import { age, isStale } from '../state/format.ts'
import type { PriceFeed } from '../state/usePrices.ts'
import { Button } from './Button.tsx'
import { Glyph } from './Glyph.tsx'

interface Props {
  feed: PriceFeed
  now: number
  worldName: string
}

export function PriceStatus({ feed, now, worldName }: Props) {
  const [note, setNote] = useState<string | null>(null)
  const captured = feed.snapshot?.capturedAt ?? null
  const refreshing = feed.status === 'loading'

  if (refreshing && feed.snapshot === null) {
    return <p className="price-status meta" role="status">Loading prices from aion2.exchange.</p>
  }

  const stale = captured !== null && isStale(captured, now)
  const text =
    captured === null
      ? `No prices from aion2.exchange for ${worldName} yet.`
      : stale
        ? `Prices are ${age(captured, now)} old. aion2.exchange may have stopped updating ${worldName}.`
        : `Prices from aion2.exchange, captured ${age(captured, now)} ago.`

  const refresh = async () => {
    setNote(null)
    const outcome = await feed.refresh()
    if (outcome === 'recent') setNote('These are the newest. aion2.exchange updates each world once an hour.')
  }

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
