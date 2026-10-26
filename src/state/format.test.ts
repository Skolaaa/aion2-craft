import { describe, expect, it } from 'vitest'
import { parseKina, percent, rate, signedKina } from './format.ts'

describe('parseKina', () => {
  it('reads plain, grouped and shortened amounts', () => {
    expect(parseKina('1200')).toBe(1200)
    expect(parseKina(' 1,200 ')).toBe(1200)
    expect(parseKina('1.2k')).toBe(1200)
    expect(parseKina('2.5M')).toBe(2_500_000)
  })

  it('rejects zero, negatives and words', () => {
    expect(parseKina('0')).toBeNull()
    expect(parseKina('-5')).toBeNull()
    expect(parseKina('cheap')).toBeNull()
  })
})

describe('number text', () => {
  it('signs margins with a true minus and a plus', () => {
    expect(signedKina(-812_000.4)).toBe('−812,000')
    expect(signedKina(467_378)).toBe('+467,378')
    expect(percent(0.0252, 1, true)).toBe('+2.5%')
  })

  it('drops a trailing zero from rates', () => {
    expect(rate(0.968372)).toBe('96.8%')
    expect(rate(1)).toBe('100%')
  })
})
