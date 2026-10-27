import type { ItemId } from '../domain/types.ts'
import { resolveWorld, SIDE, type WorldDirectory, type WorldId } from '../market/worlds.ts'
import { itemFor } from './craftables.ts'
import { taxPercent } from './format.ts'
import { parseSetup, PLAN_FLAGS, PROFESSIONS, settingsOf, type PlanFlag, type PlanSettings, type Setup } from './setup.ts'
import { parseTarget, parseView, type Target, type View } from './target.ts'

/** The plan the address bar spells. Prices, owned counts and recent worlds stay out of it. */
export interface PlanLink {
  worldId: WorldId
  view: View
  target: Target
  settings: PlanSettings
}

/** Starting values for the three persistent slots, complete in every field. */
export interface Seed {
  setup: Setup
  target: Target
  view: View
}

export type LinkNote =
  | { kind: 'world-unknown'; worldId: WorldId; shown: string }
  | { kind: 'item-unknown'; itemId: ItemId; side: string }

/** `seed: null` means the address carried no plan, so storage alone decides. */
export interface Opened {
  seed: Seed | null
  notes: readonly LinkNote[]
}

interface Parsed extends Omit<PlanLink, 'worldId'> {
  worldId: WorldId | null
}

// What an absent key means. Links outlive defaults in chat history, so this stays put when
// DEFAULT_SETUP changes; shareLink.test.ts fails on the drift so old links get a `v` key first.
const BASELINE: PlanSettings = {
  mastery: { Blacksmithing: 100, Tailoring: 100, Jewelcrafting: 100, Alchemy: 100, Cooking: 100 },
  taxRate: 0.05,
  allowCraft: true,
  allowMorph: true,
  byproductCredit: false,
}

const KEY = { world: 'world', item: 'item', qty: 'qty', tax: 'tax', view: 'view' } as const
const FLAG_KEY: Record<PlanFlag, string> = { allowCraft: 'craft', allowMorph: 'morph', byproductCredit: 'credit' }
const professionKey = (abbr: string) => abbr.toLowerCase()
const KEYS = [...Object.values(KEY), ...Object.values(FLAG_KEY), ...PROFESSIONS.map(({ abbr }) => professionKey(abbr))]

const ABSENT: Opened = { seed: null, notes: [] }

/** The query for a plan, such as `?world=11304&item=110140013&qty=40&tl=60`. A key appears only off its baseline. */
export function encodeLink({ worldId, view, target, settings }: PlanLink): string {
  const query = new URLSearchParams({ [KEY.world]: String(worldId) })
  if (target.itemId !== null) query.set(KEY.item, String(target.itemId))
  if (target.quantity !== 1) query.set(KEY.qty, String(target.quantity))
  for (const { id, abbr } of PROFESSIONS) {
    if (settings.mastery[id] !== BASELINE.mastery[id]) query.set(professionKey(abbr), String(settings.mastery[id]))
  }
  if (settings.taxRate !== BASELINE.taxRate) query.set(KEY.tax, String(taxPercent(settings.taxRate)))
  for (const flag of PLAN_FLAGS) {
    if (settings[flag] !== BASELINE[flag]) query.set(FLAG_KEY[flag], settings[flag] ? '1' : '0')
  }
  if (view !== 'calculator') query.set(KEY.view, view)
  return `?${query}`
}

// The URL is spelled as the JSON storage holds, so parseSetup and parseTarget own the clamps.
function decode(search: string): Parsed | null {
  const query = new URLSearchParams(search)
  if (!KEYS.some((key) => query.has(key))) return null
  const numeric = (key: string, pattern: RegExp) => {
    const text = query.get(key)
    return text !== null && pattern.test(text) ? Number(text) : null
  }
  const whole = (key: string) => numeric(key, /^\d+$/)
  const tax = numeric(KEY.tax, /^\d+(\.\d+)?$/)
  const flag = (name: PlanFlag) => {
    const text = query.get(FLAG_KEY[name])
    return text === '1' ? true : text === '0' ? false : BASELINE[name]
  }
  const setup = parseSetup({
    mastery: Object.fromEntries(PROFESSIONS.map(({ id, abbr }) => [id, whole(professionKey(abbr)) ?? BASELINE.mastery[id]])),
    taxRate: tax === null ? BASELINE.taxRate : tax / 100,
    ...Object.fromEntries(PLAN_FLAGS.map((name) => [name, flag(name)])),
  })
  const target = parseTarget({ itemId: whole(KEY.item), quantity: whole(KEY.qty) ?? 1 })
  if (setup === null || target === null) return null
  return { worldId: whole(KEY.world), view: parseView(query.get(KEY.view)) ?? 'calculator', target, settings: settingsOf(setup) }
}

/**
 * The plan a page load opens. A link is a complete plan: what it leaves out is the baseline, never
 * the recipient's setting. 'waiting' means only the world list can say which world it opens on,
 * so it never waits once `directory` is known.
 */
export function openLink(search: string, stored: Setup, directory: WorldDirectory | null): Opened | 'waiting' {
  const link = decode(search)
  if (link === null) return ABSENT
  const onStored = stored.world !== null && (link.worldId === null || link.worldId === stored.world.id)
  if (directory === null && !onStored) return 'waiting'
  const listed = link.worldId === null ? undefined : directory?.byId.get(link.worldId)
  const world = listed?.world ?? stored.world
  // Session runs the same resolveWorld on the seeded world, so both agree on the world the plan opens on.
  // Only an empty world list leaves it undefined.
  const shown = resolveWorld(directory, world)?.world

  const notes: LinkNote[] = []
  if (shown && link.worldId !== null && directory !== null && listed === undefined) {
    notes.push({ kind: 'world-unknown', worldId: link.worldId, shown: shown.name })
  }
  let { itemId } = link.target
  if (shown && itemId !== null) {
    const fitted = itemFor(shown.race, itemId)
    if (fitted === null) notes.push({ kind: 'item-unknown', itemId, side: SIDE[shown.race].name })
    itemId = fitted
  }
  return {
    seed: {
      setup: { ...stored, ...link.settings, world },
      target: { itemId, quantity: link.target.quantity },
      view: link.view,
    },
    notes,
  }
}

export function noteText(note: LinkNote): { title: string; body: string } {
  switch (note.kind) {
    case 'world-unknown':
      return {
        title: 'The link names a world that is not on the list',
        body: `World ${note.worldId} is not on the aion2.exchange world list, so the plan opens on ${note.shown}.`,
      }
    case 'item-unknown':
      return {
        title: 'The link names an item this side cannot craft',
        body: `No ${note.side} recipe makes item ${note.itemId}, so no item is open. Search for it by name.`,
      }
  }
}
