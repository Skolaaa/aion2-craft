import type { Mastery } from '../domain/types.ts'
import { SIDE, type World } from '../market/worlds.ts'
import { PROFESSIONS } from '../state/setup.ts'
import type { View } from '../state/target.ts'
import { Button } from './Button.tsx'

const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'calculator', label: 'Calculator' },
  { id: 'scanner', label: 'Scanner' },
]

interface Props {
  view: View
  onView(view: View): void
  world: World | null
  mastery: Mastery
  onSettings?(): void
}

export function TopBar({ view, onView, world, mastery, onSettings }: Props) {
  const summary = PROFESSIONS.map(({ id }) => mastery[id]).join(' / ')
  const spoken = PROFESSIONS.map(({ id, label }) => `${label} ${mastery[id]}`).join(', ')
  return (
    <header className="top-bar">
      <div className="top-bar-inner">
        <p className="brand">Craft or buy</p>
        <nav className="nav" aria-label="Views">
          {VIEWS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="nav-item"
              aria-current={view === id ? 'page' : undefined}
              onClick={() => onView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {world && (
          <div className="status">
            <span className="status-world">{world.name}, {SIDE[world.race].name}</span>
            <span className="meta" title={`Mastery: ${spoken}`}>
              <span aria-hidden="true">Mastery {summary}</span>
              <span className="sr-only">Mastery: {spoken}</span>
            </span>
          </div>
        )}
        {onSettings && <Button className="settings-button" onClick={onSettings}>Settings</Button>}
      </div>
    </header>
  )
}
