import { useId } from 'react'

interface Props<T> {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange(value: T): void
}

export function Segmented<T>({ label, options, value, onChange }: Props<T>) {
  const name = useId()
  return (
    <fieldset className="segments">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label className="segment" key={option.label}>
          <input type="radio" name={name} checked={option.value === value} onChange={() => onChange(option.value)} />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}
