import { describe, expect, it } from 'vitest'
import { catalogFor } from '../data/catalog.ts'
import type { ItemId, Mastery } from '../domain/types.ts'
import { serverDirectory } from '../market/worlds.fixture.ts'
import { resolveWorld, type World, type WorldDirectory, type WorldId } from '../market/worlds.ts'
import { craftIndexFor } from './craftables.ts'
import { MAX_LINES } from './list.ts'
import { DEFAULT_SETUP, settingsOf, setWorld, type PlanSettings, type Setup } from './setup.ts'
import { encodeLink, openLink, type LinkNote, type Opened, type PlanLink, type Seed } from './shareLink.ts'

const listed = (id: WorldId): World => {
  const found = serverDirectory.byId.get(id)
  if (!found) throw new Error(`servers.fixture.json lost world ${id}`)
  return found.world
}

const KAISINEL = listed(11304)
const LUMIEL = listed(12304)
const GREATSWORD = 110140013
const GREATSWORD_DARK = 110140015
const DRAGON_LORD = 110230015
const INGOT = 610710001
const NOT_CRAFTED = 110120003

const mine: Setup = {
  ...setWorld(DEFAULT_SETUP, LUMIEL),
  mastery: { Blacksmithing: 40, Tailoring: 40, Jewelcrafting: 40, Alchemy: 40, Cooking: 40 },
  taxRate: 0.1,
  allowMorph: false,
  byproductCredit: true,
}

const plain: PlanLink = { worldId: 11304, view: 'calculator', target: { itemId: GREATSWORD, quantity: 1 }, settings: settingsOf(DEFAULT_SETUP), list: new Map() }

const withSettings = (patch: Partial<PlanSettings>): PlanLink => ({ ...plain, settings: { ...plain.settings, ...patch } })
const withMastery = (patch: Partial<Mastery>) => withSettings({ mastery: { ...plain.settings.mastery, ...patch } })

const offBaseline: PlanLink = {
  worldId: 11304,
  view: 'scanner',
  target: { itemId: GREATSWORD, quantity: 40 },
  settings: {
    mastery: { Blacksmithing: 1, Tailoring: 60, Jewelcrafting: 0, Alchemy: 99, Cooking: 50 },
    taxRate: 0.075,
    allowCraft: false,
    allowMorph: false,
    byproductCredit: true,
  },
  list: new Map(),
}

const session = new Map([[GREATSWORD, 3], [INGOT, 10], [DRAGON_LORD, 1]])
const onList: PlanLink = { ...plain, view: 'list', list: session }

const seedOf = (opened: Opened | 'waiting'): Seed => {
  if (opened === 'waiting' || opened.seed === null) throw new Error(`expected a seed, got ${JSON.stringify(opened)}`)
  return opened.seed
}

