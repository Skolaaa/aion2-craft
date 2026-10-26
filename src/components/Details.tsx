import { useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Acquisition, Catalog, ItemId, PlanResult, Recipe, StepPlan } from '../domain/types.ts'
import { buyList, estimateGap, stepSummary, type BuyLine } from '../state/answer.ts'
import { age, decimal, kina, percent, plural, signedKina } from '../state/format.ts'
import type { Planning } from '../state/planning.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import { useExchangeEstimate } from '../state/useExchangeEstimate.ts'
import { Glyph } from './Glyph.tsx'
import { ItemCell } from './ItemCell.tsx'
import { PriceCell } from './PriceCell.tsx'
import { Table, type Column } from './Table.tsx'

const TABS = [
  { id: 'buy', label: 'What to buy' },
  { id: 'made', label: 'How it is made' },
  { id: 'rates', label: 'Rates' },
] as const

export type DetailTab = (typeof TABS)[number]['id']

interface Props {
  plan: PlanResult
  planning: Planning
  overrides: PriceOverrides
  tab: DetailTab
  now: number
  onTab(tab: DetailTab): void
}

export function Details({ plan, planning, overrides, tab, now, onTab }: Props) {
  const base = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : step ? (index + step + TABS.length) % TABS.length : null
    if (target === null) return
    event.preventDefault()
    onTab(TABS[target].id)
    tabRefs.current[target]?.focus()
  }

  return (
    <section className="details" aria-label="Details">
      <div className="tabs" role="tablist" aria-label="Details">
        {TABS.map(({ id, label }, index) => (
          <button
            key={id}
            ref={(element) => {
              tabRefs.current[index] = element
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${id}`}
            className="tab"
            aria-selected={tab === id}
            aria-controls={`${base}-panel`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => onTab(id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="tab-panel" role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${tab}`}>
        {tab === 'buy' && <WhatToBuy plan={plan} planning={planning} overrides={overrides} />}
        {tab === 'made' && <HowItIsMade key={plan.target.itemId} plan={plan} planning={planning} overrides={overrides} />}
        {tab === 'rates' && <Rates plan={plan} planning={planning} now={now} />}
      </div>
    </section>
  )
}

function savePrice(overrides: PriceOverrides, itemId: ItemId) {
  return (price: number | null) => (price === null ? overrides.reset(itemId) : overrides.set(itemId, price))
}

const nameOf = (catalog: Catalog, itemId: ItemId) => catalog.items.get(itemId)?.name ?? `item ${itemId}`

type BuyRow = BuyLine | { kind: 'credit'; credit: number }

function WhatToBuy({ plan, planning, overrides }: { plan: PlanResult; planning: Planning; overrides: PriceOverrides }) {
  const { catalog, prices } = planning
  const { lines, credit } = buyList(plan)
  const rows: BuyRow[] = credit > 0 ? [...lines, { kind: 'credit', credit }] : lines

  const source = (itemId: ItemId) => {
    const quote = prices.quote(itemId)
    if (quote.kind === 'market') return `Market, ${quote.listings} ${plural(quote.listings, 'listing', 'listings')}`
    if (quote.kind === 'npc') return 'NPC shop'
    return quote.kind === 'manual' ? 'your price' : 'no price yet'
  }

  const columns: Column<BuyRow>[] = [
    {
      key: 'item',
      header: 'Item',
      render: (row) =>
        row.kind === 'credit' ? (
          <div className="item-text"><span>Leftover normal items</span><span className="meta">credited at the lowest listing after tax</span></div>
        ) : (
          <ItemCell item={catalog.items.get(row.itemId)} meta={source(row.itemId)} narrowMeta={`${decimal(row.expected)} needed`} />
        ),
    },
    { key: 'expected', header: 'Expected', numeric: true, wide: true, render: (row) => (row.kind === 'credit' ? null : decimal(row.expected)) },
    {
      key: 'unit',
      header: 'Unit price',
      numeric: true,
      render: (row) =>
        row.kind === 'credit' ? null : (
          <PriceCell
            itemName={nameOf(catalog, row.itemId)}
            unit={row.kind === 'buy' ? row.unit : null}
            own={overrides.prices.has(row.itemId)}
            missing={row.kind === 'missing'}
            onSave={savePrice(overrides, row.itemId)}
          />
        ),
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      numeric: true,
      render: (row) => (row.kind === 'buy' ? kina(row.subtotal) : row.kind === 'credit' ? signedKina(-row.credit) : null),
    },
  ]

  return (
    <Table
      label="What to buy"
      columns={columns}
      rows={rows}
      rowKey={(row) => (row.kind === 'credit' ? 'credit' : `${row.kind}:${row.itemId}`)}
      empty="Nothing to buy until the recipe is within your mastery."
      footer={{ item: 'Total', subtotal: Number.isFinite(plan.cost) ? kina(plan.cost) : <span className="meta">needs every price</span> }}
    />
  )
}

interface LadderRow {
  key: string
  depth: number
  itemId: ItemId
  expected: number
  unit: number
  subtotal: number
  acquisition: Acquisition | null
  step: StepPlan | null
  credit: boolean
}

const childStep = (acquisition: Acquisition) =>
  acquisition.method === 'craft' || acquisition.method === 'morph' ? acquisition.step : null

function flatten(plan: PlanResult, open: ReadonlySet<string>): LadderRow[] {
  const rows: LadderRow[] = []
  const walk = (step: StepPlan, key: string, depth: number) => {
    for (const line of step.materials) {
      const child = childStep(line.acquisition)
      const lineKey = `${key}/${line.itemId}`
      const unit = line.acquisition.method === 'none' ? Infinity : line.acquisition.unit
      rows.push({ key: lineKey, depth, itemId: line.itemId, expected: line.expected, unit, subtotal: line.subtotal, acquisition: line.acquisition, step: child, credit: false })
      if (child && open.has(lineKey)) walk(child, lineKey, depth + 1)
    }
    for (const byproduct of step.byproducts) {
      if (byproduct.credit <= 0) continue
      rows.push({ key: `${key}#${byproduct.itemId}`, depth, itemId: byproduct.itemId, expected: byproduct.expected, unit: Infinity, subtotal: -byproduct.credit, acquisition: null, step: null, credit: true })
    }
  }
  const { root } = plan
  rows.push({ key: 'root', depth: 0, itemId: root.itemId, expected: root.outputs, unit: plan.unitCost, subtotal: plan.cost, acquisition: null, step: root, credit: false })
  if (open.has('root')) walk(root, 'root', 1)
  return rows
}

const BUY_FROM = { market: 'Buy on the Market', manual: 'Buy at your price', npc: 'Buy from an NPC shop' } as const

function howText(row: LadderRow, recipeOf: (step: StepPlan) => Recipe | undefined, planning: Planning) {
  if (row.credit) return 'Left over by combo attempts, credited at the lowest listing after tax'
  if (row.step) {
    const verb = row.acquisition?.method === 'morph' ? 'Morph from Odyle' : 'Craft'
    return `${verb}, ${stepSummary(row.step, recipeOf(row.step), planning.mastery)}`
  }
  const acquisition = row.acquisition
  if (acquisition?.method === 'buy') return BUY_FROM[acquisition.quote.kind]
  return 'No price yet'
}

function HowItIsMade({ plan, planning, overrides }: { plan: PlanResult; planning: Planning; overrides: PriceOverrides }) {
  const { catalog } = planning
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(['root']))
  const rows = flatten(plan, open)
  const recipeOf = (step: StepPlan) => catalog.recipes.get(step.recipeId)

  const toggle = (key: string) =>
    setOpen((previous) => {
      const next = new Set(previous)
      if (!next.delete(key)) next.add(key)
      return next
    })

  const columns: Column<LadderRow>[] = [
    {
      key: 'item',
      header: 'Item',
      render: (row) => {
        const name = nameOf(catalog, row.itemId)
        const expandable = row.step !== null && row.step.materials.length > 0
        return (
          <ItemCell
            item={catalog.items.get(row.itemId)}
            depth={row.depth}
            meta={howText(row, recipeOf, planning)}
            narrowMeta={`${decimal(row.expected)} needed`}
            toggle={
              expandable ? (
                <button
                  type="button"
                  className="toggle"
                  aria-expanded={open.has(row.key)}
                  aria-label={`${open.has(row.key) ? 'Hide' : 'Show'} what ${name} is made from`}
                  onClick={() => toggle(row.key)}
                >
                  <Glyph name="chevron" />
                </button>
              ) : undefined
            }
          />
        )
      },
    },
    { key: 'expected', header: 'Expected', numeric: true, wide: true, render: (row) => decimal(row.expected) },
    {
      key: 'unit',
      header: 'Unit price',
      numeric: true,
      render: (row) => {
        const method = row.acquisition?.method
        if (method === 'buy' || method === 'none') {
          return (
            <PriceCell
              itemName={nameOf(catalog, row.itemId)}
              unit={method === 'buy' ? row.unit : null}
              own={overrides.prices.has(row.itemId)}
              missing={method === 'none'}
              onSave={savePrice(overrides, row.itemId)}
            />
          )
        }
        return Number.isFinite(row.unit) ? kina(row.unit) : null
      },
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      numeric: true,
      render: (row) => (row.credit ? signedKina(row.subtotal) : Number.isFinite(row.subtotal) ? kina(row.subtotal) : null),
    },
  ]

  return <Table label="How it is made" columns={columns} rows={rows} rowKey={(row) => row.key} />
}

interface RateRow {
  key: string
  label: string
  value: string
  note: string
}

const FAMILY_NOTE: Record<string, string> = {
  basic: 'the basic equipment curve',
  expert: "the Expert's curve",
  artisan: "the Artisan's curve",
  dragonlord: 'the Dragon Lord curve',
  consumable: 'the consumable curve',
  material: 'the material curve',
}

function Rates({ plan, planning, now }: { plan: PlanResult; planning: Planning; now: number }) {
  const { catalog, mastery, world } = planning
  const { root } = plan
  const recipe = catalog.recipes.get(root.recipeId)
  const item = catalog.items.get(plan.target.itemId)
  const estimate = useExchangeEstimate(item, world.id, true)
  const blocked = root.successRate === 0
  const profession = recipe?.profession ?? null
  const rows: RateRow[] = []

  const source =
    root.rateSource === 'recipe'
      ? "from the game client's curve for this recipe"
      : root.rateSource === 'fixed'
        ? 'a fixed rate for this recipe'
        : `from ${FAMILY_NOTE[root.rateSource]}, since the client lists none for this recipe`

  rows.push({
    key: 'success',
    label: 'Success per attempt',
    value: percent(root.successRate, 2),
    note: blocked ? 'Your mastery is below the recipe level, so it cannot be attempted.' : `The chance an attempt succeeds, ${source}.`,
  })

  if (recipe?.combo) {
    const { combo } = recipe
    const comboName = nameOf(catalog, combo.itemId)
    rows.push({
      key: 'combo',
      label: 'Combo per attempt',
      value: percent(root.comboRate, 2),
      note:
        combo.itemId === recipe.product.itemId
          ? `A combo fires on ${percent(combo.chance, 0)} of attempts and makes ${combo.count} instead of ${recipe.product.count}.`
          : `A combo fires on ${percent(combo.chance, 0)} of attempts, then has to succeed. It makes ${comboName}.`,
    })
  }

  if (!blocked) {
    rows.push({
      key: 'attempts',
      label: 'Expected attempts',
      value: decimal(root.attempts),
      note: `For ${root.outputs} ${nameOf(catalog, root.itemId)}. A failed attempt uses up every material.`,
    })
  }

  if (root.levelDiff !== null && recipe && profession) {
    rows.push({
      key: 'level',
      label: 'Level difference',
      value: String(root.levelDiff),
      note: `Your ${profession} mastery ${mastery[profession]} minus recipe level ${recipe.masteryLevel}, counted up to where the curve stops rising.`,
    })
  }

  if (estimate.status === 'ready') {
    const { craft } = estimate
    const gap = estimateGap(plan, craft.cost)
    const compare =
      gap === null || Math.round(gap) === 0
        ? ''
        : ` This plan is ${kina(Math.abs(gap))} Kina ${gap < 0 ? 'lower' : 'higher'} per item, because it buys a part when the listing is cheaper than crafting it${profession && mastery[profession] !== 100 ? ' and uses your mastery' : ''}.`
    rows.push({
      key: 'exchange',
      label: 'aion2.exchange estimate',
      value: kina(craft.cost),
      note: `Their expected cost for one at mastery 100, crafting every step, from prices captured ${age(craft.capturedAt, now)} ago.${compare}`,
    })
  } else if (estimate.status === 'loading') {
    rows.push({ key: 'exchange', label: 'aion2.exchange estimate', value: '', note: 'Loading their estimate.' })
  }

  const columns: Column<RateRow>[] = [
    {
      key: 'measure',
      header: 'Measure',
      render: (row) => (
        <div className="item-text rate-text">
          <span>{row.label}</span>
          <span className="meta">{row.note}</span>
        </div>
      ),
    },
    { key: 'value', header: 'Value', numeric: true, render: (row) => row.value },
  ]

  return <Table label="Rates" columns={columns} rows={rows} rowKey={(row) => row.key} />
}
