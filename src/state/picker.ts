import type { Race } from '../domain/types.ts'
import { PAIRING, SIDE, type Listed, type RegionGroup, type WorldDirectory, type WorldId } from '../market/worlds.ts'
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
  keyboardOrder: readonly PickerOption[]
}

const option = (section: 'recent' | 'world', listed: Listed): PickerOption => ({ domId: `picker-${section}-${listed.world.id}`, listed })

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
  return { recent: recentOptions, groups, keyboardOrder: [...recentOptions, ...groups.flatMap((group) => group.options)] }
}

export const initialActive = (view: PickerView, currentId: WorldId): string | null =>
  (view.keyboardOrder.find(({ listed }) => listed.world.id === currentId) ?? view.keyboardOrder[0])?.domId ?? null

export const withText = (query: PickerQuery, text: string): PickerQuery =>
  query.text === '' && text !== '' ? { ...query, text, region: null } : { ...query, text }

export const groupNote = ({ region, options }: PickerGroup) => `${region.name}, ${options.length} ${plural(options.length, 'world', 'worlds')}`

export const pairingNote = () => `Pairs from NCSoft's notice of ${shortDate(PAIRING.since)}.`

export function currentNote({ world, match }: Listed) {
  const matched = match ? `Matched with ${match.world.name}, ${SIDE[match.world.race].name}, since ${shortDate(match.since)}. ` : ''
  return `${matched}Server ${world.id}. The market stays per world.`
}
