import type { DepthLadder, ItemId, MarketQuote, Race } from '../domain/types.ts'
import { directoryOf, SIDE, type KeyedWorld, type WorldDirectory } from './worlds.ts'

const API = '/ex/api'
const BATCH = 100
const MIN_REFRESH_MS = 60_000
const STORAGE_KEY = (serverId: number) => `aion2-craft:quotes:${serverId}`
const LADDER_KEY = (serverId: number) => `aion2-craft:ladders:${serverId}`
const LADDER_REFRESH_MS = 60 * 60_000
const LADDER_PAUSE_MS = 150
const FACTION_RACE = new Map(Object.entries(SIDE).map(([race, side]) => [side.name as string, race as Race]))

export interface QuoteSnapshot {
  serverId: number
  fetchedAt: string
  capturedAt: string | null
  quotes: Map<ItemId, MarketQuote>
}

export interface PricePoint {
  ts: string
  low: number | null
  high: number | null
  avg: number | null
  close: number | null
  listings: number | null
}

export interface ExchangeCraft {
  cost: number
  marketPrice: number | null
  capturedAt: string
}

type Json = Record<string, unknown>

function record(value: unknown, what: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`aion2.exchange: ${what} is not an object`)
  return value as Json
}

function list(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`aion2.exchange: ${what} is not a list`)
  return value
}

function num(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`aion2.exchange: ${what} is not a number`)
  return value
}

const numOrNull = (value: unknown, what: string) => (value === null || value === undefined ? null : num(value, what))

function str(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new Error(`aion2.exchange: ${what} is not text`)
  return value
}

