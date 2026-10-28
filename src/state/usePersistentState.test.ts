import { describe, expect, it } from 'vitest'
import { DEFAULT_SETUP, type Setup } from './setup.ts'
import type { View } from './target.ts'
import { step, type Entry } from './usePersistentState.ts'

const mine: Setup = {
  ...DEFAULT_SETUP,
  mastery: { Blacksmithing: 40, Tailoring: 40, Jewelcrafting: 40, Alchemy: 40, Cooking: 40 },
  taxRate: 0.1,
  allowMorph: false,
}

const linked: Setup = {
  ...DEFAULT_SETUP,
  mastery: { Blacksmithing: 100, Tailoring: 60, Jewelcrafting: 100, Alchemy: 100, Cooking: 100 },
  byproductCredit: true,
}

const plainEntry = <T,>(value: T): Entry<T> => ({ key: 'slot', stored: value, shown: value })
const seededEntry = <T,>(stored: T, seed: T): Entry<T> => ({ key: 'slot', stored, shown: seed })
const patch = (change: Partial<Setup>) => (previous: Setup): Setup => ({ ...previous, ...change })

describe('step', () => {
  it('without a seed, storage follows every change as it always has', () => {
    const next = step(plainEntry(mine), patch({ taxRate: 0.07 }))
    expect(next.shown).toEqual({ ...mine, taxRate: 0.07 })
    expect(next.stored).toBe(next.shown)
    expect(step(plainEntry<View>('calculator'), () => 'scanner')).toEqual(plainEntry('scanner'))
  })

  it('with a seed, storage takes only the field the change touched', () => {
    const next = step(seededEntry(mine, linked), patch({ taxRate: 0.07 }))
    expect(next.shown).toEqual({ ...linked, taxRate: 0.07 })
    expect(next.stored).toEqual({ ...mine, taxRate: 0.07 })
  })

  it('adopts the whole mastery record when one profession changes, as MasteryStats patches it', () => {
    const next = step(seededEntry(mine, linked), (previous) => ({ ...previous, mastery: { ...previous.mastery, Blacksmithing: 90 } }))
    expect(next.stored).toEqual({ ...mine, mastery: { ...linked.mastery, Blacksmithing: 90 } })
  })

  it('saves nothing for a change that touches nothing', () => {
    expect(step(seededEntry(mine, linked), patch({})).stored).toBe(mine)
    expect(step(seededEntry(mine, linked), patch({ byproductCredit: true })).stored).toBe(mine)
    expect(step(seededEntry<View>('calculator', 'scanner'), () => 'scanner').stored).toBe('calculator')
    expect(step(seededEntry<View>('calculator', 'scanner'), () => 'calculator').stored).toBe('calculator')
  })

  it('leaves storage after a seeded boot and any edits equal to a plain boot given only the edits that changed a field', () => {
    type Slot = Record<'a' | 'b' | 'c' | 'd', number>
    const fields = ['a', 'b', 'c', 'd'] as const
    let state = 7
    const random = (below: number) => {
      state = (state * 48271) % 2147483647
      return state % below
    }
    const record = (): Slot => ({ a: random(3), b: random(3), c: random(3), d: random(3) })

    for (let run = 0; run < 200; run++) {
      const stored = record()
      let seeded = seededEntry(stored, record())
      let plain = plainEntry(stored)
      for (let edit = 0; edit < 12; edit++) {
        const field = fields[random(fields.length)]
        const value = random(3)
        const changed = seeded.shown[field] !== value
        seeded = step(seeded, (previous) => ({ ...previous, [field]: value }))
        if (changed) plain = step(plain, (previous) => ({ ...previous, [field]: value }))
      }
      expect(seeded.stored).toEqual(plain.stored)
    }
  })
})
