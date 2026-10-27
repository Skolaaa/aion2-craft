import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { ItemId } from '../domain/types.ts'
import type { Craftable } from '../state/craftables.ts'
import { searchCraftables } from '../state/search.ts'
import { ItemIcon } from './ItemIcon.tsx'

const LIMIT = 50

interface Props {
  craftables: readonly Craftable[]
  autoFocus: boolean
  onPick(itemId: ItemId): void
}

export function Search({ craftables, autoFocus, onPick }: Props) {
  const base = useId()
  const inputId = `${base}-input`
  const listId = `${base}-list`
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const matches = useMemo(() => searchCraftables(craftables, query), [craftables, query])
  const shown = matches.slice(0, LIMIT)
  const expanded = open && query.trim() !== ''
  const current = shown[Math.min(active, shown.length - 1)]
  const optionId = (itemId: ItemId) => `${base}-option-${itemId}`

  useEffect(() => {
    if (expanded && current) document.getElementById(optionId(current.item.id))?.scrollIntoView({ block: 'nearest' })
  }, [expanded, current])

  useEffect(() => {
    const onSlash = (event: globalThis.KeyboardEvent) => {
      const target = event.target
      const typing = target instanceof HTMLElement && (target.isContentEditable || target.matches('input, textarea, select'))
      if (event.key !== '/' || typing || event.metaKey || event.ctrlKey || event.altKey) return
      event.preventDefault()
      input.current?.focus()
    }
    document.addEventListener('keydown', onSlash)
    return () => document.removeEventListener('keydown', onSlash)
  }, [])

  const pick = (itemId: ItemId) => {
    onPick(itemId)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((index) => (index + step + shown.length) % Math.max(1, shown.length))
    } else if (event.key === 'Enter' && expanded && current) {
      event.preventDefault()
      pick(current.item.id)
    } else if (event.key === 'Escape') {
      if (expanded) setOpen(false)
      else setQuery('')
    }
  }

  return (
    <div className="search">
      <div className="search-box lookup">
        <label className="lookup-key" htmlFor={inputId}>item</label>
        <input
          ref={input}
          id={inputId}
          className="lookup-input"
          type="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && current ? optionId(current.item.id) : undefined}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder="Name, profession or grade"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        <kbd className="kbd" title="Press / to search">/</kbd>
        <div className="search-pop" hidden={!expanded} onMouseDown={(event) => event.preventDefault()}>
          <ul className="search-list" id={listId} role="listbox" aria-label="Craftable items">
            {shown.map((craftable, index) => (
              <li
                key={craftable.item.id}
                id={optionId(craftable.item.id)}
                role="option"
                aria-selected={index === active}
                className="search-option"
                data-grade={craftable.item.grade}
                onMouseMove={() => setActive(index)}
                onClick={() => pick(craftable.item.id)}
              >
                <ItemIcon item={craftable.item} />
                <span className="item-text">
                  <span>{craftable.item.name}</span>
                  <span className="meta">
                    {craftable.profession ?? 'Any profession'}, level {craftable.level}, {craftable.item.grade}
                    {craftable.transfer ? ', transfer' : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {expanded && shown.length === 0 && <p className="search-note">No craftable item matches "{query.trim()}".</p>}
          {matches.length > LIMIT && <p className="search-note">Showing {LIMIT} of {matches.length}. Keep typing to narrow it down.</p>}
        </div>
      </div>
    </div>
  )
}
