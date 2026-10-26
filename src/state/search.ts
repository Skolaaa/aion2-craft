import type { Craftable } from './craftables.ts'

const normal = (text: string) => text.toLowerCase().replace(/['’]/g, '')

// Every term has to appear in the name, profession or grade. Names that start with the
// query come first, then names with a word that starts with the first term.
export function searchCraftables(craftables: readonly Craftable[], query: string): Craftable[] {
  const whole = normal(query).trim()
  const terms = whole.split(/\s+/).filter(Boolean)
  const [first] = terms
  if (first === undefined) return []
  const rank = (name: string) => (name.startsWith(whole) ? 0 : name.split(' ').some((word) => word.startsWith(first)) ? 1 : 2)
  return craftables
    .map((craftable) => {
      const name = normal(craftable.item.name)
      const haystack = `${name} ${normal(craftable.profession ?? '')} ${normal(craftable.item.grade)}`
      return { craftable, name, hit: terms.every((term) => haystack.includes(term)) }
    })
    .filter((entry) => entry.hit)
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name) || a.craftable.item.id - b.craftable.item.id)
    .map((entry) => entry.craftable)
}
