import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react'
import type { Race } from '../domain/types.ts'
import { SIDE, type Listed, type World, type WorldDirectory, type WorldId } from '../market/worlds.ts'
import { currentNote, groupNote, initialActive, moveActive, pickerView, type PickerOption, type PickerQuery } from '../state/picker.ts'

const SIDES: readonly { race: Race | null; label: string }[] = [
  { race: null, label: 'both' },
  { race: 'Light', label: SIDE.Light.name },
  { race: 'Dark', label: SIDE.Dark.name },
]

interface Props {
  directory: WorldDirectory
  current: Listed
  recent: readonly WorldId[]
  from: 'region' | 'world'
  onChoose(world: World): void
}

export function WorldPicker({ directory, current, recent, from, onChoose }: Props) {
  const listId = useId()
  const [query, setQuery] = useState<PickerQuery>({ text: '', region: from === 'region' ? current.world.region : null, race: null })
  const view = useMemo(() => pickerView(directory, query, recent), [directory, query, recent])
  const [active, setActive] = useState(() => initialActive(view, current.world.id))
  const activeId = view.options.some((option) => option.domId === active) ? active : (view.options[0]?.domId ?? null)

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  const filter = (change: Partial<PickerQuery>) => {
    setQuery((previous) => ({ ...previous, ...change }))
    setActive(null)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(moveActive(view, activeId, event.key === 'ArrowDown' ? 1 : -1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const chosen = view.options.find((option) => option.domId === activeId)
      if (chosen) onChoose(chosen.listed.world)
    }
  }

  const row = (option: PickerOption, showRegion: boolean) => {
    const { world, match } = option.listed
    const isCurrent = world.id === current.world.id
    return (
      <div
        key={option.domId}
        id={option.domId}
        role="option"
        aria-selected={isCurrent}
        className={`picker-row ${option.domId === activeId ? 'is-active' : ''} ${world.hasData ? '' : 'is-empty'}`}
        data-side={world.race}
        onMouseMove={() => setActive(option.domId)}
        onClick={() => onChoose(world)}
      >
        <span className="picker-name">
          {world.name}
          {showRegion && <span className="picker-region">{world.region}</span>}
          {!world.hasData && <span className="tag">no prices yet</span>}
          {isCurrent && <span className="tag">current</span>}
        </span>
        {match && (
          <span className="picker-vs">
            vs <span data-side={match.world.race} className="side-name">{match.world.name}</span>
          </span>
        )}
        <span className="side-badge" title={SIDE[world.race].name}>{SIDE[world.race].badge}</span>
        {isCurrent && <span className="picker-note">{currentNote(option.listed)}</span>}
      </div>
    )
  }

  const regions = [{ code: null, label: 'all' }, ...directory.regions.map((region) => ({ code: region.code, label: region.code }))]

  return (
    <div className="picker">
      <div className="picker-search">
        <input
          className="input"
          type="search"
          role="combobox"
          aria-label="Search worlds"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId ?? undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={`search all ${directory.count} worlds`}
          data-autofocus
          value={query.text}
          onChange={(event) => {
            const text = event.target.value
            filter(query.text === '' && text !== '' ? { text, region: null } : { text })
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <div className="picker-filters">
        <div className="segments" role="group" aria-label="Region">
          {regions.map(({ code, label }) => (
            <button key={label} type="button" className="segment" aria-pressed={query.region === code} onClick={() => filter({ region: code })}>
              {label}
            </button>
          ))}
        </div>
        <div className="segments" role="group" aria-label="Side">
          {SIDES.map(({ race, label }) => (
            <button key={label} type="button" className="segment" aria-pressed={query.race === race} onClick={() => filter({ race })}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="picker-list" id={listId} role="listbox" aria-label="Worlds" onMouseDown={(event) => event.preventDefault()}>
        {view.recent.length > 0 && (
          <div role="group" aria-label="Recent">
            <p className="picker-group-head" aria-hidden="true"><span className="picker-group-name">Recent</span></p>
            {view.recent.map((option) => row(option, true))}
          </div>
        )}
        {view.groups.map((group) => (
          <div key={group.region.code} role="group" aria-label={group.region.name}>
            <p className="picker-group-head" aria-hidden="true">
              <span className="picker-group-name">{group.region.code}</span> {groupNote(group)}
            </p>
            {group.options.map((option) => row(option, false))}
          </div>
        ))}
      </div>
      {view.options.length === 0 && (
        <p className="picker-empty" role="status">
          {query.region === null && query.race === null
            ? `No world matches "${query.text.trim()}".`
            : 'No world matches with these filters. Try all regions and both sides.'}
        </p>
      )}
      <p className="picker-foot">
        Each world is one side with its own market. NCSoft pairs it with an enemy world for the Abyss and changes the pair from time to
        time.
      </p>
    </div>
  )
}
