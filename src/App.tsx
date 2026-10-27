import { useMemo, useState, type ReactNode } from 'react'
import { Calculator } from './components/Calculator.tsx'
import { Footer } from './components/Footer.tsx'
import { LinkNotice, Notice, WorldsFailed } from './components/Notice.tsx'
import { Scanner } from './components/Scanner.tsx'
import { SettingHost } from './components/SettingHost.tsx'
import { TopBar } from './components/TopBar.tsx'
import { catalogFor } from './data/catalog.ts'
import { makePriceBook } from './domain/priceBook.ts'
import type { ItemId, MarketQuote, PlanOptions } from './domain/types.ts'
import { resolveWorld, type Listed, type World } from './market/worlds.ts'
import { statusChips } from './state/chips.ts'
import { craftIndexFor, itemFor } from './state/craftables.ts'
import { age } from './state/format.ts'
import { useOpenSetting } from './state/openSetting.ts'
import type { Planning } from './state/planning.ts'
import { DEFAULT_SETUP, parseSetup, settingsOf, SETUP_KEY, setWorld, type Setup, type SetupPatch } from './state/setup.ts'
import { encodeLink, type LinkNote, type Opened } from './state/shareLink.ts'
import { DEFAULT_TARGET, DEFAULT_VIEW, parseTarget, parseView, type Target, type View } from './state/target.ts'
import { useNow } from './state/useNow.ts'
import { useFreshness } from './state/useFreshness.ts'
import { useOverrides } from './state/useOverrides.ts'
import { useOwned } from './state/useOwned.ts'
import { usePersistentState } from './state/usePersistentState.ts'
import { usePrices, type PriceFeed } from './state/usePrices.ts'
import { useAddressBar, useLinkOpening } from './state/useShareLink.ts'
import { readyDirectory, useWorlds, type WorldsState } from './state/useWorlds.ts'

const NO_QUOTES: ReadonlyMap<ItemId, MarketQuote> = new Map()

export function App() {
  const { state: worlds, retry } = useWorlds()
  const opened = useLinkOpening(worlds)
  if (opened === 'waiting') {
    return (
      <WorldsGate worlds={worlds} retry={retry} bar={<TopBar view="calculator" />}>
        The plan in this link needs the world list to open. <a href={window.location.pathname}>Open your own plan instead</a>.
      </WorldsGate>
    )
  }
  return <Session opened={opened} worlds={worlds} retry={retry} />
}

function Session({ opened, worlds, retry }: { opened: Opened; worlds: WorldsState; retry(): void }) {
  const { seed } = opened
  const [setup, updateSetup] = usePersistentState(SETUP_KEY, DEFAULT_SETUP, parseSetup, seed?.setup)
  const [view, updateView] = usePersistentState<View>('view', DEFAULT_VIEW, parseView, seed?.view)
  const [target, updateTarget] = usePersistentState('target', DEFAULT_TARGET, parseTarget, seed?.target)
  const current = resolveWorld(readyDirectory(worlds), setup.world)
  const onView = (next: View) => updateView(() => next)

  if (current === null) {
    return (
      <WorldsGate worlds={worlds} retry={retry} bar={<TopBar view={view} onView={onView} />}>
        The app reads the world list through the local dev server, so it has to be running.
      </WorldsGate>
    )
  }

  return (
    <Workspace
      current={current}
      worlds={worlds}
      retryWorlds={retry}
      notes={opened.notes}
      setup={setup}
      updateSetup={updateSetup}
      view={view}
      onView={onView}
      target={target}
      updateTarget={updateTarget}
    />
  )
}

function WorldsGate({ worlds, retry, bar, children }: { worlds: WorldsState; retry(): void; bar: ReactNode; children: ReactNode }) {
  return (
    <Shell bar={bar}>
      {worlds.status === 'failed' ? (
        <WorldsFailed message={worlds.message} onRetry={retry}>{children}</WorldsFailed>
      ) : (
        <p className="meta" role="status">Loading the world list from aion2.exchange.</p>
      )}
    </Shell>
  )
}

