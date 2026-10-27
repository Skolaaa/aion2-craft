import { describe, expect, it } from 'vitest'
import { catalogFor } from '../data/catalog.ts'
import { craftIndexFor } from './craftables.ts'
import { hasRoom, makeable, MAX_LINES } from './list.ts'

const GREATSWORD = 110140013
const INGOT = 610710001
const NOT_CRAFTED = 110120003

describe('makeable', () => {
  it('keeps the lines this side crafts, in order, and drops the rest', () => {
    const index = craftIndexFor(catalogFor('Light'))
    const list = new Map([[NOT_CRAFTED, 2], [GREATSWORD, 3], [INGOT, 10]])
    expect([...makeable(list, index)]).toEqual([[GREATSWORD, 3], [INGOT, 10]])
  })
})

describe('hasRoom', () => {
  it('takes a new line until the cap and an edit of a kept line always', () => {
    const full = new Map(Array.from({ length: MAX_LINES }, (_, at) => [at + 1, 1]))
    expect(hasRoom(new Map([[1, 1]]), 2)).toBe(true)
    expect(hasRoom(full, MAX_LINES + 1)).toBe(false)
    expect(hasRoom(full, 1)).toBe(true)
  })
})
