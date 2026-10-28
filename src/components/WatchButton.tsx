import type { ItemId } from '../domain/types.ts'
import type { Watchlist } from '../state/watchlist.ts'
import { Button } from './Button.tsx'

interface Props {
  itemId: ItemId
  watchlist: Watchlist
}

/** Pins the open item to the calculator home, where its margin follows every price refresh. */
export function WatchButton({ itemId, watchlist }: Props) {
  const watching = watchlist.watched.has(itemId)
  return (
    <Button
      className="button-small"
      aria-pressed={watching}
      title={watching ? undefined : "Keep this item's margin on the calculator home"}
      onClick={() => watchlist.toggle(itemId)}
    >
      {watching ? 'Stop watching' : 'Watch'}
    </Button>
  )
}
