import { useLayoutEffect, useMemo, useState } from 'react'
import { Calculator } from './components/Calculator.tsx'
import { Header } from './components/Header.tsx'
import { Icon } from './components/Icon.tsx'
import { Notice } from './components/Notice.tsx'
import { Scanner } from './components/Scanner.tsx'
import { SetupPanel } from './components/SetupPanel.tsx'
import { ago, isStale } from './components/format.ts'
import { catalogFor } from './data/catalog.ts'
import { makePriceBook } from './domain/priceBook.ts'
import type { ItemId, MarketQuote, PlanOptions } from './domain/types.ts'
import type { World } from './market/exchangeClient.ts'
import { craftIndexFor, remapItem } from './state/craftables.ts'
import type { Planning } from './state/planning.ts'
import { scanCraftables, type ScanRow } from './state/scan.ts'
import { DEFAULT_SETUP, FACTION, parseSetup, type Setup } from './state/setup.ts'
import { DEFAULT_TARGET, DEFAULT_VIEW, parseTarget, parseView, type Target, type View } from './state/target.ts'
import { useNow } from './state/useNow.ts'
import { useOverrides } from './state/useOverrides.ts'
import { usePersistentState } from './state/usePersistentState.ts'
import { usePrices } from './state/usePrices.ts'
import { useWorlds, type WorldsState } from './state/useWorlds.ts'

const NO_QUOTES: ReadonlyMap<ItemId, MarketQuote> = new Map()
const NO_ROWS: readonly ScanRow[] = []

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

  if (world === null) {
    return (
      <div className="app">
        <Header view={view} world={null} onView={(next) => updateView(() => next)} />
        <main className="main solo" id="main">
          {worlds.status === 'failed' ? (
            <Notice
              tone="error"
              live
              title="Can't reach aion2.exchange"
              actions={<button type="button" className="btn" onClick={retry}><Icon name="refresh" size={14} />Try again</button>}
            >
              <p>The app reads the world list through the local dev server. Start it with <code>npm run dev</code> and keep it running. {worlds.message}</p>
            </Notice>
          ) : (
            <div className="skeleton" role="status">
              <span className="skeleton-bar" />
              <p>Loading the world list from aion2.exchange.</p>
            </div>
          )}
        </main>
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
      updateView={updateView}
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
  updateView(change: (previous: View) => View): void
  target: Target
  updateTarget(change: (previous: Target) => Target): void
}

function Workspace({ world, worlds, retryWorlds, setup, updateSetup, view, updateView, target, updateTarget }: WorkspaceProps) {
  const catalog = catalogFor(world.race)
  const index = craftIndexFor(catalog)
  const feed = usePrices(world, catalog)
  const overrides = useOverrides(world.id)
  const now = useNow()
  const [setupOpen, setSetupOpen] = useState(false)

  useLayoutEffect(() => {
    document.documentElement.dataset.race = world.race
  }, [world.race])

  const options = useMemo<PlanOptions>(
    () => ({ allowCraft: setup.allowCraft, allowMorph: setup.allowMorph, byproductCredit: setup.byproductCredit, taxRate: setup.taxRate }),
    [setup.allowCraft, setup.allowMorph, setup.byproductCredit, setup.taxRate],
  )
  const prices = useMemo(
    () => makePriceBook({ manual: overrides.prices, market: feed.snapshot?.quotes ?? NO_QUOTES, npc: catalog.npcPrices }),
    [overrides.prices, feed.snapshot, catalog],
  )
  const planning = useMemo<Planning>(
    () => ({ world, catalog, index, mastery: setup.mastery, options, prices }),
    [world, catalog, index, setup.mastery, options, prices],
  )
  const scan = useMemo(
    () => (view === 'scanner' || target.itemId === null ? scanCraftables(planning) : NO_ROWS),
    [view, target.itemId, planning],
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

  const openItem = (itemId: ItemId) => {
    patchTarget({ itemId })
    updateView(() => 'calculator')
    window.scrollTo({ top: 0 })
  }

  const worldList = worlds.status === 'ready' ? worlds.data.worlds : []
  const captured = feed.snapshot?.capturedAt ?? null
  const stale = feed.status !== 'failed' && isStale(captured, now)

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to the content</a>
      <Header view={view} world={world} onView={(next) => updateView(() => next)} />
      <div className="shell">
        <aside className={`rail ${setupOpen ? 'is-open' : ''}`} aria-label="Your setup">
          <button
            type="button"
            className="rail-toggle"
            aria-expanded={setupOpen}
            aria-controls="rail-body"
            onClick={() => setSetupOpen((open) => !open)}
          >
            <span><strong>{world.name}</strong>, {FACTION[world.race]}</span>
            <span className="rail-toggle-label">Your setup <Icon name="chevron" size={14} /></span>
          </button>
          <div className="rail-body" id="rail-body">
            <SetupPanel
              worlds={worldList}
              worldsLoading={worlds.status === 'loading'}
              world={world}
              setup={setup}
              catalog={catalog}
              overrides={overrides}
              patch={patchSetup}
              onWorld={chooseWorld}
            />
          </div>
        </aside>

        <main className="main" id="main">
          {worlds.status === 'failed' && (
            <Notice
              tone="warn"
              live
              title="The world list did not load"
              actions={<button type="button" className="btn" onClick={retryWorlds}><Icon name="refresh" size={14} />Try again</button>}
            >
              <p>You are working with {world.name}, the world you used last. {worlds.message}</p>
            </Notice>
          )}
          {feed.status === 'failed' && (
            <Notice
              tone="error"
              live
              title="Can't reach aion2.exchange"
              actions={<button type="button" className="btn" onClick={() => void feed.refresh()}><Icon name="refresh" size={14} />Try again</button>}
            >
              <p>
                The app reads prices through the local dev server, so <code>npm run dev</code> has to be running.{' '}
                {feed.snapshot
                  ? `Showing the prices captured ${ago(captured, now)}. Prices you entered still apply.`
                  : 'There is no saved copy for this world yet. Prices you enter still apply.'}
              </p>
              {feed.message && <p className="field-hint">{feed.message}</p>}
            </Notice>
          )}
          {stale && (
            <Notice
              tone="warn"
              live
              title={`These prices are ${ago(captured, now).replace(' ago', '')} old`}
              actions={<button type="button" className="btn" onClick={() => void feed.refresh()}><Icon name="refresh" size={14} />Refresh prices</button>}
            >
              <p>The exchange takes a snapshot of each world every hour, so this world may have stopped updating. Refresh to check.</p>
            </Notice>
          )}

          {view === 'calculator' ? (
            <Calculator planning={planning} feed={feed} target={target} scan={scan} overrides={overrides} now={now} onTarget={patchTarget} />
          ) : (
            <Scanner rows={scan} feed={feed} now={now} worldName={world.name} onOpen={openItem} />
          )}
        </main>
      </div>
    </div>
  )
}
