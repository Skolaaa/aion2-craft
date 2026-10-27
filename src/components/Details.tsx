import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Acquisition, ItemId, PlanResult, Recipe, StepPlan } from '../domain/types.ts'
import { buyList, childStep, depthNote, estimateGap, stepCount, stepSummary, successNote, type BuyLine, type BuyList } from '../state/answer.ts'
import { itemName } from '../state/craftables.ts'
import { age, decimal, kina, percent, plural, signedKina } from '../state/format.ts'
import type { Planning } from '../state/planning.ts'
import { MAX_MASTERY } from '../state/setup.ts'
import { shoppingText } from '../state/shopping.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import type { OwnedStock } from '../state/useOwned.ts'
import { useExchangeEstimate } from '../state/useExchangeEstimate.ts'
import { useClipboard } from '../state/useClipboard.ts'
import { useNow } from '../state/useNow.ts'
import { Button } from './Button.tsx'
import { CountCell } from './CountCell.tsx'
import { Glyph } from './Glyph.tsx'
import { ItemCell } from './ItemCell.tsx'
import { PriceCell } from './PriceCell.tsx'
import { Table, type Column } from './Table.tsx'

const TABS = [
  { id: 'buy', label: 'buy', title: 'What to buy' },
  { id: 'steps', label: 'steps', title: 'How it is made' },
  { id: 'rates', label: 'rates', title: 'Rates' },
] as const

export type DetailTab = (typeof TABS)[number]['id']

interface Props {
  plan: PlanResult
  planning: Planning
  overrides: PriceOverrides
  owned: OwnedStock
  link: string
  tab: DetailTab
  onTab(tab: DetailTab): void
}

