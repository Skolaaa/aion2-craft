import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { isCount, MAX_OWNED } from '../state/useOwned.ts'

interface Props {
  itemName: string
  count: number | null
  onSave(count: number | null): void
}

/** How many of an item the player holds, shown as a number and edited in place. Zero clears it. */
export function CountCell({ itemName, count, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [refocus, setRefocus] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!editing && refocus) {
      triggerRef.current?.focus()
      setRefocus(false)
    }
  }, [editing, refocus])

  const close = (fromKeyboard: boolean) => {
    setEditing(false)
    setText('')
    setRefocus(fromKeyboard)
  }

  const commit = (fromKeyboard: boolean) => {
    const value = Math.floor(Number(text))
    if (text.trim() !== '' && isCount(value)) onSave(value)
    else onSave(null)
    close(fromKeyboard)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit(true)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close(true)
    }
  }

  if (editing) {
    return (
      <input
        className="input input-number input-count"
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_OWNED}
        step={1}
        autoComplete="off"
        placeholder="0"
        aria-label={`How many ${itemName} you have`}
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
        onFocus={(event) => event.target.select()}
        onKeyDown={onKeyDown}
        onBlur={() => commit(false)}
        onClick={(event) => event.stopPropagation()}
      />
    )
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      className="price-value"
      aria-label={`You have ${count ?? 0} ${itemName}. Change how many you have`}
      onClick={(event) => {
        event.stopPropagation()
        setText(count === null ? '' : String(count))
        setEditing(true)
      }}
    >
      {count === null ? <span className="meta">0</span> : count}
    </button>
  )
}
