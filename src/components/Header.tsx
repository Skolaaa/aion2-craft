import type { World } from '../market/exchangeClient.ts'
import { FACTION } from '../state/setup.ts'
import type { View } from '../state/target.ts'
import { Icon } from './Icon.tsx'

const TABS: readonly { view: View; label: string }[] = [
  { view: 'calculator', label: 'Calculator' },
  { view: 'scanner', label: 'Profit scanner' },
]

export function Header({ view, world, onView }: { view: View; world: World | null; onView(view: View): void }) {
  return (
    <header className="topbar">
      <p className="brand">
        <span className="brand-mark"><Icon name="mark" size={22} /></span>
        <span className="brand-name">Crafting Ledger</span>
        <span className="brand-game">Aion 2</span>
      </p>
      <nav className="tabs" aria-label="Views">
        {TABS.map((tab) => (
          <button
            key={tab.view}
            type="button"
            className="tab"
            aria-current={view === tab.view ? 'page' : undefined}
            onClick={() => onView(tab.view)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {world && (
        <p className="topbar-world">
          <span className="topbar-world-name">{world.name}</span>
          <span className="topbar-world-faction">{FACTION[world.race]}</span>
        </p>
      )}
    </header>
  )
}