export function Details({ plan, planning, overrides, owned, link, tab, onTab }: Props) {
  const base = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const list = buyList(plan)
  const counts: Record<DetailTab, number | null> = { buy: list.lines.length, steps: stepCount(plan.root), rates: null }

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
        {TABS.map(({ id, label, title }, index) => (
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
            title={title}
            onClick={() => onTab(id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {label}
            {counts[id] !== null && <span className="tab-count">{counts[id]}</span>}
          </button>
        ))}
      </div>
      <div className="tab-panel" role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${tab}`}>
        {tab === 'buy' && <WhatToBuy plan={plan} list={list} planning={planning} overrides={overrides} owned={owned} link={link} />}
        {tab === 'steps' && <HowItIsMade key={plan.target.itemId} plan={plan} credit={list.credit} planning={planning} overrides={overrides} />}
        {tab === 'rates' && <Rates plan={plan} planning={planning} />}
      </div>
    </section>
  )
}

const creditFooter = (credit: number, note: string) => ({
  item: (
    <div className="item-text">
      <span>Leftover normal items</span>
      <span className="meta">{note}</span>
    </div>
  ),
  subtotal: signedKina(-credit),
})

interface WhatToBuyProps {
  plan: PlanResult
  list: BuyList
  planning: Planning
  overrides: PriceOverrides
  owned: OwnedStock
  link: string
}

const MISSING = <span className="is-warn">no price yet</span>

function WhatToBuy({ plan, list, planning, overrides, owned, link }: WhatToBuyProps) {
  const { catalog, prices, market, world } = planning
  const { lines, credit } = list
  // Shares are of the shopping total before the byproduct credit, so they add up to 100%.
  const gross = plan.cost + credit
  const usesStock = lines.some((line) => line.owned > 0)

  const source = (row: BuyLine) => {
    if (row.kind === 'owned') return 'your stock'
    const quote = prices.quote(row.itemId)
    if (quote.kind === 'market') {
      const depth = row.kind === 'buy' ? row.depth : null
      return depth ? `Market, ${depthNote(depth, quote.listings)}` : `Market, ${quote.listings} ${plural(quote.listings, 'listing', 'listings')}`
    }
    if (quote.kind === 'npc') return 'NPC shop'
    if (quote.kind === 'none') return MISSING
    const lowest = market.get(row.itemId)?.lowest
    return lowest == null ? 'not on the Market' : `Market lowest ${kina(lowest)}`
  }
  const toBuy = (row: BuyLine) => (row.kind === 'owned' ? 0 : row.expected - row.owned)

  const columns: Column<BuyLine>[] = [
    {
      key: 'item',
      header: 'Item',
      render: (row) => (
        <ItemCell
          item={catalog.items.get(row.itemId)}
          narrowMeta={<>{source(row)}, {decimal(row.expected)} needed{row.owned > 0 && row.kind !== 'owned' && <>, {decimal(toBuy(row))} to buy</>}</>}
        />
      ),
    },
    { key: 'source', header: 'Source', hideNarrow: true, render: (row) => <span className="meta">{source(row)}</span> },
    { key: 'expected', header: 'Expected', numeric: true, hideNarrow: true, render: (row) => decimal(row.expected) },
    {
      key: 'have',
      header: 'Have',
      numeric: true,
      render: (row) => (
        <CountCell itemName={itemName(catalog, row.itemId)} count={owned.counts.get(row.itemId) ?? null} onSave={(count) => owned.save(row.itemId, count)} />
      ),
    },
    ...(usesStock ? [{ key: 'buy', header: 'To buy', numeric: true, hideNarrow: true, render: (row: BuyLine) => decimal(toBuy(row)) }] : []),
    {
      key: 'unit',
      header: 'Unit price',
      numeric: true,
      render: (row) =>
        row.kind === 'owned' ? null : (
          <PriceCell
            itemName={itemName(catalog, row.itemId)}
            unit={row.kind === 'buy' ? row.unit : null}
            own={overrides.prices.has(row.itemId)}
            missing={row.kind === 'missing'}
            onSave={(price) => overrides.save(row.itemId, price)}
          />
        ),
    },
    { key: 'subtotal', header: 'Subtotal', numeric: true, render: (row) => (row.kind === 'buy' ? kina(row.subtotal) : null) },
    {
      key: 'share',
      header: 'Share',
      hideNarrow: true,
      render: (row) => {
        if (row.kind !== 'buy' || !Number.isFinite(gross) || gross <= 0) return null
        const share = row.subtotal / gross
        return (
          <span className="share" title={`${percent(share, 1)} of what is bought`}>
            <span className="share-fill" style={{ width: `${Math.min(100, share * 100)}%` }} />
          </span>
        )
      },
    },
  ]

  const total = {
    item: <strong>Total</strong>,
    subtotal: <strong>{Number.isFinite(plan.cost) ? kina(plan.cost) : <span className="meta">needs every price</span>}</strong>,
  }

  const text = () => shoppingText(plan, list, { itemName: (itemId) => itemName(catalog, itemId), worldName: world.name, link })

  return (
    <>
      <div className="panel-tools">
        <span className="meta">Have is what you hold on {world.name}. The plan uses it before buying.</span>
        {lines.length > 0 && <CopyButton text={text} />}
      </div>
      <Table
        label="What to buy"
        columns={columns}
        rows={lines}
        rowKey={(row) => String(row.itemId)}
        empty="Nothing to buy until the recipe is within your mastery."
        footer={lines.length === 0 ? undefined : credit > 0 ? [creditFooter(credit, 'credited at the lowest listing after tax'), total] : [total]}
      />
    </>
  )
}

/** Copies the list as plain text. When the clipboard is unavailable, shows the text to copy by hand. */
function CopyButton({ text }: { text(): string }) {
  const { state, copy } = useClipboard()
  const [shown, setShown] = useState<string | null>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (shown !== null) areaRef.current?.select()
  }, [shown])

  const onCopy = async () => {
    const value = text()
    setShown((await copy(value)) ? null : value)
  }

  return (
    <>
      <Button className="button-small" aria-live="polite" onClick={onCopy}>
        {state === 'copied' ? 'Copied' : 'Copy list'}
      </Button>
      {shown !== null && (
        <textarea ref={areaRef} className="input copy-text" readOnly rows={6} aria-label="Shopping list to copy by hand" value={shown} />
      )}
    </>
  )
}

interface LadderRow {
  key: string
  depth: number
  itemId: ItemId
  expected: number
  owned: number
  subtotal: number
  acquisition: Acquisition
}

function flatten(plan: PlanResult, open: ReadonlySet<string>): LadderRow[] {
  const rows: LadderRow[] = []
  const walk = (step: StepPlan, key: string, depth: number) => {
    for (const { itemId, expected, owned, subtotal, acquisition } of step.materials) {
      const lineKey = `${key}/${itemId}`
      rows.push({ key: lineKey, depth, itemId, expected, owned, subtotal, acquisition })
      const child = childStep(acquisition)
      if (child && open.has(lineKey)) walk(child, lineKey, depth + 1)
    }
  }
  const { root } = plan
  const made: Acquisition = { method: 'craft', unit: plan.unitCost, step: root }
  rows.push({ key: 'root', depth: 0, itemId: root.itemId, expected: root.outputs, owned: 0, subtotal: plan.cost, acquisition: made })
  if (open.has('root')) walk(root, 'root', 1)
  return rows
}

const BUY_FROM = { market: 'Buy on the Market', manual: 'Buy at your price', npc: 'Buy from an NPC shop' } as const

function howText({ acquisition }: LadderRow, recipeOf: (step: StepPlan) => Recipe | undefined, planning: Planning) {
  if (acquisition.method === 'buy') {
    const depth = acquisition.quote.kind === 'market' ? acquisition.quote.depth : null
    return depth ? `${BUY_FROM.market} ${depthNote(depth)}` : BUY_FROM[acquisition.quote.kind]
  }
  if (acquisition.method === 'owned') return 'From your stock'
  if (acquisition.method === 'none') return <span className="is-warn">No price yet</span>
  const verb = acquisition.method === 'morph' ? 'Morph from Odyle' : 'Craft'
  return `${verb}, ${stepSummary(acquisition.step, recipeOf(acquisition.step), planning.mastery)}`
}

function HowItIsMade({ plan, credit, planning, overrides }: { plan: PlanResult; credit: number; planning: Planning; overrides: PriceOverrides }) {
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
        const name = itemName(catalog, row.itemId)
        const step = childStep(row.acquisition)
        const expandable = step !== null && step.materials.length > 0
        return (
          <ItemCell
            item={catalog.items.get(row.itemId)}
            depth={row.depth}
            meta={howText(row, recipeOf, planning)}
            narrowMeta={`${decimal(row.expected)} needed${row.owned > 0 && row.acquisition.method !== 'owned' ? `, ${decimal(row.owned)} yours` : ''}`}
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
    { key: 'expected', header: 'Expected', numeric: true, hideNarrow: true, render: (row) => decimal(row.expected) },
    {
      key: 'unit',
      header: 'Unit price',
      numeric: true,
      render: ({ itemId, acquisition }) => {
        if (acquisition.method === 'buy' || acquisition.method === 'none') {
          return (
            <PriceCell
              itemName={itemName(catalog, itemId)}
              unit={acquisition.method === 'buy' ? acquisition.unit : null}
              own={overrides.prices.has(itemId)}
              missing={acquisition.method === 'none'}
              onSave={(price) => overrides.save(itemId, price)}
            />
          )
        }
        if (acquisition.method === 'owned') return null
        return Number.isFinite(acquisition.unit) ? kina(acquisition.unit) : null
      },
    },
    { key: 'subtotal', header: 'Subtotal', numeric: true, render: (row) => (Number.isFinite(row.subtotal) ? kina(row.subtotal) : null) },
  ]

  return (
    <Table
      label="How it is made"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.key}
      footer={credit > 0 ? [creditFooter(credit, 'credited at the lowest listing after tax, already in the costs above')] : undefined}
    />
  )
}

interface RateRow {
  key: string
  label: string
  value: string
  note: string
}

function Rates({ plan, planning }: { plan: PlanResult; planning: Planning }) {
  const now = useNow()
  const { catalog, mastery, world } = planning
  const { root } = plan
  const recipe = catalog.recipes.get(root.recipeId)
  const estimate = useExchangeEstimate(plan.target.itemId, world.id)
  const blocked = root.successRate === 0
  const profession = recipe?.profession ?? null
  const rows: RateRow[] = []

  rows.push({
    key: 'success',
    label: 'Success per attempt',
    value: percent(root.successRate, 2),
    note: successNote(root),
  })

  if (recipe?.combo) {
    const { combo } = recipe
    const comboName = itemName(catalog, combo.itemId)
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
      note: `For ${root.outputs} ${itemName(catalog, root.itemId)}. A failed attempt uses up every material.`,
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

  if (estimate !== null) {
    const gap = estimateGap(plan, estimate.cost)
    const compare =
      gap === null || Math.round(gap) === 0
        ? ''
        : ` This plan is ${kina(Math.abs(gap))} Kina ${gap < 0 ? 'lower' : 'higher'} per item, because it buys a part when the listing is cheaper than crafting it${profession && mastery[profession] !== MAX_MASTERY ? ' and uses your mastery' : ''}.`
    rows.push({
      key: 'exchange',
      label: 'aion2.exchange estimate',
      value: kina(estimate.cost),
      note: `Their expected cost for one at mastery 100, crafting every step, from prices captured ${age(estimate.capturedAt, now)} ago.${compare}`,
    })
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
