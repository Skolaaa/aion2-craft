import { useId } from 'react'

interface Option<T> {
  value: T
  label: string
  disabled?: boolean
  title?: string
}

interface Props<T> {
  label: string
  options: readonly Option<T>[]
  value: T
  onChange(value: T): void
}

export function Segmented<T>({ label, options, value, onChange }: Props<T>) {
  const name = useId()
  return (
    <fieldset className="segments">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label className="segment" key={option.label} title={option.title}>
          <input type="radio" name={name} checked={option.value === value} disabled={option.disabled} onChange={() => onChange(option.value)} />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}