function Shell({ side, bar, children }: { side?: string; bar: ReactNode; children: ReactNode }) {
  return (
    <div className="app" data-side={side}>
      <a className="skip-link" href="#main">Skip to content</a>
      {bar}
      <main className="page" id="main">{children}</main>
      <Footer />
    </div>
  )
}

function FeedNotice({ feed, worldName }: { feed: PriceFeed; worldName: string }) {
  const now = useNow()
  const captured = feed.snapshot?.capturedAt
  return (
    <Notice title="Can't reach aion2.exchange" detail={feed.message} onRetry={() => void feed.refresh()}>
      {captured
        ? `The plan uses the copy saved on this computer, captured ${age(captured, now)} ago.`
        : `There is no saved copy for ${worldName} yet, so only NPC prices and yours count.`}{' '}
      The app reads prices through the local dev server, so it has to be running.
    </Notice>
  )
}

interface WorkspaceProps {
  current: Listed
  worlds: WorldsState
  retryWorlds(): void
  notes: readonly LinkNote[]
  setup: Setup
  updateSetup(change: (previous: Setup) => Setup): void
  view: View
  onView(view: View): void
  target: Target
  updateTarget(change: (previous: Target) => Target): void
}

function Workspace({ current, worlds, retryWorlds, notes, setup, updateSetup, view, onView, target, updateTarget }: WorkspaceProps) {
  const { world } = current
  const [linkNotes, setLinkNotes] = useState(notes)
  const link = useAddressBar(encodeLink({ worldId: world.id, view, target, settings: settingsOf(setup) }))
  const catalog = catalogFor(world.race)
  const index = craftIndexFor(catalog)
  const feed = usePrices(world, catalog)
  const freshness = useFreshness(feed)
  const overrides = useOverrides(world.id)
  const owned = useOwned(world.id)
  const surface = useOpenSetting()

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
    () => ({ world, catalog, index, mastery: setup.mastery, options, prices, market }),
    [world, catalog, index, setup.mastery, options, prices, market],
  )

  const patchSetup = (change: SetupPatch) => updateSetup((previous) => ({ ...previous, ...change }))
  const patchTarget = (change: Partial<Target>) => updateTarget((previous) => ({ ...previous, ...change }))

  const chooseWorld = (next: World) => {
    updateTarget((previous) => ({ ...previous, itemId: previous.itemId === null ? null : itemFor(next.race, previous.itemId) }))
    updateSetup((previous) => setWorld(previous, next))
  }

  const openItem = (itemId: ItemId) => {
    updateTarget((previous) => ({ ...previous, itemId }))
    onView('calculator')
    window.scrollTo({ top: 0 })
  }

  const bar = (
    <>
      <TopBar
        view={view}
        onView={onView}
        context={{ chips: statusChips(setup, current), freshness, opened: surface.opened?.setting ?? null, open: surface.open, link }}
      />
      <SettingHost
        surface={surface}
        worlds={worlds}
        retryWorlds={retryWorlds}
        current={current}
        setup={setup}
        patch={patchSetup}
        chooseWorld={chooseWorld}
        planning={planning}
        overrides={overrides}
        owned={owned}
      />
    </>
  )

  return (
    <Shell side={world.race} bar={bar}>
      {linkNotes.map((note) => (
        <LinkNotice key={note.kind} note={note} onDismiss={() => setLinkNotes((previous) => previous.filter((other) => other !== note))} />
      ))}
      {worlds.status === 'failed' && (
        <WorldsFailed message={worlds.message} onRetry={retryWorlds}>
          You can keep working on {world.name}, the world you used last. The world chip lists the others once the list loads.
        </WorldsFailed>
      )}
      {feed.status === 'failed' && <FeedNotice feed={feed} worldName={world.name} />}
      {view === 'calculator' && (
        <Calculator planning={planning} freshness={freshness} target={target} overrides={overrides} owned={owned} link={link} onTarget={patchTarget} />
      )}
      {view === 'scanner' && <Scanner planning={planning} freshness={freshness} onOpen={openItem} />}
    </Shell>
  )
}
