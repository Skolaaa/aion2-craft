import notice from '../../docs/explorations/worlds.json'
import { directoryOf, type KeyedWorld, type World } from './worlds.ts'

// NC's notice of 2026-10-04 as worlds.json records it. The exchange's game_server_key is
// server_id - 10000 for all 106 worlds (checked against /api/servers).
export { notice }

const keyed = (world: World): KeyedWorld => ({ world, key: world.id - 10000 })

export const noticeRows: KeyedWorld[] = notice.flatMap((region) =>
  region.pairs.flatMap(({ elyos, asmodian }) => [
    keyed({ ...elyos, region: region.code, regionName: region.name, race: 'Light' }),
    keyed({ ...asmodian, region: region.code, regionName: region.name, race: 'Dark' }),
  ]),
)

export const noticeDirectory = directoryOf(11304, noticeRows)
