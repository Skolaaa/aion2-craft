import { describe, expect, it } from 'vitest'
import type { Listed, World } from '../market/worlds.ts'
import { statusChips } from './chips.ts'
import { DEFAULT_SETUP } from './setup.ts'

const kaisinel: World = { id: 11304, name: 'Kaisinel', region: 'EU', regionName: 'Europe', race: 'Light', hasData: true }
const lumiel: World = { id: 12304, name: 'Lumiel', region: 'EU', regionName: 'Europe', race: 'Dark', hasData: true }
const matched: Listed = { world: kaisinel, match: { world: lumiel, since: '2026-10-04' } }

describe('statusChips', () => {
  it('names the region, the world, its side and its enemy world', () => {
    const { region, world } = statusChips(DEFAULT_SETUP, matched)
    expect(region).toEqual({ value: 'EU', title: 'Europe' })
    expect(world).toEqual({ value: 'Kaisinel', badge: 'EL', side: 'Elyos', title: 'Kaisinel, Elyos, matched with Lumiel since 4 Oct 2026' })
    expect(statusChips(DEFAULT_SETUP, { world: lumiel, match: null }).world.title).toBe('Lumiel, Asmodian')
  })

  it('shows the tax with one decimal', () => {
    expect(statusChips(DEFAULT_SETUP, matched).tax.value).toBe('5.0%')
    expect(statusChips({ ...DEFAULT_SETUP, taxRate: 0.075 }, matched).tax.value).toBe('7.5%')
  })

  it('pairs each profession with its level and spells it out on hover', () => {
    const { mastery } = statusChips({ ...DEFAULT_SETUP, mastery: { ...DEFAULT_SETUP.mastery, Tailoring: 60 } }, matched)
    expect(mastery.pairs.map(({ abbr, value }) => `${abbr} ${value}`)).toEqual(['BS 100', 'TL 60', 'JC 100', 'AL 100', 'CK 100'])
    expect(mastery.pairs[1]?.title).toBe('Tailoring 60, Armorsmithing in game')
    expect(mastery.spoken).toContain('Blacksmithing 100; Tailoring 60, Armorsmithing in game')
  })

  it('collapses the five levels to a count when they agree and to the first two when not', () => {
    expect(statusChips(DEFAULT_SETUP, matched).mastery.collapsed).toBe('5×100')
    const mixed = { ...DEFAULT_SETUP, mastery: { ...DEFAULT_SETUP.mastery, Tailoring: 60 } }
    expect(statusChips(mixed, matched).mastery.collapsed).toBe('100/60/…')
  })

  it('counts the plan options that are on', () => {
    expect(statusChips(DEFAULT_SETUP, matched).plan.value).toBe('2/3')
    expect(statusChips({ ...DEFAULT_SETUP, byproductCredit: true }, matched).plan).toEqual({ value: '3/3', title: '3 of 3 plan options on' })
  })
})
