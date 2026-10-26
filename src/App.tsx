import { useEffect, useState } from 'react'
import { catalogFor } from './data/catalog.ts'
import { tradeableItems } from './domain/catalog.ts'
import { planCraft } from './domain/planCraft.ts'
import { makePriceBook } from './domain/priceBook.ts'
import type { Catalog, Mastery, PlanResult, StepPlan } from './domain/types.ts'
import { fetchExchangeCraft, fetchWorlds, refreshSnapshot, type ExchangeCraft, type QuoteSnapshot, type World } from './market/exchangeClient.ts'

const TARGET = 110130013
const MASTERY: Mastery = { Blacksmithing: 100, Tailoring: 100, Jewelcrafting: 100, Alchemy: 100, Cooking: 100 }
const OPTIONS = { allowCraft: true, allowMorph: true, byproductCredit: false, taxRate: 0.05 }

interface Smoke {
  world: World
  catalog: Catalog
  snapshot: QuoteSnapshot
  plan: PlanResult | null
  theirs: ExchangeCraft | null
}

type State = { kind: 'loading' } | { kind: 'failed'; message: string } | { kind: 'ready'; smoke: Smoke }

async function load(): Promise<Smoke> {
  const { defaultId, worlds } = await fetchWorlds()
  const wanted = Number(new URLSearchParams(window.location.search).get('world')) || defaultId
  const world = worlds.find((w) => w.id === wanted)
  if (!world) throw new Error(`world ${wanted} is not in aion2.exchange's list`)
  const catalog = catalogFor(world.race)
  const snapshot = await refreshSnapshot(world.id, tradeableItems(catalog))
  const prices = makePriceBook({ manual: new Map(), market: snapshot.quotes, npc: catalog.npcPrices })
  const plan = planCraft({ target: { itemId: TARGET, quantity: 1 }, mastery: MASTERY, options: OPTIONS, world: catalog, prices })
  const theirs = await fetchExchangeCraft(TARGET, world.id).catch(() => null)
  return { world, catalog, snapshot, plan, theirs }
}

const kina = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : Math.round(value).toLocaleString('en-US')

function Step({ step, catalog }: { step: StepPlan; catalog: Catalog }) {
  const name = (id: number) => catalog.items.get(id)?.name ?? String(id)
  return (
    <li>
      {name(step.itemId)} (recipe {step.recipeId}): {step.attempts.toFixed(4)} attempts, success {step.successRate},
      combo {step.comboRate.toFixed(4)}, cost {kina(step.cost)}
      <ul>
        {step.materials.map((m) => (
          <li key={m.itemId}>
            {name(m.itemId)}: {m.expected.toFixed(2)} by {m.acquisition.method}
            {m.acquisition.method === 'none' ? '' : ` at ${kina(m.acquisition.unit)}`}, {kina(m.subtotal)}
            {(m.acquisition.method === 'craft' || m.acquisition.method === 'morph') && (
              <ul><Step step={m.acquisition.step} catalog={catalog} /></ul>
            )}
          </li>
        ))}
      </ul>
    </li>
  )
}

export function App() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  useEffect(() => {
    load().then(
      (smoke) => setState({ kind: 'ready', smoke }),
      (error: unknown) => setState({ kind: 'failed', message: String(error) }),
    )
  }, [])

  if (state.kind === 'loading') return <p>Loading worlds and prices...</p>
  if (state.kind === 'failed') return <p>Failed: {state.message}</p>
  const { world, catalog, snapshot, plan, theirs } = state.smoke
  const gap = plan && theirs ? (plan.cost - theirs.cost) / theirs.cost : null
  return (
    <main>
      <h1>{catalog.items.get(TARGET)?.name}</h1>
      <p>
        World {world.name} ({world.regionName}, id {world.id}, {world.race}). Mastery 100. Prices captured{' '}
        {snapshot.capturedAt ?? 'never'}, fetched {snapshot.fetchedAt}, {snapshot.quotes.size} items.
      </p>
      {plan === null ? (
        <p>No {world.race} recipe makes this item.</p>
      ) : (
        <>
          <p>Expected cost: {kina(plan.cost)}</p>
          <p>All-buy cost: {kina(plan.costAllBuy)}</p>
          <p>Market lowest: {kina(plan.market?.lowest)} ({plan.market?.listings ?? 0} listings)</p>
          <p>Margin after {OPTIONS.taxRate * 100}% tax: {kina(plan.margin)} ({plan.marginPct === null ? 'n/a' : `${(plan.marginPct * 100).toFixed(1)}%`})</p>
          <p>
            aion2.exchange cost: {kina(theirs?.cost)} captured {theirs?.capturedAt ?? 'n/a'}
            {gap === null ? '' : `, ours is ${(gap * 100).toFixed(2)}% off`}
          </p>
          <p>Missing prices: {plan.missing.length}. Blocked recipes: {plan.blocked.length}.</p>
          <ul><Step step={plan.root} catalog={catalog} /></ul>
        </>
      )}
      <p>
        Prices from <a href="https://aion2.exchange">aion2.exchange</a>, recipes from aion2t.com, rates from
        metabot.gg.
      </p>
    </main>
  )
}
