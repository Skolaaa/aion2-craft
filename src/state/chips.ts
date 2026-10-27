import { SIDE, type Listed } from '../market/worlds.ts'
import { shortDate, taxPercent } from './format.ts'
import { PLAN_FLAGS, PROFESSIONS, type Setup } from './setup.ts'

export interface Chip {
  value: string
  title: string
}

export interface MasteryPair {
  abbr: string
  value: number
  title: string
}

export interface StatusChips {
  region: Chip
  world: Chip & { badge: string; side: string }
  tax: Chip
  mastery: { pairs: readonly MasteryPair[]; collapsed: string; spoken: string; title: string }
  plan: Chip
}

function matchNote({ world, match }: Listed) {
  const side = SIDE[world.race].name
  return match ? `${world.name}, ${side}, matched with ${match.world.name} since ${shortDate(match.since)}` : `${world.name}, ${side}`
}

function collapsed(values: readonly number[]) {
  const [first, second] = values
  if (first === undefined) return ''
  return values.every((value) => value === first) ? `${values.length}×${first}` : `${first}/${second}/…`
}

// Every string the status line shows, so the header only lays them out.
export function statusChips(setup: Pick<Setup, 'mastery' | 'taxRate' | 'allowCraft' | 'allowMorph' | 'byproductCredit'>, current: Listed): StatusChips {
  const { world } = current
  const pairs = PROFESSIONS.map(({ id, label, inGame, abbr }) => ({
    abbr,
    value: setup.mastery[id],
    title: `${label} ${setup.mastery[id]}${inGame ? `, ${inGame} in game` : ''}`,
  }))
  const spoken = pairs.map((pair) => pair.title).join('; ')
  const on = PLAN_FLAGS.filter((flag) => setup[flag]).length
  return {
    region: { value: world.region, title: world.regionName },
    world: { value: world.name, title: matchNote(current), badge: SIDE[world.race].badge, side: SIDE[world.race].name },
    tax: { value: `${taxPercent(setup.taxRate).toFixed(1)}%`, title: 'Market tax' },
    mastery: {
      pairs,
      collapsed: collapsed(pairs.map((pair) => pair.value)),
      spoken,
      title: `Mastery: ${spoken}`,
    },
    plan: { value: `${on}/${PLAN_FLAGS.length}`, title: `${on} of ${PLAN_FLAGS.length} plan options on` },
  }
}
