import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Calculator } from './components/Calculator.tsx'
import { Footer } from './components/Footer.tsx'
import { ListView } from './components/ListView.tsx'
import { LinkNotice, Notice, WorldsFailed } from './components/Notice.tsx'
import { Scanner } from './components/Scanner.tsx'
import { SettingHost } from './components/SettingHost.tsx'
import { TopBar } from './components/TopBar.tsx'
import { catalogFor } from './data/catalog.ts'
import { makePriceBook } from './domain/priceBook.ts'
import type { ItemId, MarketQuote, PlanOptions } from './domain/types.ts'
import { resolveWorld, type Listed, type World } from './market/worlds.ts'
import { worldChip } from './state/chips.ts'
import { craftIndexFor, itemFor } from './state/craftables.ts'
import { age } from './state/format.ts'
import { useList, type List } from './state/list.ts'
import { SETTINGS, settingKey, useOpenSetting } from './state/openSetting.ts'
import type { Planning } from './state/planning.ts'
import { DEFAULT_SETUP, parseSetup, settingsOf, SETUP_KEY, setWorld, type Setup, type SetupPatch } from './state/setup.ts'
import { encodeLink, type LinkNote, type Opened } from './state/shareLink.ts'
import { DEFAULT_TARGET, DEFAULT_VIEW, parseTarget, parseView, type Target, type View } from './state/target.ts'
import { useNow } from './state/useNow.ts'
import { useFreshness } from './state/useFreshness.ts'
import { useLadders } from './state/useLadders.ts'
import { useOverrides } from './state/useOverrides.ts'
import { useOwned } from './state/useOwned.ts'
import { hasPersisted, usePersistentState } from './state/usePersistentState.ts'
import { usePrices, type PriceFeed } from './state/usePrices.ts'
import { useAddressBar, useLinkOpening } from './state/useShareLink.ts'
import { useSources } from './state/useSources.ts'
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
  // A link's world is the sender's choice, so only a bare visit to an empty browser asks.
  const [firstVisit] = useState(() => seed === null && !hasPersisted(SETUP_KEY))
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
      seedList={seed?.list ?? null}
      firstVisit={firstVisit}
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
  seedList: List | null
  firstVisit: boolean
}

function Workspace({ current, worlds, retryWorlds, notes, setup, updateSetup, view, onView, target, updateTarget, seedList, firstVisit }: WorkspaceProps) {
  const { world } = current
  const [linkNotes, setLinkNotes] = useState(notes)
  const catalog = catalogFor(world.race)
  const index = craftIndexFor(catalog)
  const list = useList(world.id, index, seedList)
  const link = useAddressBar(encodeLink({ worldId: world.id, view, target, settings: settingsOf(setup), list: list.wanted }))
  const feed = usePrices(world, catalog)
  const freshness = useFreshness(feed)
  const ladders = useLadders(world.id)
  const overrides = useOverrides(world.id)
  const owned = useOwned(world.id)
  const sources = useSources(world.id)
  const surface = useOpenSetting()

  const offered = useRef(false)
  useEffect(() => {
    if (!firstVisit || offered.current || worlds.status !== 'ready' || surface.opened !== null) return
    const chip = document.querySelector<HTMLElement>(`[data-chip="${settingKey(SETTINGS.world)}"]`)
    if (chip === null) return
    offered.current = true
    surface.open(SETTINGS.first, chip)
  })

  const options = useMemo<PlanOptions>(
    () => ({ allowCraft: setup.allowCraft, allowMorph: setup.allowMorph, byproductCredit: setup.byproductCredit, taxRate: setup.taxRate }),
    [setup.allowCraft, setup.allowMorph, setup.byproductCredit, setup.taxRate],
  )
  const market = feed.snapshot?.quotes ?? NO_QUOTES
  const prices = useMemo(
    () => makePriceBook({ manual: overrides.prices, market, npc: catalog.npcPrices, ladders: ladders.ladders }),
    [overrides.prices, market, catalog, ladders.ladders],
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

  /** Opens an item in the calculator, at `quantity` when a list line says so, else at the open quantity. */
  const openItem = (itemId: ItemId, quantity?: number) => {
    updateTarget((previous) => ({ itemId, quantity: quantity ?? previous.quantity }))
    onView('calculator')
    window.scrollTo({ top: 0 })
  }

  const body = () => {
    switch (view) {
      case 'calculator':
        return (
          <Calculator
            planning={planning}
            freshness={freshness}
            requestLadders={ladders.request}
            target={target}
            overrides={overrides}
            owned={owned}
            sources={sources}
            surface={surface}
            link={link}
            onTarget={patchTarget}
            list={list}
            onView={onView}
          />
        )
      case 'list':
        return (
          <ListView
            planning={planning}
            freshness={freshness}
            requestLadders={ladders.request}
            list={list}
            overrides={overrides}
            owned={owned}
            sources={sources}
            link={link}
            onOpen={openItem}
            onView={onView}
          />
        )
      case 'scanner':
        return <Scanner planning={planning} freshness={freshness} onOpen={openItem} />
      default: {
        const unknown: never = view
        return unknown
      }
    }
  }

  const bar = (
    <>
      <TopBar
        view={view}
        onView={onView}
        listCount={list.wanted.size}
        context={{ world: worldChip(current), freshness, opened: surface.opened?.setting ?? null, open: surface.open, link }}
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
        sources={sources}
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
      {body()}
    </Shell>
  )
}
