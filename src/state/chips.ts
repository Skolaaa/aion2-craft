import { SIDE, type Listed } from '../market/worlds.ts'
import { shortDate } from './format.ts'

export interface WorldChip {
  value: string
  badge: string
  side: string
  region: string
  title: string
}

function matchNote({ world, match }: Listed) {
  const side = SIDE[world.race].name
  return match ? `${world.name}, ${side}, matched with ${match.world.name} since ${shortDate(match.since)}` : `${world.name}, ${side}`
}

export function worldChip(current: Listed): WorldChip {
  const { world } = current
  const side = SIDE[world.race]
  return { value: world.name, badge: side.badge, side: side.name, region: world.region, title: matchNote(current) }
}
