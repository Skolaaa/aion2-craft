import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { ItemId } from '../domain/types.ts'
import type { Craftable } from '../state/craftables.ts'
import { Icon } from './Icon.tsx'
import { ItemIcon } from './ItemIcon.tsx'

const LIMIT = 60

function search(craftables: readonly Craftable[], query: string): Craftable[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return [...craftables]
  const rank = (name: string) => (name.startsWith(terms[0]) ? 0 : name.includes(` ${terms[0]}`) ? 1 : 2)
  return craftables
    .map((craftable) => {
      const name = craftable.item.name.toLowerCase()
      const haystack = `${name} ${(craftable.profession ?? '').toLowerCase()} ${craftable.item.grade.toLowerCase()}`
      return { craftable, name, hit: terms.every((term) => haystack.includes(term)) }
    })
    .filter((entry) => entry.hit)
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
    .map((entry) => entry.craftable)
}

interface Props {
  craftables: readonly Craftable[]
  selected: ItemId | null
  onPick(itemId: ItemId): void
}

export function RecipePicker({ craftables, selected, onPick }: Props) {
  const base = useId()
  const listId = `${base}-list`
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const all = useMemo(() => search(craftables, query), [craftables, query])
  const shown = all.slice(0, LIMIT)
  const optionId = (itemId: ItemId) => `${base}-opt-${itemId}`
  const activeItem = shown[Math.min(active, shown.length - 1)]

  useEffect(() => {
    if (!open || !activeItem) return
    document.getElementById(optionId(activeItem.item.id))?.scrollIntoView({ block: 'nearest' })
  }, [open, activeItem])

  const choose = (itemId: ItemId) => {
    onPick(itemId)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) return setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((index) => (index + step + shown.length) % Math.max(1, shown.length))
    } else if (event.key === 'Enter' && open && activeItem) {
      event.preventDefault()
      choose(activeItem.item.id)
    } else if (event.key === 'Escape') {
      if (open) setOpen(false)
      else setQuery('')
    }
  }

  return (
    <div className="picker">
      <label className="field-label" htmlFor={`${base}-input`}>Item to craft</label>
      <div className="picker-box">
        <span className="picker-icon"><Icon name="search" size={16} /></span>
        <input
          id={`${base}-input`}
          className="input picker-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeItem ? optionId(activeItem.item.id) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search by name, profession or grade"
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
        {open && (
          <div className="picker-pop" onMouseDown={(event) => event.preventDefault()}>
            {shown.length === 0 ? (
              <p className="picker-empty">No craftable item matches "{query}".</p>
            ) : (
              <ul className="picker-list" id={listId} role="listbox" aria-label="Craftable items" ref={listRef}>
                {shown.map((craftable, index) => (
                  <li
                    key={craftable.item.id}
                    id={optionId(craftable.item.id)}
                    role="option"
                    aria-selected={craftable.item.id === selected}
                    className={`picker-option ${index === active ? 'is-active' : ''} ${craftable.item.id === selected ? 'is-selected' : ''}`}
                    onMouseMove={() => setActive(index)}
                    onClick={() => choose(craftable.item.id)}
                  >
                    <ItemIcon item={craftable.item} size={32} />
                    <span className="picker-name">{craftable.item.name}</span>
                    <span className="picker-facts">
                      <span>{craftable.profession ?? 'Any profession'}</span>
                      <span className="num">Level {craftable.level}</span>
                      <span>{craftable.item.grade}</span>
                      {craftable.transfer && <span>Transfer</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {all.length > LIMIT && (
              <p className="picker-more">Showing {LIMIT} of {all.length}. Keep typing to narrow the list.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
