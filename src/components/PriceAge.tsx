import { useState } from 'react'
import type { PriceFeed } from '../state/usePrices.ts'
import { Icon } from './Icon.tsx'
import { ago, isStale } from './format.ts'

export function Credit() {
  return (
    <p className="credit">
      Prices from <a href="https://aion2.exchange" target="_blank" rel="noreferrer">aion2.exchange</a>, recipes from{' '}
      <a href="https://aion2t.com/crafting" target="_blank" rel="noreferrer">aion2t.com</a>, success curves from{' '}
      <a href="https://metabot.gg/en/aion-2/crafting" target="_blank" rel="noreferrer">metabot.gg</a>.
    </p>
  )
}

export function PriceAge({ feed, now }: { feed: PriceFeed; now: number }) {
  const [message, setMessage] = useState('')
  const captured = feed.snapshot?.capturedAt ?? null
  const stale = isStale(captured, now)
  const refreshing = feed.status === 'loading' && feed.snapshot !== null

  const refresh = async () => {
    setMessage('')
    const outcome = await feed.refresh()
    if (outcome === 'recent') setMessage('Checked less than a minute ago. The exchange updates each world once an hour.')
    else if (outcome === 'updated') setMessage('Prices checked just now.')
  }

  return (
    <div className="price-age">
      <p className={`price-age-line ${stale ? 'is-stale' : ''}`}>
        {stale && <Icon name="alert" size={14} />}
        <span>
          {captured ? `Market data captured ${ago(captured, now)}` : 'No market data yet'}
          {stale && ', stale'}
        </span>
        {feed.snapshot && <span className="faint">checked {ago(feed.snapshot.fetchedAt, now)}</span>}
      </p>
      <button type="button" className="btn" onClick={refresh} disabled={refreshing}>
        <Icon name="refresh" size={14} />
        {refreshing ? 'Refreshing' : 'Refresh prices'}
      </button>
      <p className="field-hint price-age-note" aria-live="polite">{message}</p>
    </div>
  )
}
