import type { ReactNode } from 'react'
import type { StatusChips } from '../state/chips.ts'
import { SETTINGS, settingKey, type Setting } from '../state/openSetting.ts'
import type { View } from '../state/target.ts'
import { useClipboard } from '../state/useClipboard.ts'
import type { Freshness } from '../state/useFreshness.ts'
import { Button } from './Button.tsx'
import { Glyph } from './Glyph.tsx'
import { FreshnessPill } from './PriceStatus.tsx'

const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'calculator', label: 'calculator' },
  { id: 'scanner', label: 'scanner' },
]

interface Context {
  chips: StatusChips
  freshness: Freshness
  opened: Setting | null
  open(setting: Setting, anchor: HTMLElement): void
  link: string
}

/** Without `onView` the views show but cannot be switched, as while a link waits for the world list. */
export function TopBar({ view, onView, context }: { view: View; onView?(view: View): void; context?: Context }) {
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
              disabled={onView === undefined}
              onClick={() => onView?.(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {context && <ContextChips {...context} />}
        {context && <FreshnessPill freshness={context.freshness} />}
        {context && <CopyLinkButton link={context.link} />}
      </div>
    </header>
  )
}

function CopyLinkButton({ link }: { link: string }) {
  const { state, copy } = useClipboard()
  const label = state === 'copied' ? 'Link copied' : state === 'failed' ? 'Copy the link from the address bar' : 'Copy link'
  return (
    <>
      <Button className="button-small copy-link" title={label} aria-label={label} onClick={() => void copy(link)}>
        <Glyph name={state === 'copied' ? 'check' : 'link'} />
      </Button>
      <span className="sr-only" role="status">{state === 'idle' ? '' : label}</span>
    </>
  )
}

interface ChipProps extends Pick<Context, 'opened' | 'open'> {
  setting: Setting
  label: string
  spoken: string
  title: string
  className?: string
  children: ReactNode
}

function Chip({ setting, label, spoken, title, className = '', opened, open, children }: ChipProps) {
  return (
    <button
      type="button"
      className={`chip ${className}`}
      title={title}
      aria-label={`${label} ${spoken}`}
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
      <Chip {...state} setting={SETTINGS.region} label="region" spoken={chips.region.value} title={chips.region.title}>
        <span className="chip-value">{chips.region.value}</span>
      </Chip>
      <Chip {...state} setting={SETTINGS.world} label="world" spoken={`${chips.world.value}, ${chips.world.side}`} title={chips.world.title}>
        <span className="chip-value">{chips.world.value}</span>
        <span className="side-badge">{chips.world.badge}</span>
      </Chip>
      <Chip {...state} setting={SETTINGS.tax} label="tax" spoken={chips.tax.value} title={chips.tax.title}>
        <span className="chip-value">{chips.tax.value}</span>
      </Chip>
      <Chip {...state} setting={SETTINGS.mastery} label="mastery" spoken={chips.mastery.spoken} title={chips.mastery.title} className="mastery-chip">
        <span className="mastery-pairs">
          {chips.mastery.pairs.map(({ abbr, value, title }) => (
            <span className="mastery-pair" key={abbr} title={title}>
              <span className="chip-key">{abbr}</span>
              <span className="chip-value">{value}</span>
            </span>
          ))}
        </span>
        <span className="chip-value mastery-collapsed">{chips.mastery.collapsed}</span>
      </Chip>
      <Chip {...state} setting={SETTINGS.plan} label="plan" spoken={chips.plan.value} title={chips.plan.title}>
        <span className="chip-value">{chips.plan.value}</span>
      </Chip>
    </div>
  )
}
