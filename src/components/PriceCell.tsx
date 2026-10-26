import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { kina, parseKina } from '../state/format.ts'

interface Props {
  itemName: string
  unit: number | null
  own: boolean
  onSave(price: number | null): void
  // A missing price shows the input straight away instead of a value to click.
  missing?: boolean
  trigger?: ReactNode
}

const ERROR = 'Type a number, like 1200 or 1.2k.'

export function PriceCell({ itemName, unit, own, onSave, missing = false, trigger }: Props) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [refocus, setRefocus] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const errorId = useId()
  const open = missing || editing

  useEffect(() => {
    if (!open && refocus) {
      triggerRef.current?.focus()
      setRefocus(false)
    }
  }, [open, refocus])

  const close = (fromKeyboard: boolean) => {
    setEditing(false)
    setInvalid(false)
    setText('')
    setRefocus(fromKeyboard)
  }

  const commit = (fromKeyboard: boolean) => {
    const trimmed = text.trim()
    if (trimmed === '') {
      if (own) onSave(null)
      if (!missing) close(fromKeyboard)
      return
    }
    const price = parseKina(trimmed)
    if (price === null) {
      if (fromKeyboard || missing) setInvalid(true)
      else close(false)
      return
    }
    onSave(price)
    close(fromKeyboard)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit(true)
    } else if (event.key === 'Escape' && !missing) {
      event.preventDefault()
      event.stopPropagation()
      close(true)
    }
  }

  if (open) {
    return (
      <span className="price-edit">
        <input
          className="input input-price"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder={missing ? 'Enter price' : unit === null ? 'Price' : kina(unit)}
          aria-label={`Your price for ${itemName}, in Kina`}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          autoFocus={editing}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setInvalid(false)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (text.trim() !== '' || !missing) commit(false)
          }}
          onClick={(event) => event.stopPropagation()}
        />
        {invalid && <span className="field-error" id={errorId} role="alert">{ERROR}</span>}
      </span>
    )
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      className="price-value"
      aria-label={`${trigger ? '' : `${kina(unit ?? 0)} Kina${own ? ', your price' : ''}. `}Change the price of ${itemName}`}
      onClick={(event) => {
        event.stopPropagation()
        setEditing(true)
      }}
    >
      {trigger ?? (
        <>
          <span className="price-amount">{unit === null ? '' : kina(unit)}</span>
          {own && <span className="yours"> yours</span>}
        </>
      )}
    </button>
  )
}
