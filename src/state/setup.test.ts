import { describe, expect, it } from 'vitest'
import type { World } from '../market/worlds.ts'
import { DEFAULT_SETUP, parseSetup, setWorld } from './setup.ts'

const world = (id: number, name: string): World => ({ id, name, region: 'EU', regionName: 'Europe', race: 'Light', hasData: true })
const [siel, nezekan, vaizel, kaisinel] = [world(11301, 'Siel'), world(11302, 'Nezekan'), world(11303, 'Vaizel'), world(11304, 'Kaisinel')]

describe('setWorld', () => {
  it('keeps the three most recent worlds, newest first', () => {
    const setup = [siel, nezekan, vaizel, kaisinel].reduce(setWorld, DEFAULT_SETUP)
    expect(setup.world).toBe(kaisinel)
    expect(setup.recent).toEqual([11304, 11303, 11302])
  })

  it('moves a world chosen again to the front without a duplicate', () => {
    const setup = [siel, nezekan, siel].reduce(setWorld, DEFAULT_SETUP)
    expect(setup.recent).toEqual([11301, 11302])
  })

  it('gives the same setup when the current world is chosen again', () => {
    const once = setWorld(setWorld(DEFAULT_SETUP, siel), nezekan)
    expect(setWorld(once, nezekan)).toEqual(once)
  })
})

describe('parseSetup', () => {
  it('loads a setup saved before recent worlds existed', () => {
    const saved = { world: kaisinel, mastery: { Tailoring: 60 }, taxRate: 0.06, allowCraft: true, allowMorph: false, byproductCredit: true }
    const setup = parseSetup(JSON.parse(JSON.stringify(saved)))
    expect(setup?.world).toEqual(kaisinel)
    expect(setup?.recent).toEqual([])
    expect(setup?.mastery.Tailoring).toBe(60)
    expect(setup?.allowMorph).toBe(false)
  })

  it('keeps only distinct world ids in recent, at most three', () => {
    expect(parseSetup({ recent: [11304, 'x', 11304, null, 11301, 11302, 11303] })?.recent).toEqual([11304, 11301, 11302])
    expect(parseSetup({ recent: 'none' })?.recent).toEqual([])
  })
})
