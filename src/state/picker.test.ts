import { describe, expect, it } from 'vitest'
import { serverDirectory as directory } from '../market/worlds.fixture.ts'
import { currentNote, groupNote, initialActive, moveActive, pickerView, type PickerQuery } from './picker.ts'

const ALL: PickerQuery = { text: '', region: null, race: null }
const names = (options: readonly { listed: { world: { name: string; region: string } } }[]) =>
  options.map(({ listed }) => `${listed.world.region} ${listed.world.name}`)

describe('pickerView', () => {
  it('pins recent worlds above every region while nothing is typed', () => {
    const view = pickerView(directory, ALL, [11304, 11101, 99999])
    expect(names(view.recent)).toEqual(['EU Kaisinel', 'NAE Siel'])
    expect(view.recent[0]?.domId).toBe('picker-recent-11304')
    expect(view.groups.map((group) => group.region.code)).toEqual(['NAE', 'NAW', 'EU', 'LA', 'AS'])
    expect(view.options).toHaveLength(2 + 106)
  })

  it('finds a name in every region and drops the recent rows', () => {
    const view = pickerView(directory, { ...ALL, text: 'kai' }, [11304])
    expect(view.recent).toEqual([])
    expect(names(view.options)).toEqual(['NAE Kaisinel', 'NAW Kaisinel', 'EU Kaisinel', 'LA Kaisinel', 'AS Kaisinel'])
    expect(names(pickerView(directory, { ...ALL, text: 'eu kai' }, []).options)).toEqual(['EU Kaisinel'])
  })

  it('narrows rows and recent worlds to a region and a side', () => {
    const view = pickerView(directory, { text: '', region: 'EU', race: 'Dark' }, [12304, 11304, 12101])
    expect(names(view.recent)).toEqual(['EU Lumiel'])
    expect(view.groups).toHaveLength(1)
    expect(view.groups[0]?.options).toHaveLength(23)
    expect(view.options.every(({ listed }) => listed.world.race === 'Dark' && listed.world.region === 'EU')).toBe(true)
  })
})

describe('keyboard order', () => {
  const view = pickerView(directory, { ...ALL, region: 'NAW' }, [11204])

  it('starts on the current world, in the recent rows when it is there, else on the first row', () => {
    expect(initialActive(view, 11204)).toBe('picker-recent-11204')
    expect(initialActive(view, 12205)).toBe('picker-world-12205')
    expect(initialActive(view, 11304)).toBe('picker-recent-11204')
  })

  it('moves one row at a time and stops at both ends', () => {
    expect(moveActive(view, 'picker-recent-11204', 1)).toBe('picker-world-11201')
    expect(moveActive(view, 'picker-recent-11204', -1)).toBe('picker-recent-11204')
    expect(moveActive(view, 'picker-world-12205', 1)).toBe('picker-world-12205')
    expect(moveActive(view, null, 1)).toBe('picker-recent-11204')
  })
})

describe('picker text', () => {
  it('counts the shown worlds and dates the pairing', () => {
    const [nae] = pickerView(directory, { ...ALL, text: 'siel' }, []).groups
    if (!nae) throw new Error('no NAE group for siel')
    expect(groupNote(nae)).toBe('North America East, 1 world, matched since 4 Oct 2026')
  })

  it('spells out the current world and its enemy world', () => {
    const kaisinel = directory.byId.get(11304)
    if (!kaisinel) throw new Error('EU Kaisinel missing from the fixture')
    expect(currentNote(kaisinel)).toBe('Matched with Lumiel, Asmodian, since 4 Oct 2026. Server 11304. The market stays per world.')
    expect(currentNote({ ...kaisinel, match: null })).toBe('Server 11304. The market stays per world.')
  })
})
