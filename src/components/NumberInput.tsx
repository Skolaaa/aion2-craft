import { useEffect, useState } from 'react'
import { clamp } from '../state/number.ts'

interface NumberInputProps {
  id: string
  value: number
  min: number
  max: number
  step?: number
  /** The accessible name, for an input with no visible label, as in a table cell. */
  label?: string
  describedBy?: string
  onChange(value: number): void
}

export function NumberInput({ id, value, min, max, step = 1, label, describedBy, onChange }: NumberInputProps) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  return (
    <input
      id={id}
      className="input input-number"
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={text}
      aria-label={label}
      aria-describedby={describedBy}
      onChange={(event) => {
        setText(event.target.value)
        const next = event.target.valueAsNumber
        if (Number.isFinite(next)) onChange(clamp(next, min, max))
      }}
      onBlur={() => setText(String(value))}
    />
  )
}
