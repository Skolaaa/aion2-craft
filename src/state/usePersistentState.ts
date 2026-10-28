import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'aion2-craft:ui:'

export type Parse<T> = (raw: unknown) => T | null

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export function peekPersisted<T>(key: string, fallback: T, parse: Parse<T>): T {
  try {
    const stored = localStorage.getItem(PREFIX + key)
    return stored === null ? fallback : (parse(JSON.parse(stored)) ?? fallback)
  } catch {
    return fallback
  }
}

export function hasPersisted(key: string): boolean {
  try {
    return localStorage.getItem(PREFIX + key) !== null
  } catch {
    return false
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Private mode or a full quota only costs persistence.
  }
}

/** `stored` is what localStorage holds, `shown` what the page shows. They differ only after a seed. */
export interface Entry<T> {
  key: string
  stored: T
  shown: T
}

// A seed reaches storage one top-level field at a time, as the player changes that field. The forms
// patch whole fields (MasteryStats sends the full mastery record), so editing one profession adopts all five.
function commit<T>(stored: T, before: T, after: T): T {
  if (after === before) return stored
  if (!isRecord(stored) || !isRecord(before) || !isRecord(after)) return after
  const touched = Object.entries(after).filter(([field, value]) => value !== before[field])
  return touched.length === 0 ? stored : { ...stored, ...Object.fromEntries(touched) }
}

export function step<T>(entry: Entry<T>, change: (previous: T) => T): Entry<T> {
  const shown = change(entry.shown)
  const stored = entry.stored === entry.shown ? shown : commit(entry.stored, entry.shown, shown)
  return { key: entry.key, stored, shown }
}

/** A `seed` wins over storage for what the slot shows, and reaches storage only through the fields a change touches. */
export function usePersistentState<T>(key: string, fallback: T, parse: Parse<T>, seed?: T) {
  const [entry, setEntry] = useState<Entry<T>>(() => {
    const stored = peekPersisted(key, fallback, parse)
    return { key, stored, shown: seed === undefined ? stored : seed }
  })
  if (entry.key !== key) {
    const stored = peekPersisted(key, fallback, parse)
    setEntry({ key, stored, shown: stored })
  }
  useEffect(() => write(entry.key, entry.stored), [entry])
  const update = useCallback((change: (previous: T) => T) => setEntry((previous) => step(previous, change)), [])
  return [entry.key === key ? entry.shown : peekPersisted(key, fallback, parse), update] as const
}
