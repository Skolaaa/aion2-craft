import { useState, type ReactNode } from 'react'
import { clamp } from '../state/usePersistentState.ts'

interface InputProps {
  id: string
  value: number
  min: number
  max: number
  step?: number
  integer?: boolean
  describedBy?: string
  onChange(value: number): void
}

// Typing stays free while the field is focused, and the committed value snaps back on blur.
export function NumberInput({ id, value, min, max, step = 1, integer = true, describedBy, onChange }: InputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      id={id}
      className="input num"
      type="number"
      inputMode={integer ? 'numeric' : 'decimal'}
      min={min}
      max={max}
      step={step}
      value={draft ?? String(value)}
      aria-describedby={describedBy}
      onChange={(event) => {
        setDraft(event.target.value)
        const typed = event.target.valueAsNumber
        if (Number.isFinite(typed)) onChange(clamp(integer ? Math.round(typed) : typed, min, max))
      }}
      onBlur={() => setDraft(null)}
    />
  )
}

interface FieldProps extends InputProps {
  label: ReactNode
  suffix?: string
  hint?: ReactNode
  className?: string
}

export function NumberField({ label, suffix, hint, className, ...input }: FieldProps) {
  const hintId = hint ? `${input.id}-hint` : undefined
  return (
    <div className={`field ${className ?? ''}`}>
      <label className="field-label" htmlFor={input.id}>{label}</label>
      <span className="field-control">
        <NumberInput {...input} describedBy={hintId} />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </span>
      {hint && <p className="field-hint" id={hintId}>{hint}</p>}
    </div>
  )
}
