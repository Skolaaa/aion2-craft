import { useState, type FormEvent, type ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import { parseKina } from './format.ts'

interface Props {
  id: string
  label: ReactNode
  current: number | undefined
  hint?: ReactNode
  autoFocus?: boolean
  onSave(price: number): void
  onReset?(): void
  onClose?(): void
}

export function PriceForm({ id, label, current, hint, autoFocus, onSave, onReset, onClose }: Props) {
  const [text, setText] = useState(current === undefined ? '' : String(current))
  const [invalid, setInvalid] = useState(false)
  const noteId = `${id}-note`

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const price = parseKina(text)
    setInvalid(price === null)
    if (price !== null) onSave(price)
  }

  return (
    <form
      className="price-form"
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && onClose) {
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <label className="price-label" htmlFor={id}>{label}</label>
      <div className="price-row">
        <input
          id={id}
          className="input num"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="Kina"
          value={text}
          aria-invalid={invalid}
          aria-describedby={noteId}
          onChange={(event) => {
            setText(event.target.value)
            setInvalid(false)
          }}
        />
        <span className="field-suffix">Kina</span>
        <button type="submit" className="btn btn-primary">Save price</button>
        {onReset && current !== undefined && (
          <button type="button" className="btn" onClick={onReset}><Icon name="undo" size={14} />Reset</button>
        )}
        {onClose && <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>}
      </div>
      <p className={`field-hint ${invalid ? 'field-error' : ''}`} id={noteId} role={invalid ? 'alert' : undefined}>
        {invalid ? 'Enter a whole number of Kina, or use k or m, as in 1.2m.' : (hint ?? 'Type 1200, 1,200 or 1.2m.')}
      </p>
    </form>
  )
}
