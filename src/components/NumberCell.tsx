import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

interface Props {
  className: string
  label: string
  placeholder: string
  max: number
  /** What the field shows. */
  shown: number | null
  /** What a save compares against, and what `is-set` follows: the player's own value, null when none. */
  current: number | null
  /** The text as a value, null to clear. */
  parse(text: string): number | null
  onSave(next: number | null): void
}

const textOf = (value: number | null) => (value === null ? '' : String(value))

/** A small always-visible number field that saves on blur or Enter and reverts on Escape. */
export function NumberCell({ className, label, placeholder, max, shown, current, parse, onSave }: Props) {
  const [text, setText] = useState(textOf(shown))
  useEffect(() => setText(textOf(shown)), [shown])
  // Escape blurs, and the blur handler still closes over the old text, so it has to know to skip the save.
  const reverting = useRef(false)

  const commit = () => {
    if (reverting.current) {
      reverting.current = false
      return
    }
    const next = parse(text)
    if (next !== current) onSave(next)
    else setText(textOf(shown))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      reverting.current = true
      setText(textOf(shown))
      event.currentTarget.blur()
    }
  }

  return (
    <input
      className={`input input-number ${className} ${current === null ? '' : 'is-set'}`}
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      step={1}
      autoComplete="off"
      placeholder={placeholder}
      aria-label={label}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onFocus={(event) => event.target.select()}
      onKeyDown={onKeyDown}
      onBlur={commit}
      onClick={(event) => event.stopPropagation()}
    />
  )
}
