import { describe, expect, it } from 'vitest'
import { notice, noticeDirectory, noticeRows as rows } from './worlds.fixture.ts'
import { directoryOf, PAIRING, resolveWorld, type World } from './worlds.ts'

// Reversed so the pairing cannot lean on list order.
const directory = directoryOf(11304, [...rows].reverse())

describe('directoryOf', () => {
  it('pairs every world in the notice of 2026-10-04 with its enemy world, both ways', () => {
    const pairs = notice.flatMap((region) => region.pairs.map((pair) => ({ region: region.code, ...pair })))
    expect(pairs).toHaveLength(53)
    for (const { region, elyos, asmodian } of pairs) {
      const light = directory.byId.get(elyos.id)
      const dark = directory.byId.get(asmodian.id)
      expect(light?.match?.world.name, `${region} ${elyos.name}`).toBe(asmodian.name)
      expect(dark?.match?.world.name, `${region} ${asmodian.name}`).toBe(elyos.name)
      expect(light?.match?.world.region).toBe(region)
      expect(light?.match?.since).toBe(PAIRING.since)
    }
  })

  it('groups regions in first-seen order with each pair side by side', () => {
    const forward = noticeDirectory
    expect(forward.count).toBe(106)
    expect(forward.regions.map((region) => region.code)).toEqual(['NAE', 'NAW', 'EU', 'LA', 'AS'])
    const eu = forward.regions.find((region) => region.code === 'EU')
    expect(eu?.worlds.slice(0, 4).map(({ world }) => world.name)).toEqual(['Siel', 'Israphel', 'Nezekan', 'Zikel'])
    expect(eu?.matchedSince).toBe('2026-10-04')
  })

  it('leaves a world unmatched when the key points at the same side or another region', () => {
    const kaisinel = rows.find((row) => row.world.id === 11304)
    const lumiel = rows.find((row) => row.world.id === 12304)
    const naeLumiel = rows.find((row) => row.world.id === 12104)
    if (!kaisinel || !lumiel || !naeLumiel) throw new Error('fixture lost EU Kaisinel, EU Lumiel or NAE Lumiel')
    const sameSide = directoryOf(11304, [kaisinel, { ...lumiel, world: { ...lumiel.world, race: 'Light' } }])
    expect(sameSide.byId.get(11304)?.match).toBeNull()
    const otherRegion = directoryOf(11304, [kaisinel, { ...naeLumiel, key: 2304 }])
    expect(otherRegion.byId.get(11304)?.match).toBeNull()
    expect(otherRegion.regions.find((region) => region.code === 'EU')?.matchedSince).toBeNull()
  })
})

describe('resolveWorld', () => {
  const saved: World = { id: 12304, name: 'Lumiel', region: 'EU', regionName: 'Europe', race: 'Dark', hasData: false }

  it('prefers the directory copy of the saved world', () => {
    const resolved = resolveWorld(directory, saved)
    expect(resolved?.world.hasData).toBe(true)
    expect(resolved?.match?.world.name).toBe('Kaisinel')
  })

  it('falls back to the default world when the saved one is gone or missing', () => {
    expect(resolveWorld(directory, { ...saved, id: 99999 })?.world.id).toBe(11304)
    expect(resolveWorld(directory, null)?.world.id).toBe(11304)
  })

  it('wraps the saved world without a match while the list is not loaded', () => {
    expect(resolveWorld(null, saved)).toEqual({ world: saved, match: null })
    expect(resolveWorld(null, null)).toBeNull()
  })
})
