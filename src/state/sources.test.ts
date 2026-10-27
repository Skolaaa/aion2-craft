import { describe, expect, it } from 'vitest'
import { sourceUrl } from './sources.ts'

describe('sourceUrl', () => {
  it('points at the AION2 Hub page of the item', () => {
    expect(sourceUrl(610620013)).toBe('https://aion2hub.com/database/items/610620013')
  })
})
