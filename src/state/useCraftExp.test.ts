import { describe, expect, it } from 'vitest'
import { parseExp } from './useCraftExp.ts'

describe('parseExp', () => {
  it('keeps a whole number of EXP from 1 to 99,999', () => {
    expect(parseExp(1)).toBe(1)
    expect(parseExp(600)).toBe(600)
    expect(parseExp(99_999)).toBe(99_999)
  })

  it('rejects zero, fractions, out-of-range and non-numbers', () => {
    expect(parseExp(0)).toBeNull()
    expect(parseExp(20.5)).toBeNull()
    expect(parseExp(100_000)).toBeNull()
    expect(parseExp('20')).toBeNull()
    expect(parseExp(null)).toBeNull()
  })
})
