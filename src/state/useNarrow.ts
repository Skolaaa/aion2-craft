import { useSyncExternalStore } from 'react'

/** Phones. styles.css lays the page out in one column under this width, and components that need a different tree ask here. */
export const NARROW_BELOW = 640
export const NARROW = `(max-width: ${NARROW_BELOW - 0.02}px)`

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(NARROW)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export const useNarrow = () => useSyncExternalStore(subscribe, () => window.matchMedia(NARROW).matches)
