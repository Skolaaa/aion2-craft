import { describe, expect, it } from 'vitest'
import type { PricePoint } from '../market/exchangeClient.ts'
import { historySummary, sparklinePath, sparklinePoints } from './history.ts'

const series = (...lows: (number | null)[]): PricePoint[] =>
  lows.map((low, index) => ({ ts: `2026-10-2${index}T00:00:00Z`, low, high: low, avg: low, close: low, listings: low === null ? null : 1 }))

describe('historySummary', () => {
  it('needs two known lows to say anything', () => {
    expect(historySummary([])).toBeNull()
    expect(historySummary(series(500))).toBeNull()
    expect(historySummary(series(null, 500, null))).toBeNull()
  })

  it('reads the range and both ends over the known lows, skipping buckets with no listing', () => {
    expect(historySummary(series(null, 100, null, 300, 200, null, 400, 250, null))).toEqual({
      low: 100,
      high: 400,
      first: 100,
      last: 250,
      trend: 'up',
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

  it('is flat for an unchanged price', () => {
    expect(historySummary(series(99_999, 99_999, 99_999))).toEqual({ low: 99_999, high: 99_999, first: 99_999, last: 99_999, trend: 'flat' })
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
