import { useEffect, useState } from 'react'

const PREFIX = 'aion2-craft:ui:'

export type Parse<T> = (raw: unknown) => T | null

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

function read<T>(key: string, fallback: T, parse: Parse<T>): T {
  try {
    const stored = localStorage.getItem(PREFIX + key)
    return stored === null ? fallback : (parse(JSON.parse(stored)) ?? fallback)
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Private mode or a full quota only costs persistence.
  }
}

// The value follows `key`, so per-world records swap when the world changes.
export function usePersistentState<T>(key: string, fallback: T, parse: Parse<T>) {
  const [entry, setEntry] = useState(() => ({ key, value: read(key, fallback, parse) }))
  if (entry.key !== key) setEntry({ key, value: read(key, fallback, parse) })
  useEffect(() => write(entry.key, entry.value), [entry])
  const update = (change: (previous: T) => T) =>
    setEntry((previous) => ({ key: previous.key, value: change(previous.value) }))
  return [entry.key === key ? entry.value : read(key, fallback, parse), update] as const
}