describe('encodeLink', () => {
  it('spells a plan at the defaults as its world and item, so DEFAULT_SETUP has not drifted from the baseline', () => {
    expect(encodeLink(plain)).toBe('?world=11304&item=110140013')
    expect(encodeLink({ ...plain, target: { itemId: null, quantity: 1 } })).toBe('?world=11304')
  })

  it.each<[string, PlanLink, string]>([
    ['quantity', { ...plain, target: { itemId: GREATSWORD, quantity: 40 } }, 'qty=40'],
    ['Blacksmithing', withMastery({ Blacksmithing: 1 }), 'bs=1'],
    ['Tailoring', withMastery({ Tailoring: 60 }), 'tl=60'],
    ['Jewelcrafting', withMastery({ Jewelcrafting: 0 }), 'jc=0'],
    ['Alchemy', withMastery({ Alchemy: 99 }), 'al=99'],
    ['Cooking', withMastery({ Cooking: 50 }), 'ck=50'],
    ['tax', withSettings({ taxRate: 0.075 }), 'tax=7.5'],
    ['allowCraft', withSettings({ allowCraft: false }), 'craft=0'],
    ['allowMorph', withSettings({ allowMorph: false }), 'morph=0'],
    ['byproductCredit', withSettings({ byproductCredit: true }), 'credit=1'],
    ['view', { ...plain, view: 'scanner' }, 'view=scanner'],
  ])('adds exactly one key for %s', (_, plan, key) => {
    expect(encodeLink(plan)).toBe(`?world=11304&item=110140013&${key}`)
  })

  it('gives every field off the baseline a key of its own', () => {
    const keys = [...new URLSearchParams(encodeLink(offBaseline)).keys()]
    expect(keys).toHaveLength(13)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('repeats a list key per line on the list view only, with x1 left off', () => {
    expect(encodeLink(onList)).toBe(`?world=11304&item=110140013&view=list&list=${GREATSWORD}x3&list=${INGOT}x10&list=${DRAGON_LORD}`)
    expect(encodeLink({ ...onList, view: 'calculator' })).toBe('?world=11304&item=110140013')
    expect(encodeLink({ ...onList, view: 'scanner' })).toBe('?world=11304&item=110140013&view=scanner')
  })
})

describe('openLink', () => {
  it('opens the plan a link was made from, over a recipient whose own setup differs everywhere', () => {
    for (const plan of [plain, offBaseline]) {
      const seed = seedOf(openLink(encodeLink(plan), mine, serverDirectory))
      expect(settingsOf(seed.setup)).toEqual(plan.settings)
      expect(seed.setup.world).toEqual(KAISINEL)
      expect(seed.target).toEqual(plan.target)
      expect(seed.view).toBe(plan.view)
    }
  })

  it('reads every key the link leaves out as the baseline, never as the recipient setting', () => {
    const seed = seedOf(openLink('?world=12304', mine, null))
    expect(settingsOf(seed.setup)).toEqual(settingsOf(DEFAULT_SETUP))
    expect(seed.target).toEqual({ itemId: null, quantity: 1 })
    expect(seed.view).toBe('calculator')
    expect(seed.list).toBeNull()
  })

  describe('with a list', () => {
    const listOf = (search: string, stored = mine, directory: WorldDirectory | null = serverDirectory) => {
      const opened = openLink(search, stored, directory)
      const seed = seedOf(opened)
      return { list: seed.list === null ? null : [...seed.list], view: seed.view, notes: opened !== 'waiting' ? opened.notes : [] }
    }

    it('opens the list the link was made from, in order', () => {
      expect(listOf(encodeLink(onList))).toEqual({ list: [[GREATSWORD, 3], [INGOT, 10], [DRAGON_LORD, 1]], view: 'list', notes: [] })
    })

    it('fits each line to the side it opens on, and says how many have no counterpart', () => {
      expect(listOf(`?world=12304&view=list&list=${GREATSWORD}x3&list=${INGOT}x10&list=${DRAGON_LORD}`)).toEqual({
        list: [[GREATSWORD_DARK, 3], [INGOT, 10]],
        view: 'list',
        notes: [{ kind: 'list-unknown', dropped: 1, side: 'Asmodian' }],
      })
    })

    it('opens the calculator when the list view has no usable line', () => {
      expect(listOf('?world=11304&view=list')).toEqual({ list: null, view: 'calculator', notes: [] })
      expect(listOf('?world=11304&view=list&list=abc&list=3.5&list=1x')).toEqual({ list: null, view: 'calculator', notes: [] })
      expect(listOf(`?world=12304&view=list&list=${DRAGON_LORD}`)).toEqual({
        list: null,
        view: 'calculator',
        notes: [{ kind: 'list-unknown', dropped: 1, side: 'Asmodian' }],
      })
    })

    it('keeps a repeated item in its first place, clamps a quantity, and stops at the cap', () => {
      expect(listOf(`?world=11304&view=list&list=${INGOT}x2&list=${GREATSWORD}&list=${INGOT}x5000000`).list).toEqual([[INGOT, 999_999], [GREATSWORD, 1]])
      const ids = craftIndexFor(catalogFor('Light')).craftables.slice(0, MAX_LINES + 1).map((craftable) => `list=${craftable.item.id}`)
      expect(listOf(`?world=11304&view=list&${ids.join('&')}`).list).toHaveLength(MAX_LINES)
    })

    it('carries a list on the calculator view without opening it there', () => {
      expect(listOf(`?world=11304&item=${GREATSWORD}&list=${INGOT}x2`)).toEqual({ list: [[INGOT, 2]], view: 'calculator', notes: [] })
    })
  })

  it('keeps the recipient recent worlds and never stores a world the recipient did not pick', () => {
    expect(seedOf(openLink('?world=11304', mine, serverDirectory)).setup.recent).toEqual([12304])
    const firstVisit = seedOf(openLink('?world=99999', DEFAULT_SETUP, serverDirectory))
    expect(firstVisit.setup.world).toBeNull()
    expect(firstVisit.setup.recent).toEqual([])
  })

  it('is no link without a key it knows', () => {
    const absent = { seed: null, notes: [] }
    expect(openLink('', mine, null)).toEqual(absent)
    expect(openLink('?utm_source=discord&utm_medium=chat', mine, serverDirectory)).toEqual(absent)
  })

  it('waits for the world list only when the plan cannot open on the saved world', () => {
    expect(openLink('?world=11304&item=110140013', mine, null)).toBe('waiting')
    expect(openLink('?world=11304&item=110140013', DEFAULT_SETUP, null)).toBe('waiting')
    expect(openLink('?item=110140013', DEFAULT_SETUP, null)).toBe('waiting')
    const empty: WorldDirectory = { defaultId: 11304, count: 0, regions: [], byId: new Map() }
    expect(seedOf(openLink('?world=11304&item=110140013', mine, empty)).setup.world).toBe(LUMIEL)
  })

  interface Case {
    name: string
    search: string
    stored: Setup
    directory: WorldDirectory | null
    world: WorldId
    itemId: ItemId | null
    notes: LinkNote[]
  }

  const cases: Case[] = [
    { name: 'own world without the list', search: `?world=12304&item=${GREATSWORD_DARK}`, stored: mine, directory: null, world: 12304, itemId: GREATSWORD_DARK, notes: [] },
    { name: 'own world, Light id', search: `?world=12304&item=${GREATSWORD}`, stored: mine, directory: null, world: 12304, itemId: GREATSWORD_DARK, notes: [] },
    { name: 'another world with the list', search: `?world=11304&item=${GREATSWORD}`, stored: mine, directory: serverDirectory, world: 11304, itemId: GREATSWORD, notes: [] },
    { name: 'first visit with the list', search: `?world=12304&item=${GREATSWORD_DARK}`, stored: DEFAULT_SETUP, directory: serverDirectory, world: 12304, itemId: GREATSWORD_DARK, notes: [] },
    {
      name: 'unknown world, recipient on the other side',
      search: `?world=99999&item=${GREATSWORD}`,
      stored: mine,
      directory: serverDirectory,
      world: 12304,
      itemId: GREATSWORD_DARK,
      notes: [{ kind: 'world-unknown', worldId: 99999, shown: 'Lumiel' }],
    },
    {
      name: 'unknown world on a first visit',
      search: `?world=99999&item=${GREATSWORD}`,
      stored: DEFAULT_SETUP,
      directory: serverDirectory,
      world: 11304,
      itemId: GREATSWORD,
      notes: [{ kind: 'world-unknown', worldId: 99999, shown: 'Kaisinel' }],
    },
    {
      name: 'item with no counterpart on the side',
      search: `?world=12304&item=${DRAGON_LORD}`,
      stored: mine,
      directory: serverDirectory,
      world: 12304,
      itemId: null,
      notes: [{ kind: 'item-unknown', itemId: DRAGON_LORD, side: 'Asmodian' }],
    },
    {
      name: 'item no recipe makes',
      search: `?world=11304&item=${NOT_CRAFTED}`,
      stored: mine,
      directory: serverDirectory,
      world: 11304,
      itemId: null,
      notes: [{ kind: 'item-unknown', itemId: NOT_CRAFTED, side: 'Elyos' }],
    },
    { name: 'item both sides craft', search: `?world=12304&item=${INGOT}`, stored: mine, directory: serverDirectory, world: 12304, itemId: INGOT, notes: [] },
    { name: 'no world key, offline', search: `?item=${GREATSWORD}&qty=3`, stored: mine, directory: null, world: 12304, itemId: GREATSWORD_DARK, notes: [] },
    { name: 'no world key, first visit', search: `?item=${GREATSWORD}`, stored: DEFAULT_SETUP, directory: serverDirectory, world: 11304, itemId: GREATSWORD, notes: [] },
  ]

  it.each(cases)('opens $name on the world Session resolves from the seed', ({ search, stored, directory, world, itemId, notes }) => {
    const opened = openLink(search, stored, directory)
    const seed = seedOf(opened)
    const shown = resolveWorld(directory, seed.setup.world)?.world
    expect(shown?.id).toBe(world)
    expect(seed.target.itemId).toBe(itemId)
    if (shown && itemId !== null) expect(craftIndexFor(catalogFor(shown.race)).byId.has(itemId)).toBe(true)
    expect(opened !== 'waiting' && opened.notes).toEqual(notes)
  })

  it('reads a value that is not plain digits as absent', () => {
    const seed = seedOf(openLink('?world=12304&item=abc&qty=3.5&tl=1e2&bs=-4&tax=five&morph=yes&credit=true&view=map', mine, null))
    expect(seed.target).toEqual({ itemId: null, quantity: 1 })
    expect(settingsOf(seed.setup)).toEqual(settingsOf(DEFAULT_SETUP))
    expect(seed.view).toBe('calculator')
  })

  it('clamps quantity, mastery and tax to what the forms allow', () => {
    const seed = seedOf(openLink('?world=12304&qty=5000000&tl=150&tax=80', mine, null))
    expect(seed.target.quantity).toBe(999_999)
    expect(seed.setup.mastery.Tailoring).toBe(100)
    expect(seed.setup.taxRate).toBe(0.5)
    expect(seedOf(openLink('?world=12304&qty=0', mine, null)).target.quantity).toBe(1)
  })
})
