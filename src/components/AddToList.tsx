import type { ItemId } from '../domain/types.ts'
import { hasRoom, MAX_LINES, type ListState } from '../state/list.ts'
import type { View } from '../state/target.ts'
import { Button } from './Button.tsx'

interface Props {
  itemId: ItemId
  quantity: number
  list: ListState
  onView(view: View): void
}

/** Puts the open item on the list at the shown quantity, says so once it is there, and offers to update the line when the quantities differ. */
export function AddToList({ itemId, quantity, list, onView }: Props) {
  const held = list.wanted.get(itemId)
  if (held === undefined) {
    const full = !hasRoom(list.wanted, itemId)
    return (
      <Button className="button-small" aria-live="polite" disabled={full} title={full ? `The list holds ${MAX_LINES} items. Remove one first.` : undefined} onClick={() => list.save(itemId, quantity)}>
        {full ? 'List is full' : 'Add to list'}
      </Button>
    )
  }
  if (held === quantity) {
    return (
      <Button className="button-small" aria-live="polite" title="Open the list" onClick={() => onView('list')}>
        In list
      </Button>
    )
  }
  return (
    <Button className="button-small" aria-live="polite" title={`On your list as ${held}`} onClick={() => list.save(itemId, quantity)}>
      Update list to {quantity}
    </Button>
  )
}
