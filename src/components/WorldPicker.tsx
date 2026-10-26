import { useMemo } from 'react'
import type { World } from '../market/exchangeClient.ts'
import { FACTION } from '../state/setup.ts'
import { Icon } from './Icon.tsx'

interface Props {
  id: string
  worlds: readonly World[]
  value: World
  onPick(world: World): void
}

export function WorldPicker({ id, worlds, value, onPick }: Props) {
  const groups = useMemo(() => {
    const all = worlds.some((w) => w.id === value.id) ? worlds : [value, ...worlds]
    const byRegion = new Map<string, { label: string; worlds: World[] }>()
    for (const world of all) {
      const group = byRegion.get(world.region) ?? { label: world.regionName, worlds: [] }
      group.worlds.push(world)
      byRegion.set(world.region, group)
    }
    for (const group of byRegion.values()) group.worlds.sort((a, b) => a.name.localeCompare(b.name) || a.race.localeCompare(b.race))
    return [...byRegion.entries()]
  }, [worlds, value])

  return (
    <span className="select-wrap">
      <select
        id={id}
        className="input"
        value={value.id}
        disabled={worlds.length === 0}
        onChange={(event) => {
          const next = worlds.find((w) => w.id === Number(event.target.value))
          if (next) onPick(next)
        }}
      >
        {groups.map(([region, group]) => (
          <optgroup key={region} label={group.label}>
            {group.worlds.map((world) => (
              <option key={world.id} value={world.id} disabled={!world.hasData}>
                {world.name}, {FACTION[world.race]}{world.hasData ? '' : ' (no price data)'}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <Icon name="chevron" size={14} />
    </span>
  )
}
