import { describe, expect, it } from 'vitest'
import { parseKina, percent, rate, shownTenths, signedKina, toneOf } from './format.ts'
import { heatOf } from './heat.ts'

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

  it('tones a gain or loss only when it shows as more than zero', () => {
    expect(toneOf(0.4, 'kina')).toBeUndefined()
    expect(toneOf(-0.6, 'kina')).toBe('is-loss')
    expect(toneOf(0.0004, 'fraction')).toBeUndefined()
    expect(toneOf(0.0006, 'fraction')).toBe('is-gain')
    expect(toneOf(null, 'fraction')).toBeUndefined()
  })

  it('counts a fraction in the tenths of a percent it shows as, for both tone and heat', () => {
    expect(shownTenths(0.0004)).toBe(0)
    expect(shownTenths(0.0006)).toBe(1)
    expect(shownTenths(0.2534)).toBe(253)
    for (const fraction of [0.0004, 0.0005, 0.0006, -0.0004]) {
      expect(toneOf(fraction, 'fraction') === undefined, `${fraction}`).toBe(shownTenths(fraction) === 0)
      expect(heatOf(fraction) === null, `${fraction}`).toBe(shownTenths(fraction) <= 0)
    }
  })

  it('drops a trailing zero from rates', () => {
    expect(rate(0.968372)).toBe('96.8%')
    expect(rate(1)).toBe('100%')
  })
})
