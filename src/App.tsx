import { useMemo, useState } from 'react'
import { Button } from './components/Button.tsx'
import { Calculator } from './components/Calculator.tsx'
import { Footer } from './components/Footer.tsx'
import { Glyph } from './components/Glyph.tsx'
import { Notice } from './components/Notice.tsx'
import { Settings } from './components/Settings.tsx'
import { TopBar } from './components/TopBar.tsx'
import { catalogFor } from './data/catalog.ts'
import { makePriceBook } from './domain/priceBook.ts'
import type { ItemId, MarketQuote, PlanOptions } from './domain/types.ts'
import type { World } from './market/exchangeClient.ts'
import { craftIndexFor, remapItem } from './state/craftables.ts'
import type { Planning } from './state/planning.ts'
import { DEFAULT_SETUP, parseSetup, type Setup } from './state/setup.ts'
import { DEFAULT_TARGET, DEFAULT_VIEW, parseTarget, parseView, type Target, type View } from './state/target.ts'
import { useNow } from './state/useNow.ts'
import { useOverrides } from './state/useOverrides.ts'
import { usePersistentState } from './state/usePersistentState.ts'
import { usePrices } from './state/usePrices.ts'
import { useWorlds, type WorldsState } from './state/useWorlds.ts'

const NO_QUOTES: ReadonlyMap<ItemId, MarketQuote> = new Map()

function pickWorld(worlds: WorldsState, saved: World | null): World | null {
  if (worlds.status !== 'ready') return saved
  const { defaultId, worlds: list } = worlds.data
  return list.find((w) => w.id === saved?.id) ?? list.find((w) => w.id === defaultId) ?? list[0] ?? null
}

export function App() {
  const { state: worlds, retry } = useWorlds()
  const [setup, updateSetup] = usePersistentState('setup', DEFAULT_SETUP, parseSetup)
  const [view, updateView] = usePersistentState<View>('view', DEFAULT_VIEW, parseView)
  const [target, updateTarget] = usePersistentState('target', DEFAULT_TARGET, parseTarget)
  const world = pickWorld(worlds, setup.world)
  const onView = (next: View) => updateView(() => next)

  if (world === null) {
    return (
      <div className="app">
        <TopBar view={view} onView={onView} world={null} mastery={setup.mastery} />
        <main className="page" id="main">
          {worlds.status === 'failed' ? (
            <Notice title="The world list did not load" action={<Button onClick={retry}><Glyph name="refresh" />Try again</Button>}>
              The app reads it from aion2.exchange through the local dev server, so <code>npm run dev</code> has to be running.
            </Notice>
          ) : (
            <p className="meta" role="status">Loading the world list from aion2.exchange.</p>
          )}
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <Workspace
      world={world}
      worlds={worlds}
      retryWorlds={retry}
      setup={setup}
      updateSetup={updateSetup}
      view={view}
      onView={onView}
      target={target}
      updateTarget={updateTarget}
    />
  )
}

interface WorkspaceProps {
  world: World
  worlds: WorldsState
  retryWorlds(): void
  setup: Setup
  updateSetup(change: (previous: Setup) => Setup): void
  view: View
  onView(view: View): void
  target: Target
  updateTarget(change: (previous: Target) => Target): void
}

function Workspace({ world, worlds, retryWorlds, setup, updateSetup, view, onView, target, updateTarget }: WorkspaceProps) {
  const catalog = catalogFor(world.race)
  const index = craftIndexFor(catalog)
  const feed = usePrices(world, catalog)
  const overrides = useOverrides(world.id)
  const now = useNow()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const options = useMemo<PlanOptions>(
    () => ({ allowCraft: setup.allowCraft, allowMorph: setup.allowMorph, byproductCredit: setup.byproductCredit, taxRate: setup.taxRate }),
    [setup.allowCraft, setup.allowMorph, setup.byproductCredit, setup.taxRate],
  )
  const market = feed.snapshot?.quotes ?? NO_QUOTES
  const prices = useMemo(
    () => makePriceBook({ manual: overrides.prices, market, npc: catalog.npcPrices }),
    [overrides.prices, market, catalog],
  )
  const planning = useMemo<Planning>(
    () => ({ world, catalog, index, mastery: setup.mastery, options, prices }),
    [world, catalog, index, setup.mastery, options, prices],
  )

  const patchSetup = (change: Partial<Setup>) => updateSetup((previous) => ({ ...previous, ...change }))
  const patchTarget = (change: Partial<Target>) => updateTarget((previous) => ({ ...previous, ...change }))

  const chooseWorld = (next: World) => {
    if (next.race !== world.race) {
      const nextCatalog = catalogFor(next.race)
      updateTarget((previous) => ({ ...previous, itemId: previous.itemId === null ? null : remapItem(catalog, nextCatalog, previous.itemId) }))
    }
    patchSetup({ world: next })
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <TopBar view={view} onView={onView} world={world} mastery={setup.mastery} onSettings={() => setSettingsOpen(true)} />
      <main className="page" id="main">
        {worlds.status === 'failed' && (
          <Notice title="The world list did not load" action={<Button onClick={retryWorlds}><Glyph name="refresh" />Try again</Button>}>
            You can keep working on {world.name}, the world you used last. Settings lists other worlds once the list loads.
          </Notice>
        )}
        {view === 'calculator' && (
          <Calculator planning={planning} feed={feed} target={target} overrides={overrides} now={now} onTarget={patchTarget} />
        )}
      </main>
      <Footer />
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        worlds={worlds}
        world={world}
        setup={setup}
        patch={patchSetup}
        onWorld={chooseWorld}
        overrides={overrides}
        catalog={catalog}
        market={market}
      />
    </div>
  )
}
