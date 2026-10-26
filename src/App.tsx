import { Button } from './components/Button.tsx'
import { Footer } from './components/Footer.tsx'
import { Glyph } from './components/Glyph.tsx'
import { Notice } from './components/Notice.tsx'
import { TopBar } from './components/TopBar.tsx'
import type { World } from './market/exchangeClient.ts'
import { DEFAULT_SETUP, parseSetup } from './state/setup.ts'
import { DEFAULT_VIEW, parseView, type View } from './state/target.ts'
import { usePersistentState } from './state/usePersistentState.ts'
import { useWorlds, type WorldsState } from './state/useWorlds.ts'

function pickWorld(worlds: WorldsState, saved: World | null): World | null {
  if (worlds.status !== 'ready') return saved
  const { defaultId, worlds: list } = worlds.data
  return list.find((w) => w.id === saved?.id) ?? list.find((w) => w.id === defaultId) ?? list[0] ?? null
}

export function App() {
  const { state: worlds, retry } = useWorlds()
  const [setup] = usePersistentState('setup', DEFAULT_SETUP, parseSetup)
  const [view, updateView] = usePersistentState<View>('view', DEFAULT_VIEW, parseView)
  const world = pickWorld(worlds, setup.world)

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <TopBar view={view} onView={(next) => updateView(() => next)} world={world} mastery={setup.mastery} />
      <main className="page" id="main">
        {worlds.status === 'failed' ? (
          <Notice
            title="The world list did not load"
            action={<Button onClick={retry}><Glyph name="refresh" />Try again</Button>}
          >
            The app reads it from aion2.exchange through the local dev server, so <code>npm run dev</code> has to be running.
          </Notice>
        ) : (
          <p className="meta" role="status">{world ? `${world.name} is ready.` : 'Loading the world list from aion2.exchange.'}</p>
        )}
      </main>
      <Footer />
    </div>
  )
}
