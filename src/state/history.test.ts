import { describe, expect, it } from 'vitest'
import type { PricePoint } from '../market/exchangeClient.ts'
import { chartModel, dateTicks, historySummary, nearestPoint, pointText, RANGES, sparklinePath, sparklinePoints } from './history.ts'

const series = (...lows: (number | null)[]): PricePoint[] =>
  lows.map((low, index) => ({ ts: `2026-10-2${index}T00:00:00Z`, low, high: low, avg: low, close: low, listings: low === null ? null : 1 }))

const at = (hour: number) => new Date(Date.UTC(2026, 9, 20, hour)).toISOString()

const bucket = (hour: number, low: number | null, rest: Partial<PricePoint> = {}): PricePoint => ({
  ts: at(hour),
  low,
  high: low,
  avg: low,
  close: low,
  listings: low === null ? null : 1,
  ...rest,
})

describe('historySummary', () => {
  it('needs two known lows to say anything', () => {
    expect(historySummary([])).toBeNull()
    expect(historySummary(series(500))).toBeNull()
    expect(historySummary(series(null, 500, null))).toBeNull()
  })

  it('reads the range with its dates and both ends over the known lows, skipping buckets with no listing', () => {
    expect(historySummary(series(null, 100, null, 300, 200, null, 400, 250, null))).toEqual({
      low: 100,
      lowAt: '2026-10-21T00:00:00Z',
      high: 400,
      highAt: '2026-10-26T00:00:00Z',
      first: 100,
      last: 250,
      now: 250,
      trend: 'up',
    })
  })

  it('takes the high from the highest high of a bucket and now from the last close', () => {
    expect(historySummary([bucket(0, 100, { high: 150 }), bucket(1, 120, { high: 400, close: 130 }), bucket(2, 110, { high: 200, close: 125 })])).toMatchObject({
      low: 100,
      lowAt: at(0),
      high: 400,
      highAt: at(1),
      last: 110,
      now: 125,
    })
  })

  it('calls a fall down, measured between the first and last known lows rather than the extremes', () => {
    expect(historySummary(series(null, 500, 900, 400, null))).toMatchObject({ first: 500, last: 400, high: 900, trend: 'down' })
  })

  it('calls a last low within 2% of the first flat, on either side', () => {
    expect(historySummary(series(1000, 1500, 1020))?.trend).toBe('flat')
    expect(historySummary(series(1000, 600, 980))?.trend).toBe('flat')
    expect(historySummary(series(1000, 1021))?.trend).toBe('up')
    expect(historySummary(series(1000, 979))?.trend).toBe('down')
  })

  it('is flat for an unchanged price, dated at its first bucket', () => {
    expect(historySummary(series(99_999, 99_999, 99_999))).toEqual({
      low: 99_999,
      lowAt: '2026-10-20T00:00:00Z',
      high: 99_999,
      highAt: '2026-10-20T00:00:00Z',
      first: 99_999,
      last: 99_999,
      now: 99_999,
      trend: 'flat',
    })
  })
})

describe('sparklinePath', () => {
  it('runs from the first low to the last, high prices up, with 1 px of padding', () => {
    expect(sparklinePath(series(100, 300, 200), 92, 24)).toBe('M1 23 L46 1 L91 12')
  })

  it('leaves a gap where a bucket has no listing and draws a line across it', () => {
    expect(sparklinePath(series(100, null, 300, 200), 92, 24)).toBe('M1 23 L61 1 L91 12')
    expect(sparklinePath(series(null, 100, 200), 92, 24)).toBe('M46 23 L91 1')
  })

  it('draws a flat series at mid height', () => {
    expect(sparklinePath(series(500, 500, 500), 92, 24)).toBe('M1 12 L46 12 L91 12')
  })

  it('rounds to hundredths so the path stays short', () => {
    expect(sparklinePath(series(100, 200, 300, 400), 120, 24)).toBe('M1 23 L40.33 15.67 L79.67 8.33 L119 1')
  })

  it('draws nothing without a known low', () => {
    expect(sparklinePath([], 92, 24)).toBe('')
    expect(sparklinePath(series(null, null), 92, 24)).toBe('')
  })
})

describe('sparklinePoints', () => {
  it('ends on the last known low, where the dot goes', () => {
    const points = sparklinePoints(series(100, null, 300, 200, null), 92, 24)
    expect(points[points.length - 1]).toEqual({ x: 68.5, y: 12 })
  })
})

describe('RANGES', () => {
  it('asks for hourly buckets over 7 days and six-hour buckets over 30', () => {
    expect(RANGES['7d'].bucket).toBe('1h')
    expect(RANGES['30d'].bucket).toBe('6h')
  })
})

