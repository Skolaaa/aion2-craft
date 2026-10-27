/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest'
import css from '../styles.css?raw'
import { contrast, HEAT_BASE, HEAT_CAP, heatOf } from './heat.ts'

const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(css)?.[1]?.toUpperCase()

describe('heatOf', () => {
  it('gives no heat to a loss, to zero or to a margin shown as 0.0%', () => {
    expect(heatOf(null)).toBeNull()
    expect(heatOf(-0.2)).toBeNull()
    expect(heatOf(0)).toBeNull()
    expect(heatOf(0.0004)).toBeNull()
  })

  it('saturates at the cap with the top of the ramp', () => {
    expect(heatOf(HEAT_CAP)).toEqual({ background: '#FFDC8F', color: '#000000' })
    expect(heatOf(HEAT_CAP * 3)).toEqual(heatOf(HEAT_CAP))
  })

  it('starts as a faint tint of the page with light ink', () => {
    const faint = heatOf(0.001)
    if (!faint) throw new Error('no heat at 0.1%')
    expect(faint.color).toBe('#FFFFFF')
    expect(contrast(faint.background, HEAT_BASE)).toBeLessThan(1.3)
  })

  it('keeps at least 4.5:1 between ink and background on every shown percent', () => {
    for (let tenths = 1; tenths <= 1000; tenths++) {
      const heat = heatOf(tenths / 1000)
      if (!heat) throw new Error(`no heat at ${tenths / 10}%`)
      expect(contrast(heat.color, heat.background), `${tenths / 10}%`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('composites over the page colour that styles.css uses', () => {
    expect(token('page')).toBe(HEAT_BASE)
  })
})
