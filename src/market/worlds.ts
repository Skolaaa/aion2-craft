import type { Race } from '../domain/types.ts'

export type WorldId = number

export interface World {
  id: WorldId
  name: string
  region: string
  regionName: string
  race: Race
  hasData: boolean
}

export type IsoDate = `${number}-${number}-${number}`

export interface Match {
  world: World
  since: IsoDate
}

export interface Listed {
  world: World
  match: Match | null
}

export interface RegionGroup {
  code: string
  name: string
  worlds: readonly Listed[]
  matchedSince: IsoDate | null
}

export interface WorldDirectory {
  defaultId: WorldId
  count: number
  regions: readonly RegionGroup[]
  byId: ReadonlyMap<WorldId, Listed>
}

export interface KeyedWorld {
  world: World
  key: number
}

export const SIDE = {
  Light: { name: 'Elyos', badge: 'EL' },
  Dark: { name: 'Asmodian', badge: 'AS' },
} as const satisfies Record<Race, { name: string; badge: string }>

// game_server_key is side * 1000 + region * 100 + n, so EU Kaisinel 1304 meets EU Lumiel 2304.
// NC publishes pairs by name and rotates them.
export const PAIRING: { since: IsoDate; partnerKey(key: number): number } = {
  since: '2026-10-04',
  partnerKey: (key) => (key < 2000 ? key + 1000 : key - 1000),
}

const pairOrder = (a: KeyedWorld, b: KeyedWorld) => (a.key % 1000) - (b.key % 1000) || a.key - b.key

export function directoryOf(defaultId: WorldId, rows: readonly KeyedWorld[]): WorldDirectory {
  const byKey = new Map(rows.map((row) => [row.key, row.world]))
  const matchOf = ({ world, key }: KeyedWorld): Match | null => {
    const partner = byKey.get(PAIRING.partnerKey(key))
    if (!partner || partner.race === world.race || partner.region !== world.region) return null
    return { world: partner, since: PAIRING.since }
  }

  const grouped = new Map<string, { code: string; name: string; rows: KeyedWorld[] }>()
  for (const row of rows) {
    const { region, regionName } = row.world
    const group = grouped.get(region)
    if (group) group.rows.push(row)
    else grouped.set(region, { code: region, name: regionName, rows: [row] })
  }

  const byId = new Map<WorldId, Listed>()
  const regions = [...grouped.values()].map(({ code, name, rows: members }): RegionGroup => {
    const worlds = [...members].sort(pairOrder).map((row) => {
      const listed = { world: row.world, match: matchOf(row) }
      byId.set(row.world.id, listed)
      return listed
    })
    return { code, name, worlds, matchedSince: worlds.some((listed) => listed.match) ? PAIRING.since : null }
  })
  return { defaultId, count: rows.length, regions, byId }
}

// The directory's copy wins so hasData and the match are current.
export function resolveWorld(directory: WorldDirectory | null, saved: World | null): Listed | null {
  if (directory === null) return saved && { world: saved, match: null }
  const { byId, defaultId, regions } = directory
  return (saved && byId.get(saved.id)) ?? byId.get(defaultId) ?? regions[0]?.worlds[0] ?? null
}
