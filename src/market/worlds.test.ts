import { describe, expect, it } from 'vitest'
import { directoryFromServers } from './exchangeClient.ts'
import { notice, serverDirectory, servers } from './worlds.fixture.ts'
import { PAIRING, resolveWorld, type World } from './worlds.ts'

const reversedDirectory = directoryFromServers({ ...servers, servers: [...servers.servers].reverse() })
const server = (id: number) => {
  const found = servers.servers.find((s) => s.server_id === id)
  if (!found) throw new Error(`servers.fixture.json lost server ${id}`)
  return found
}

describe('directoryOf', () => {
  it('pairs every world in the notice of 2026-10-04 with its enemy world, both ways, on the live keys', () => {
    const pairs = notice.flatMap((region) => region.pairs.map((pair) => ({ region: region.code, ...pair })))
    expect(pairs).toHaveLength(53)
    for (const { region, elyos, asmodian } of pairs) {
      const light = reversedDirectory.byId.get(elyos.id)
      const dark = reversedDirectory.byId.get(asmodian.id)
      expect(light?.match?.world.name, `${region} ${elyos.name}`).toBe(asmodian.name)
      expect(dark?.match?.world.name, `${region} ${asmodian.name}`).toBe(elyos.name)
      expect(light?.match?.world.region).toBe(region)
      expect(light?.match?.since).toBe(PAIRING.since)
    }
  })

  it('groups regions in first-seen order with each pair side by side', () => {
    const forward = serverDirectory
    expect(forward.count).toBe(106)
    expect(forward.regions.map((region) => region.code)).toEqual(['NAE', 'NAW', 'EU', 'LA', 'AS'])
    const eu = forward.regions.find((region) => region.code === 'EU')
    expect(eu?.worlds.slice(0, 4).map(({ world }) => world.name)).toEqual(['Siel', 'Israphel', 'Nezekan', 'Zikel'])
    expect(eu?.matchedSince).toBe('2026-10-04')
  })

  it('leaves a world unmatched when the key points at the same side or another region', () => {
    const kaisinel = server(11304)
    const lumiel = server(12304)
    const sameSide = directoryFromServers({ default: 11304, servers: [kaisinel, { ...lumiel, faction: 'Elyos' }] })
    expect(sameSide.byId.get(11304)?.match).toBeNull()
    const otherRegion = directoryFromServers({ default: 11304, servers: [kaisinel, { ...server(12104), game_server_key: 2304 }] })
    expect(otherRegion.byId.get(11304)?.match).toBeNull()
    expect(otherRegion.regions.find((region) => region.code === 'EU')?.matchedSince).toBeNull()
  })
})

describe('resolveWorld', () => {
  const saved: World = { id: 12304, name: 'Lumiel', region: 'EU', regionName: 'Europe', race: 'Dark', hasData: false }

  it('prefers the directory copy of the saved world', () => {
    const resolved = resolveWorld(reversedDirectory, saved)
    expect(resolved?.world.hasData).toBe(true)
    expect(resolved?.match?.world.name).toBe('Kaisinel')
  })

  it('falls back to the default world when the saved one is gone or missing', () => {
    expect(resolveWorld(reversedDirectory, { ...saved, id: 99999 })?.world.id).toBe(11304)
    expect(resolveWorld(reversedDirectory, null)?.world.id).toBe(11304)
  })

  it('wraps the saved world without a match while the list is not loaded', () => {
    expect(resolveWorld(null, saved)).toEqual({ world: saved, match: null })
    expect(resolveWorld(null, null)).toBeNull()
  })
})
