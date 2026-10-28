import { useEffect, useState, type KeyboardEvent } from 'react'
import { MAX_EXP, parseExp } from '../state/useCraftExp.ts'

interface Props {
  recipeName: string
  /** What the route uses: the player's value, else the measured one. */
  exp: number | null
  /** The player entered `exp`, as against a measured value. */
  yours: boolean
  onSave(exp: number | null): void
}

const textOf = (exp: number | null) => (exp === null ? '' : String(exp))

/** The mastery EXP one craft gives, as a small always-visible field. Empty or zero clears the player's value, so the measured one shows again. */
export function ExpCell({ recipeName, exp, yours, onSave }: Props) {
  const [text, setText] = useState(textOf(exp))
  useEffect(() => setText(textOf(exp)), [exp])

  const commit = () => {
    const value = Math.floor(Number(text))
    const clears = text.trim() === '' || value === 0
    const next = clears ? null : parseExp(value)
    const changed = clears ? yours : next !== null && next !== exp
    if (changed) onSave(next)
    else setText(textOf(exp))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setText(textOf(exp))
      event.currentTarget.blur()
    }
  }

  return (
    <input
      className={`input input-number input-exp ${yours ? 'is-set' : ''}`}
      type="number"
      inputMode="numeric"
      min={1}
      max={MAX_EXP}
      step={1}
      autoComplete="off"
      placeholder="enter"
      aria-label={`Mastery EXP one craft of ${recipeName} gives`}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onFocus={(event) => event.target.select()}
      onKeyDown={onKeyDown}
      onBlur={commit}
    />
  )
}
