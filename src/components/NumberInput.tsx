import { useEffect, useState } from 'react'
import { clamp } from '../state/number.ts'

interface NumberInputProps {
  id: string
  value: number
  min: number
  max: number
  step?: number
  className?: string
  describedBy?: string
  initialFocus?: boolean
  onChange(value: number): void
}

export function NumberInput({ id, value, min, max, step = 1, className, describedBy, initialFocus, onChange }: NumberInputProps) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  return (
    <input
      id={id}
      className={`input input-number ${className ?? ''}`}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={text}
      aria-describedby={describedBy}
      data-autofocus={initialFocus || undefined}
      onChange={(event) => {
        setText(event.target.value)
        const next = event.target.valueAsNumber
        if (Number.isFinite(next)) onChange(clamp(next, min, max))
      }}
      onBlur={() => setText(String(value))}
    />
  )
}
