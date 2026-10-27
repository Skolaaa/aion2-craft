import { describe, expect, it } from 'vitest'
import type { PlanResult } from '../domain/types.ts'
import type { BuyList } from './answer.ts'
import { shoppingText } from './shopping.ts'

const NAMES: Record<number, string> = { 1: 'Sword', 2: 'Blade', 10: 'Iron', 11: 'Wood' }
const names = { itemName: (id: number) => NAMES[id] ?? String(id), worldName: 'Siel', site: 'aion2-craft.vercel.app' }
const planOf = (cost: number, quantity = 1) => ({ target: { itemId: 1, quantity }, cost }) as PlanResult

describe('shoppingText', () => {
  it('rounds counts up, prices the rounded count, and lists held items apart', () => {
    const list: BuyList = {
      lines: [
        { kind: 'missing', itemId: 11, expected: 2.5, owned: 0 },
        { kind: 'buy', itemId: 10, expected: 4.1306, owned: 1, unit: 1200, subtotal: 3756.7 },
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
        'aion2-craft.vercel.app',
      ].join('\n'),
    )
  })

  it('says so when stock covers everything, and skips the expected cost when a price is missing', () => {
    const all: BuyList = { lines: [{ kind: 'owned', itemId: 10, expected: 2, owned: 2 }], credit: 0 }
    expect(shoppingText(planOf(0, 2), all, names)).toContain('  Nothing, you have it all.\nFrom your own stock\n  2 × Iron\nTotal to buy 0 Kina.')
    const missing: BuyList = { lines: [{ kind: 'missing', itemId: 11, expected: 1, owned: 0 }], credit: 0 }
    expect(shoppingText(planOf(Infinity), missing, names)).toContain('Total to buy 0 Kina.\naion2-craft')
  })
})
