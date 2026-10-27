import type { Craftable } from './craftables.ts'
import { gradeName } from './grade.ts'

const normal = (text: string) => text.toLowerCase().replace(/['’]/g, '')
export const termsOf = (query: string) => normal(query).trim().split(/\s+/).filter(Boolean)

export function matches(text: string, terms: readonly string[]) {
  const haystack = normal(text)
  return terms.every((term) => haystack.includes(term))
}

interface Entry {
  craftable: Craftable
  name: string
  haystack: string
}

const entries = new WeakMap<readonly Craftable[], Entry[]>()

function entriesOf(craftables: readonly Craftable[]): Entry[] {
  const known = entries.get(craftables)
  if (known) return known
  const built = craftables.map((craftable) => {
    const name = normal(craftable.item.name)
    return { craftable, name, haystack: `${name} ${normal(craftable.profession ?? '')} ${normal(craftable.item.grade)} ${normal(gradeName(craftable.item.grade))}` }
  })
  entries.set(craftables, built)
  return built
}

export function searchCraftables(craftables: readonly Craftable[], query: string): Craftable[] {
  const whole = normal(query).trim()
  const terms = termsOf(query)
  const [first] = terms
  if (first === undefined) return []
  const rank = (name: string) => (name.startsWith(whole) ? 0 : name.split(' ').some((word) => word.startsWith(first)) ? 1 : 2)
  return entriesOf(craftables)
    .filter((entry) => terms.every((term) => entry.haystack.includes(term)))
    .map((entry) => ({ ...entry, rank: rank(entry.name) }))
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name) || a.craftable.item.id - b.craftable.item.id)
    .map((entry) => entry.craftable)
}
