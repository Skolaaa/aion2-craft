import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

export function moveActive(ids: readonly string[], active: string | null, step: 1 | -1): string | null {
  const at = active === null ? -1 : ids.indexOf(active)
  const next = at === -1 ? 0 : Math.min(ids.length - 1, Math.max(0, at + step))
  return ids[next] ?? null
}

// A hovered option never scrolls, so the list does not move under the pointer.
export function useCombobox(ids: readonly string[], onPick: (id: string) => void, initial: string | null = null, scrollToInitial = true) {
  const [active, setActive] = useState(initial)
  const follow = useRef(scrollToInitial)
  const activeId = active !== null && ids.includes(active) ? active : (ids[0] ?? null)

  useEffect(() => {
    if (follow.current && activeId !== null) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  const choose = (id: string | null, scroll: boolean) => {
    follow.current = scroll
    setActive(id)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      choose(moveActive(ids, activeId, event.key === 'ArrowDown' ? 1 : -1), true)
    } else if (event.key === 'Enter' && activeId !== null) {
      event.preventDefault()
      onPick(activeId)
    }
  }

  return { activeId, hover: (id: string) => choose(id, false), reset: () => choose(null, true), onKeyDown }
}
