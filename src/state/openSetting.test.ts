import { describe, expect, it } from 'vitest'
import { SETTINGS, settingKey } from './openSetting.ts'

describe('SETTINGS.first', () => {
  it('is a world setting with a key of its own, so the chip and the first-visit picker never share a surface', () => {
    expect(SETTINGS.first.kind).toBe('world')
    expect(settingKey(SETTINGS.first)).toBe('world-first')
    expect(settingKey(SETTINGS.first)).not.toBe(settingKey(SETTINGS.world))
  })
})
