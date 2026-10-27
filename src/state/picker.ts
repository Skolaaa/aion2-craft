import type { Race } from '../domain/types.ts'
import { SIDE, type Listed, type RegionGroup, type WorldDirectory, type WorldId } from '../market/worlds.ts'
import { plural, shortDate } from './format.ts'
import { matches, termsOf } from './search.ts'

export interface PickerQuery {
  text: string
  region: string | null
  race: Race | null
}

export interface PickerOption {
  domId: string
  listed: Listed
}

export interface PickerGroup {
  region: RegionGroup
  options: readonly PickerOption[]
}

export interface PickerView {
  recent: readonly PickerOption[]
  groups: readonly PickerGroup[]
  // Keyboard order: recent rows, then each group's rows. A recent world appears twice.
  options: readonly PickerOption[]
}

const option = (section: 'recent' | 'world', listed: Listed): PickerOption => ({ domId: `picker-${section}-${listed.world.id}`, listed })

// Recent worlds show only while nothing is typed, and the filters apply to them like to any row.
export function pickerView(directory: WorldDirectory, query: PickerQuery, recent: readonly WorldId[]): PickerView {
  const terms = termsOf(query.text)
  const keep = ({ world }: Listed) =>
    (query.region === null || world.region === query.region) &&
    (query.race === null || world.race === query.race) &&
    matches(`${world.name} ${world.region} ${world.regionName}`, terms)

  const recentOptions =
    terms.length > 0
      ? []
      : recent.flatMap((id) => {
          const listed = directory.byId.get(id)
          return listed && keep(listed) ? [option('recent', listed)] : []
        })
  const groups = directory.regions
    .map((region) => ({ region, options: region.worlds.filter(keep).map((listed) => option('world', listed)) }))
    .filter((group) => group.options.length > 0)
  return { recent: recentOptions, groups, options: [...recentOptions, ...groups.flatMap((group) => group.options)] }
}

// Clamps at both ends, so holding an arrow key settles on the first or last row.
export function moveActive(view: PickerView, active: string | null, step: 1 | -1): string | null {
  const { options } = view
  const at = options.findIndex((candidate) => candidate.domId === active)
  const next = at === -1 ? 0 : Math.min(options.length - 1, Math.max(0, at + step))
  return options[next]?.domId ?? null
}

export const initialActive = (view: PickerView, currentId: WorldId): string | null =>
  (view.options.find(({ listed }) => listed.world.id === currentId) ?? view.options[0])?.domId ?? null

export function groupNote({ region, options }: PickerGroup) {
  const head = `${region.name}, ${options.length} ${plural(options.length, 'world', 'worlds')}`
  return region.matchedSince ? `${head}, matched since ${shortDate(region.matchedSince)}` : head
}

export function currentNote({ world, match }: Listed) {
  const matched = match ? `Matched with ${match.world.name}, ${SIDE[match.world.race].name}, since ${shortDate(match.since)}. ` : ''
  return `${matched}Server ${world.id}. The market stays per world.`
}
