import { describe, expect, it } from 'vitest'
import type { PlanResult } from '../domain/types.ts'
import type { BuyList } from './answer.ts'
import { shoppingText } from './shopping.ts'

const NAMES: Record<number, string> = { 1: 'Sword', 2: 'Blade', 10: 'Iron', 11: 'Wood' }
const names = { itemName: (id: number) => NAMES[id] ?? String(id), worldName: 'Siel', link: 'https://aion2-craft.vercel.app/?world=11301&item=1' }
const planOf = (cost: number, quantity = 1, more: [number, number][] = []) =>
  ({ targets: [{ itemId: 1, quantity }, ...more.map(([itemId, quantity]) => ({ itemId, quantity }))], cost }) as unknown as PlanResult

describe('shoppingText', () => {
  it('rounds counts up, prices the rounded count, and lists held items apart', () => {
    const list: BuyList = {
      lines: [
        { kind: 'missing', itemId: 11, expected: 2.5, owned: 0 },
        { kind: 'buy', itemId: 10, expected: 4.1306, owned: 1, unit: 1200, subtotal: 3756.7, depth: null },
        { kind: 'owned', itemId: 2, expected: 1, owned: 1 },
      ],
      credit: 0,
    }
    expect(shoppingText(planOf(12345.6), list, names)).toBe(
      [
        'What to buy for 1 × Sword on Siel',
        '  3 × Wood: no price yet',
        '  4 × Iron: 4,800 Kina at 1,200 each, have 1',
        'From your own stock',
        '  1 × Blade',
        'Total to buy 4,800 Kina. Expected crafting cost 12,346 Kina at your mastery.',
        'https://aion2-craft.vercel.app/?world=11301&item=1',
      ].join('\n'),
    )
  })

  it('names each target of a list under its own heading, then what to buy for all of them', () => {
    const list: BuyList = { lines: [{ kind: 'buy', itemId: 10, expected: 7, owned: 0, unit: 1200, subtotal: 8400, depth: null }], credit: 0 }
    expect(shoppingText(planOf(9000, 3, [[2, 10]]), list, names)).toBe(
      [
        'To craft on Siel',
        '  3 × Sword',
        '  10 × Blade',
        'What to buy',
        '  7 × Iron: 8,400 Kina at 1,200 each',
        'Total to buy 8,400 Kina. Expected crafting cost 9,000 Kina at your mastery.',
        'https://aion2-craft.vercel.app/?world=11301&item=1',
      ].join('\n'),
    )
  })

  it('says so when stock covers everything, and skips the expected cost when a price is missing', () => {
    const all: BuyList = { lines: [{ kind: 'owned', itemId: 10, expected: 2, owned: 2 }], credit: 0 }
    expect(shoppingText(planOf(0, 2), all, names)).toContain('  Nothing, you have it all.\nFrom your own stock\n  2 × Iron\nTotal to buy 0 Kina.')
    const missing: BuyList = { lines: [{ kind: 'missing', itemId: 11, expected: 1, owned: 0 }], credit: 0 }
    expect(shoppingText(planOf(Infinity), missing, names)).toContain('Total to buy 0 Kina.\nhttps://aion2-craft.vercel.app/?world=11301')
  })
})
