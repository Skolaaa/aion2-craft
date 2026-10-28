import type { WorldChip } from '../state/chips.ts'
import { SETTINGS, settingKey, type Setting } from '../state/openSetting.ts'
import { VIEWS, type View } from '../state/target.ts'
import { useClipboard } from '../state/useClipboard.ts'
import type { Freshness } from '../state/useFreshness.ts'
import { Button } from './Button.tsx'
import { Glyph } from './Glyph.tsx'
import { FreshnessPill } from './PriceStatus.tsx'

interface Context {
  world: WorldChip
  freshness: Freshness
  opened: Setting | null
  open(setting: Setting, anchor: HTMLElement): void
  link: string
}

interface Props {
  view: View
  onView?(view: View): void
  /** Clears the open item and shows the calculator home. The wordmark is plain text without it. */
  onHome?(): void
  context?: Context
  /** Lines on the list. The list view is offered once it has one, or while it is open. */
  listCount?: number
}

/** Without `onView` the views show but cannot be switched, as while a link waits for the world list. */
export function TopBar({ view, onView, onHome, context, listCount = 0 }: Props) {
  const views = VIEWS.filter((id) => id !== 'list' || listCount > 0 || view === 'list')
  return (
    <header className="top-bar">
      <div className="top-bar-inner">
        {onHome ? (
          <button type="button" className="brand" title="Calculator home" onClick={onHome}>Aion Forge</button>
        ) : (
          <p className="brand">Aion Forge</p>
        )}
        <nav className="nav" aria-label="Views">
          {views.map((id) => (
            <button
              key={id}
              type="button"
              className="nav-item"
              data-view={id}
              aria-current={view === id ? 'page' : undefined}
              aria-label={id === 'list' && listCount > 0 ? `list, ${listCount} ${listCount === 1 ? 'item' : 'items'}` : undefined}
              disabled={onView === undefined}
              onClick={() => onView?.(id)}
            >
              {id}
              {id === 'list' && listCount > 0 && <span className="tab-count" aria-hidden="true">{listCount}</span>}
            </button>
          ))}
        </nav>
        {context && <ContextRow {...context} />}
      </div>
    </header>
  )
}

function ContextRow({ world, freshness, opened, open, link }: Context) {
  return (
    <div className="context">
      <button
        type="button"
        className="chip world-chip"
        data-chip={settingKey(SETTINGS.world)}
        title={world.title}
        aria-label={`world ${world.value}, ${world.side}, ${world.region}`}
        aria-haspopup="dialog"
        aria-expanded={opened?.kind === 'world'}
        onClick={(event) => open(SETTINGS.world, event.currentTarget)}
      >
        <span className="chip-value">{world.value}</span>
        <span className="side-badge">{world.badge}</span>
        <span className="chip-key">{world.region}</span>
      </button>
      <FreshnessPill freshness={freshness} />
      <CopyLinkButton link={link} />
      <Button
        className="button-small settings-button"
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={opened?.kind === 'settings'}
        onClick={(event) => open(SETTINGS.settings, event.currentTarget)}
      >
        <Glyph name="gear" />
        <span>Settings</span>
      </Button>
    </div>
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
