import { afterEach, describe, expect, it, vi } from 'vitest'
import { refreshLadders } from './exchangeClient.ts'

const LADDER = {
  captured_at: '2026-10-06T11:53:19Z',
  complete: true,
  listings_total: 2,
  units_total: 4,
  levels: [{ unit_price: 10, listings: 1, units: 1 }, { unit_price: 20, listings: 1, units: 3 }],
}
const NEVER_POLLED = { captured_at: null, levels: [] }
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })

describe('refreshLadders', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('asks for each item once, keeps the answer for an hour, and resolves null when nothing was new', async () => {
    const fetch = vi.fn(async (url: string) => json(url.includes('/items/1/') ? LADDER : NEVER_POLLED))
    vi.stubGlobal('fetch', fetch)
    const ladders = await refreshLadders(1234, [1, 2])
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/ex/api/items/1/depth/ladder?server=1234', '/ex/api/items/2/depth/ladder?server=1234'])
    expect(ladders && [...ladders.keys()]).toEqual([1])
    expect(ladders?.get(1)).toEqual({
      capturedAt: '2026-10-06T11:53:19Z',
      complete: true,
      units: 4,
      levels: [{ unitPrice: 10, listings: 1, units: 1 }, { unitPrice: 20, listings: 1, units: 3 }],
    })
    expect(await refreshLadders(1234, [1, 2])).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
