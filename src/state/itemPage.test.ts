import { describe, expect, it } from 'vitest'
import { itemPageUrl } from './itemPage.ts'

describe('itemPageUrl', () => {
  it('points at the AION2 Hub page of the item', () => {
    expect(itemPageUrl(610620013)).toBe('https://aion2hub.com/database/items/610620013')
  })
})