describe('chartModel', () => {
  // Four hourly buckets with the 03:00 one left out, as the exchange does, in a box whose plot is 100 px tall.
  const points = [bucket(0, 100, { high: 120, avg: 110 }), bucket(1, 200, { high: 260, avg: 230 }), bucket(2, null), bucket(4, 300)]
  const model = chartModel(points, [], 100, 142)

  it('leaves the top for a rule label and the bottom for the date strip', () => {
    expect(model.plot).toEqual({ top: 16, bottom: 116 })
  })

  it('places every point by its time, so a missing bucket keeps its gap', () => {
    expect(model.xs).toEqual([1, 25.5, 50, 99])
  })

  it('draws the low line over the known lows with the highest high at the top', () => {
    expect(model.low).toBe('M1 116 L25.5 66 L99 16')
    expect(model.end).toEqual({ x: 99, y: 16 })
  })

  it('draws the avg line and closes the band back along the highs', () => {
    expect(model.avg).toBe('M1 111 L25.5 51 L99 16')
    expect(model.band).toBe('M1 116 L25.5 66 L99 16 L99 16 L25.5 36 L1 106 Z')
  })

  it('rules the plot at round Kina values inside the range', () => {
    expect(model.yTicks).toEqual([
      { y: 116, value: 100 },
      { y: 91, value: 150 },
      { y: 66, value: 200 },
      { y: 41, value: 250 },
      { y: 16, value: 300 },
    ])
    expect(chartModel([bucket(0, 99_998), bucket(1, 999_999)], [], 100, 142).yTicks.map(({ value }) => value)).toEqual([200_000, 400_000, 600_000, 800_000])
  })

  it('places the given date ticks by time', () => {
    expect(chartModel(points, [Date.UTC(2026, 9, 20, 1), Date.UTC(2026, 9, 20, 3)], 100, 142).xTicks).toEqual([
      { x: 25.5, at: Date.UTC(2026, 9, 20, 1) },
      { x: 74.5, at: Date.UTC(2026, 9, 20, 3) },
    ])
  })

  it('draws an unchanged price at mid height between rules around it', () => {
    const flat = chartModel([bucket(0, 500), bucket(1, 500)], [], 100, 142)
    expect(flat.low).toBe('M1 66 L99 66')
    expect(flat.yTicks.map(({ value }) => value)).toEqual([480, 490, 500, 510, 520])
  })
})

describe('dateTicks', () => {
  const midnight = new Date(2026, 9, 20).getTime()
  const hourly = (fromHour: number, toHour: number) =>
    Array.from({ length: toHour - fromHour + 1 }, (_, i) => bucket(0, 100, { ts: new Date(midnight + (fromHour + i) * 3_600_000).toISOString() }))
  const dates = (ticks: number[]) => ticks.map((tick) => [new Date(tick).getDate(), new Date(tick).getHours(), new Date(tick).getMinutes()])

  it('ticks each local midnight the series spans, the first included when the series starts on it', () => {
    expect(dates(dateTicks(hourly(0, 48), 1))).toEqual([[20, 0, 0], [21, 0, 0], [22, 0, 0]])
    expect(dates(dateTicks(hourly(3, 48), 1))).toEqual([[21, 0, 0], [22, 0, 0]])
  })

  it('keeps every n-th midnight from the first', () => {
    expect(dates(dateTicks(hourly(0, 48), 2))).toEqual([[20, 0, 0], [22, 0, 0]])
    expect(dateTicks([], 1)).toEqual([])
  })
})

describe('nearestPoint', () => {
  const points = [bucket(0, 100), bucket(1, 200), bucket(2, null), bucket(4, 300)]

  it('picks by time, so the gap before a late bucket belongs to whichever side is nearer', () => {
    expect(nearestPoint(points, 0.6)).toBe(2)
    expect(nearestPoint(points, 0.8)).toBe(3)
  })

  it('picks the ends at the edges and beyond them', () => {
    expect(nearestPoint(points, 0)).toBe(0)
    expect(nearestPoint(points, 1)).toBe(3)
    expect(nearestPoint(points, -1)).toBe(0)
    expect(nearestPoint(points, 2)).toBe(3)
  })
})

describe('pointText', () => {
  it('spells out the spread of a bucket that has one', () => {
    expect(pointText(bucket(0, 499_999, { high: 689_994, avg: 545_998.2, listings: 17 }))).toBe('low 499,999, avg 545,998, high 689,994, 17 listings')
  })

  it('gives the one price of a bucket with a single sample', () => {
    expect(pointText(bucket(0, 99_999, { listings: 44 }))).toBe('99,999, 44 listings')
    expect(pointText(bucket(0, 99_999, { listings: 1 }))).toBe('99,999, 1 listing')
    expect(pointText(bucket(0, 99_999, { listings: null }))).toBe('99,999')
  })

  it('says so when the bucket had no listing', () => {
    expect(pointText(bucket(0, null))).toBe('no listing')
  })
})
