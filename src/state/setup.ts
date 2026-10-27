import type { Mastery, Profession } from '../domain/types.ts'
import type { World, WorldId } from '../market/worlds.ts'
import { clamp } from './number.ts'
import { isFiniteNumber, isRecord } from './usePersistentState.ts'

export const PROFESSIONS: readonly { id: Profession; label: string; inGame: string | null; abbr: string }[] = [
  { id: 'Blacksmithing', label: 'Blacksmithing', inGame: null, abbr: 'BS' },
  { id: 'Tailoring', label: 'Tailoring', inGame: 'Armorsmithing', abbr: 'TL' },
  { id: 'Jewelcrafting', label: 'Jewelcrafting', inGame: 'Handicrafting', abbr: 'JC' },
  { id: 'Alchemy', label: 'Alchemy', inGame: null, abbr: 'AL' },
  { id: 'Cooking', label: 'Cooking', inGame: null, abbr: 'CK' },
]

export const PLAN_FLAGS = ['allowCraft', 'allowMorph', 'byproductCredit'] as const
export type PlanFlag = (typeof PLAN_FLAGS)[number]

export const MAX_MASTERY = 100
export const DEFAULT_TAX = 0.05
export const MAX_RECENT = 3

export interface Setup {
  world: World | null
  recent: readonly WorldId[]
  mastery: Mastery
  taxRate: number
  allowCraft: boolean
  allowMorph: boolean
  byproductCredit: boolean
}

// Everything a form may change. world and recent change together through setWorld.
export type SetupPatch = Partial<Omit<Setup, 'world' | 'recent'>>

const DEFAULT_MASTERY: Mastery = {
  Blacksmithing: MAX_MASTERY, Tailoring: MAX_MASTERY, Jewelcrafting: MAX_MASTERY, Alchemy: MAX_MASTERY, Cooking: MAX_MASTERY,
}

export const DEFAULT_SETUP: Setup = {
  world: null,
  recent: [],
  mastery: DEFAULT_MASTERY,
  taxRate: DEFAULT_TAX,
  allowCraft: true,
  allowMorph: true,
  byproductCredit: false,
}

function parseWorld(raw: unknown): World | null {
  if (!isRecord(raw)) return null
  const { id, name, region, regionName, race, hasData } = raw
  if (!isFiniteNumber(id) || typeof name !== 'string' || typeof region !== 'string' || typeof regionName !== 'string') return null
  if ((race !== 'Light' && race !== 'Dark') || typeof hasData !== 'boolean') return null
  return { id, name, region, regionName, race, hasData }
}

function parseRecent(raw: unknown): WorldId[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter(isFiniteNumber))].slice(0, MAX_RECENT)
}

function parseMastery(raw: unknown): Mastery {
  const mastery = { ...DEFAULT_MASTERY }
  if (!isRecord(raw)) return mastery
  for (const { id } of PROFESSIONS) {
    const value = raw[id]
    if (isFiniteNumber(value)) mastery[id] = clamp(Math.round(value), 0, MAX_MASTERY)
  }
  return mastery
}

export function parseSetup(raw: unknown): Setup | null {
  if (!isRecord(raw)) return null
  const flag = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)
  return {
    world: parseWorld(raw.world),
    recent: parseRecent(raw.recent),
    mastery: parseMastery(raw.mastery),
    taxRate: isFiniteNumber(raw.taxRate) ? clamp(raw.taxRate, 0, 0.5) : DEFAULT_TAX,
    allowCraft: flag(raw.allowCraft, DEFAULT_SETUP.allowCraft),
    allowMorph: flag(raw.allowMorph, DEFAULT_SETUP.allowMorph),
    byproductCredit: flag(raw.byproductCredit, DEFAULT_SETUP.byproductCredit),
  }
}

// The only writer of world and recent, so the two cannot disagree.
export const setWorld = (setup: Setup, world: World): Setup => ({
  ...setup,
  world,
  recent: [world.id, ...setup.recent.filter((id) => id !== world.id)].slice(0, MAX_RECENT),
})
