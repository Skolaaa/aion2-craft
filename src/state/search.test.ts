import { describe, expect, it } from 'vitest'
import type { Grade, Profession } from '../domain/types.ts'
import type { Craftable } from './craftables.ts'
import { searchCraftables } from './search.ts'

const craftable = (id: number, name: string, profession: Profession = 'Blacksmithing', grade: Grade = 'Unique'): Craftable => ({
  item: { id, name, grade, icon: null },
  profession,
  level: 1,
  transfer: false,
})

const ALL = [
  craftable(1, "Artisan's Splendent Orichalcum Greatsword"),
  craftable(2, 'Orichalcum Greatsword', 'Blacksmithing', 'Common'),
  craftable(3, "Expert's Orichalcum Greatsword", 'Blacksmithing', 'Rare'),
  craftable(4, 'Orichalcum Ingot'),
  craftable(5, 'Greater Healing Potion', 'Alchemy', 'Common'),
]

const names = (query: string) => searchCraftables(ALL, query).map((c) => c.item.name)

describe('searchCraftables', () => {
  it('returns nothing for an empty query', () => {
    expect(names('   ')).toEqual([])
  })

  it('puts names that start with the query first, then the rest by name', () => {
    expect(names('orichalcum great')).toEqual([
      'Orichalcum Greatsword',
      "Artisan's Splendent Orichalcum Greatsword",
      "Expert's Orichalcum Greatsword",
    ])
  })

  it('matches every term in any order, ignoring case and apostrophes', () => {
    expect(names('GREATSWORD artisans')).toEqual(["Artisan's Splendent Orichalcum Greatsword"])
  })

  it('matches the profession and grade as well as the name', () => {
    expect(names('alchemy')).toEqual(['Greater Healing Potion'])
    expect(names('greatsword rare')).toEqual(["Expert's Orichalcum Greatsword"])
  })
})
