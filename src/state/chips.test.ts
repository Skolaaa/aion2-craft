import { describe, expect, it } from 'vitest'
import type { Listed, World } from '../market/worlds.ts'
import { statusChips } from './chips.ts'

const kaisinel: World = { id: 11304, name: 'Kaisinel', region: 'EU', regionName: 'Europe', race: 'Light', hasData: true }
const lumiel: World = { id: 12304, name: 'Lumiel', region: 'EU', regionName: 'Europe', race: 'Dark', hasData: true }
const matched: Listed = { world: kaisinel, match: { world: lumiel, since: '2026-10-04' } }

describe('statusChips', () => {
  it('names the world, its side, its region and its enemy world', () => {
    expect(statusChips(matched).world).toEqual({
      value: 'Kaisinel',
      badge: 'EL',
      side: 'Elyos',
      region: 'EU',
      title: 'Kaisinel, Elyos, matched with Lumiel since 4 Oct 2026',
    })
  })

  it('names an Asmodian world without a match by its side alone', () => {
    expect(statusChips({ world: lumiel, match: null }).world).toMatchObject({ badge: 'AS', side: 'Asmodian', title: 'Lumiel, Asmodian' })
  })
})
