import type { ReactNode } from 'react'
import type { StatusChips } from '../state/chips.ts'
import { settingKey, type Setting } from '../state/openSetting.ts'
import type { View } from '../state/target.ts'
import type { PriceFeed } from '../state/usePrices.ts'
import { FreshnessPill } from './PriceStatus.tsx'

const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'calculator', label: 'calculator' },
  { id: 'scanner', label: 'scanner' },
]

const REGION: Setting = { kind: 'world', from: 'region' }
const WORLD: Setting = { kind: 'world', from: 'world' }
const TAX: Setting = { kind: 'tax' }
const MASTERY: Setting = { kind: 'mastery' }
const PLAN: Setting = { kind: 'plan' }

interface Context {
  chips: StatusChips
  feed: PriceFeed
  opened: Setting | null
  open(setting: Setting, anchor: HTMLElement): void
}

export function TopBar({ view, onView, context }: { view: View; onView(view: View): void; context?: Context }) {
  return (
    <header className="top-bar">
      <div className="top-bar-inner">
        <p className="brand">Craft or buy</p>
        <nav className="nav" aria-label="Views">
          {VIEWS.map(({ id, label }) => (
            <button key={id} type="button" className="nav-item" aria-current={view === id ? 'page' : undefined} onClick={() => onView(id)}>
              {label}
            </button>
          ))}
        </nav>
        {context && <ContextChips {...context} />}
        {context && <FreshnessPill feed={context.feed} />}
      </div>
    </header>
  )
}

interface ChipProps extends Pick<Context, 'opened' | 'open'> {
  setting: Setting
  label: string
  title: string
  className?: string
  children: ReactNode
}

function Chip({ setting, label, title, className = '', opened, open, children }: ChipProps) {
  return (
    <button
      type="button"
      className={`chip ${className}`}
      title={title}
      aria-haspopup="dialog"
      aria-expanded={opened !== null && settingKey(opened) === settingKey(setting)}
      onClick={(event) => open(setting, event.currentTarget)}
    >
      <span className="chip-key">{label}</span>
      {children}
    </button>
  )
}

function ContextChips({ chips, opened, open }: Context) {
  const state = { opened, open }
  return (
    <div className="context" role="group" aria-label="Plan context">
      <Chip {...state} setting={REGION} label="region" title={chips.region.title}>
        <span className="chip-value">{chips.region.value}</span>
      </Chip>
      <Chip {...state} setting={WORLD} label="world" title={chips.world.title}>
        <span className="chip-value">{chips.world.value}</span>
        <span className="side-badge" aria-hidden="true">{chips.world.badge}</span>
        <span className="sr-only">{chips.world.side}</span>
      </Chip>
      <Chip {...state} setting={TAX} label="tax" title={chips.tax.title}>
        <span className="chip-value">{chips.tax.value}</span>
      </Chip>
      <Chip {...state} setting={MASTERY} label="mastery" title={chips.mastery.title} className="mastery-chip">
        <span className="mastery-pairs" aria-hidden="true">
          {chips.mastery.pairs.map(({ abbr, value, title }) => (
            <span className="mastery-pair" key={abbr} title={title}>
              <span className="chip-key">{abbr}</span>
              <span className="chip-value">{value}</span>
            </span>
          ))}
        </span>
        <span className="chip-value mastery-collapsed" aria-hidden="true">{chips.mastery.collapsed}</span>
        <span className="sr-only">{chips.mastery.spoken}</span>
      </Chip>
      <Chip {...state} setting={PLAN} label="plan" title={chips.plan.title}>
        <span className="chip-value">{chips.plan.value}</span>
      </Chip>
    </div>
  )
}
