import { useEffect, useState, type KeyboardEvent } from 'react'
import { isCount, MAX_OWNED } from '../state/useOwned.ts'

interface Props {
  itemName: string
  count: number | null
  onSave(count: number | null): void
}

const textOf = (count: number | null) => (count === null ? '' : String(count))

/** How many of an item the player holds, as a small always-visible field. Empty or zero clears it. */
export function CountCell({ itemName, count, onSave }: Props) {
  const [text, setText] = useState(textOf(count))
  useEffect(() => setText(textOf(count)), [count])

  const commit = () => {
    const value = Math.floor(Number(text))
    const next = text.trim() !== '' && isCount(value) ? value : null
    if (next !== count) onSave(next)
    else setText(textOf(next))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setText(textOf(count))
      event.currentTarget.blur()
    }
  }

  return (
    <input
      className={`input input-number input-count ${count === null ? '' : 'is-set'}`}
      type="number"
      inputMode="numeric"
      min={0}
      max={MAX_OWNED}
      step={1}
      autoComplete="off"
      placeholder="0"
      aria-label={`How many ${itemName} you have`}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onFocus={(event) => event.target.select()}
      onKeyDown={onKeyDown}
      onBlur={commit}
      onClick={(event) => event.stopPropagation()}
    />
  )
}
