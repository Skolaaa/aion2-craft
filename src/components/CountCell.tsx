import { isCount, MAX_OWNED } from '../state/useOwned.ts'
import { NumberCell } from './NumberCell.tsx'

interface Props {
  itemName: string
  count: number | null
  onSave(count: number | null): void
}

const parseCountText = (text: string) => {
  const value = Math.floor(Number(text))
  return text.trim() !== '' && isCount(value) ? value : null
}

/** How many of an item the player holds. Empty or zero clears it. */
export function CountCell({ itemName, count, onSave }: Props) {
  return <NumberCell className="input-count" label={`How many ${itemName} you have`} placeholder="0" max={MAX_OWNED} shown={count} current={count} parse={parseCountText} onSave={onSave} />
}
