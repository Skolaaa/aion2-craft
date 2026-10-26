import { describe, expect, it } from 'vitest'
import { messageOf } from './feedError.ts'

describe('messageOf', () => {
  it('keeps the path and status of a failed request but not its query', () => {
    expect(messageOf(new Error('aion2.exchange /items?keys=1,2,3&server=11304&limit=100: HTTP 502'))).toBe('aion2.exchange /items: HTTP 502')
    expect(messageOf(new TypeError('Failed to fetch'))).toBe('Failed to fetch')
    expect(messageOf('offline')).toBe('offline')
  })
})
