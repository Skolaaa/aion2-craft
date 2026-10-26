import { useEffect, useState, type ReactNode } from 'react'

interface FieldProps {
  id: string
  label: string
  hint?: ReactNode
  className?: string
  children: ReactNode
}

export function Field({ id, label, hint, className, children }: FieldProps) {
  return (
    <div className={`field ${className ?? ''}`}>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  )
}

interface NumberInputProps {
  id: string
  value: number
  min: number
  max: number
  step?: number
  className?: string
  describedBy?: string
  labelledBy?: string
  onChange(value: number): void
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// Keeps the typed text while it is not a number yet, so the field can be cleared and retyped.
export function NumberInput({ id, value, min, max, step = 1, className, describedBy, labelledBy, onChange }: NumberInputProps) {
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
      aria-labelledby={labelledBy}
      onChange={(event) => {
        setText(event.target.value)
        const next = event.target.valueAsNumber
        if (Number.isFinite(next)) onChange(clamp(next, min, max))
      }}
      onBlur={() => setText(String(value))}
    />
  )
}