async function findJson(path: string): Promise<Json | null> {
  const res = await fetch(`${API}${path}`, { headers: { Accept: 'application/json' } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`aion2.exchange ${path}: HTTP ${res.status}`)
  return record(await res.json(), path)
}

async function getJson(path: string): Promise<Json> {
  const body = await findJson(path)
  if (body === null) throw new Error(`aion2.exchange ${path}: HTTP 404`)
  return body
}

export function directoryFromServers(raw: unknown): WorldDirectory {
  const body = record(raw, '/servers')
  const rows = list(body.servers, 'servers').map((raw): KeyedWorld => {
    const s = record(raw, 'server')
    const race = FACTION_RACE.get(str(s.faction, 'faction'))
    if (!race) throw new Error(`aion2.exchange: unknown faction ${String(s.faction)}`)
    const world = {
      id: num(s.server_id, 'server_id'),
      name: str(s.name, 'name'),
      region: str(s.region, 'region'),
      regionName: str(s.region_name, 'region_name'),
      race,
      hasData: s.has_data === true,
    }
    return { world, key: num(s.game_server_key, 'game_server_key') }
  })
  return directoryOf(num(body.default, 'default'), rows)
}

export const fetchWorlds = async (): Promise<WorldDirectory> => directoryFromServers(await getJson('/servers'))

function parseQuote(raw: unknown): [ItemId, MarketQuote] {
  const item = record(raw, 'item')
  return [num(item.item_key, 'item_key'), {
    lowest: numOrNull(item.price, 'price'),
    listings: numOrNull(item.listings, 'listings') ?? 0,
    soldAvg: numOrNull(item.sold_avg_price, 'sold_avg_price'),
    capturedAt: str(item.captured_at, 'captured_at'),
  }]
}

export async function fetchQuotes(serverId: number, itemIds: readonly ItemId[]): Promise<Map<ItemId, MarketQuote>> {
  const quotes = new Map<ItemId, MarketQuote>()
  for (let i = 0; i < itemIds.length; i += BATCH) {
    const keys = itemIds.slice(i, i + BATCH).join(',')
    const body = await getJson(`/items?keys=${keys}&server=${serverId}&limit=${BATCH}`)
    for (const raw of list(body.items, 'items')) quotes.set(...parseQuote(raw))
  }
  return quotes
}

// 404 means the exchange holds no market data for the item, which is an answer and not a failure.
export async function fetchPriceHistory(itemId: ItemId, serverId: number, range = '7d', bucket = '6h'): Promise<PricePoint[]> {
  const body = await findJson(`/items/${itemId}/prices?range=${range}&bucket=${bucket}&server=${serverId}`)
  if (body === null) return []
  return list(body.points, 'points').map((raw) => {
    const p = record(raw, 'point')
    return {
      ts: str(p.ts, 'ts'),
      low: numOrNull(p.low, 'low'),
      high: numOrNull(p.high, 'high'),
      avg: numOrNull(p.avg, 'avg'),
      close: numOrNull(p.close, 'close'),
      listings: numOrNull(p.listings, 'listings'),
    }
  })
}

// aion2.exchange models a few items only and answers 404 for the rest.
export async function fetchExchangeCraft(targetId: ItemId, serverId: number): Promise<ExchangeCraft | null> {
  const body = await findJson(`/crafts/${targetId}?server=${serverId}`)
  if (body === null) return null
  const latest = record(body.latest, 'latest')
  return {
    cost: num(latest.cost, 'cost'),
    marketPrice: numOrNull(latest.market_price, 'market_price'),
    capturedAt: str(latest.captured_at, 'captured_at'),
  }
}

// The ladder is one poll's listings grouped by unit price, cheapest first. 404 means no listing was ever polled.
export async function fetchLadder(itemId: ItemId, serverId: number): Promise<DepthLadder | null> {
  const body = await findJson(`/items/${itemId}/depth/ladder?server=${serverId}`)
  if (body === null || body.captured_at == null) return null
  const levels = list(body.levels, 'levels').map((raw) => {
    const level = record(raw, 'level')
    return { unitPrice: num(level.unit_price, 'unit_price'), listings: num(level.listings, 'listings'), units: num(level.units, 'units') }
  })
  return {
    capturedAt: str(body.captured_at, 'captured_at'),
    complete: body.complete !== false,
    units: num(body.units_total, 'units_total'),
    levels,
  }
}

interface LadderEntry {
  fetchedAt: string
  ladder: DepthLadder | null
}

type LadderStore = Map<ItemId, LadderEntry>

function readStored<T>(key: string, parse: (raw: unknown) => T): T | null {
  try {
    const stored = localStorage.getItem(key)
    return stored ? parse(JSON.parse(stored)) : null
  } catch {
    return null
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // A full or blocked storage only costs the offline copy.
  }
}

const ladderStores = new Map<number, LadderStore>()

// Read from storage once per world and written back once per batch, so a batch touches storage at most once.
function ladderStore(serverId: number): LadderStore {
  let store = ladderStores.get(serverId)
  if (!store) {
    store = readStored(LADDER_KEY(serverId), (raw) => new Map(raw as [ItemId, LadderEntry][])) ?? new Map()
    ladderStores.set(serverId, store)
  }
  return store
}

const laddersOf = (store: LadderStore): Map<ItemId, DepthLadder> =>
  new Map([...store].flatMap(([itemId, { ladder }]) => (ladder ? [[itemId, ladder]] : [])))

export const loadLadders = (serverId: number) => laddersOf(ladderStore(serverId))

const fresh = (entry: LadderEntry | undefined) => entry !== undefined && Date.now() - Date.parse(entry.fetchedAt) < LADDER_REFRESH_MS

const ladderQueues = new Map<number, Promise<unknown>>()

// One request per item, one at a time per world with a pause between, and an item is asked for once an hour at
// most, the exchange's own polling interval. Resolves with every ladder cached for the world, or null when nothing
// new was fetched, so a caller can leave its state alone.
export function refreshLadders(serverId: number, itemIds: readonly ItemId[]): Promise<Map<ItemId, DepthLadder> | null> {
  const store = ladderStore(serverId)
  if (itemIds.every((itemId) => fresh(store.get(itemId)))) return Promise.resolve(null)
  const previous = ladderQueues.get(serverId) ?? Promise.resolve()
  const batch = previous.then(async () => {
    let fetched = false
    try {
      for (const itemId of itemIds) {
        if (fresh(store.get(itemId))) continue
        const ladder = await fetchLadder(itemId, serverId)
        store.set(itemId, { fetchedAt: new Date().toISOString(), ladder })
        fetched = true
        await new Promise((resolve) => setTimeout(resolve, LADDER_PAUSE_MS))
      }
    } finally {
      if (fetched) writeStored(LADDER_KEY(serverId), [...store])
    }
    return fetched ? laddersOf(store) : null
  })
  ladderQueues.set(serverId, batch.catch(() => undefined))
  return batch
}

const newest = (quotes: Map<ItemId, MarketQuote>) =>
  [...quotes.values()].reduce<string | null>((latest, q) => (latest === null || q.capturedAt > latest ? q.capturedAt : latest), null)

export const loadSnapshot = (serverId: number): QuoteSnapshot | null =>
  readStored(STORAGE_KEY(serverId), (raw) => {
    const { fetchedAt, quotes } = raw as { fetchedAt: string; quotes: [ItemId, MarketQuote][] }
    const map = new Map(quotes)
    return { serverId, fetchedAt, capturedAt: newest(map), quotes: map }
  })

const storeSnapshot = ({ serverId, fetchedAt, quotes }: QuoteSnapshot) => writeStored(STORAGE_KEY(serverId), { fetchedAt, quotes: [...quotes] })

const inFlight = new Map<number, Promise<QuoteSnapshot>>()

// aion2.exchange snapshots each world hourly, so a fetch younger than a minute is reused.
export function refreshSnapshot(serverId: number, itemIds: readonly ItemId[]): Promise<QuoteSnapshot> {
  const stored = loadSnapshot(serverId)
  if (stored && Date.now() - Date.parse(stored.fetchedAt) < MIN_REFRESH_MS) return Promise.resolve(stored)
  const running = inFlight.get(serverId)
  if (running) return running
  const request = fetchQuotes(serverId, itemIds)
    .then((quotes) => {
      const snapshot = { serverId, fetchedAt: new Date().toISOString(), capturedAt: newest(quotes), quotes }
      storeSnapshot(snapshot)
      return snapshot
    })
    .finally(() => inFlight.delete(serverId))
  inFlight.set(serverId, request)
  return request
}

export const nextRefreshAt = (snapshot: QuoteSnapshot) => Date.parse(snapshot.fetchedAt) + MIN_REFRESH_MS
