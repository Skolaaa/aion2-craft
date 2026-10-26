import { useMemo, useState, type CSSProperties } from 'react'
import type { Catalog, ItemId, MaterialLine, PlanResult, StepPlan } from '../domain/types.ts'
import type { Planning } from '../state/planning.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import { segmentColor } from './CostRibbon.tsx'
import { Icon } from './Icon.tsx'
import { ItemIcon } from './ItemIcon.tsx'
import { PriceEditor, type Editing } from './PriceEditor.tsx'
import { attemptsText, expected, isStale, kina, rate } from './format.ts'

type Row =
  | { kind: 'root'; key: string; step: StepPlan; expanded: boolean }
  | { kind: 'line'; key: string; depth: number; line: MaterialLine; child: StepPlan | null; expanded: boolean; swatch: number | null }
  | { kind: 'detail'; key: string; depth: number; step: StepPlan }

const childOf = (line: MaterialLine): StepPlan | null =>
  line.acquisition.method === 'craft' || line.acquisition.method === 'morph' ? line.acquisition.step : null

const startsOpen = (line: MaterialLine) => line.acquisition.method === 'craft'

function flatten(plan: PlanResult, open: ReadonlyMap<string, boolean>, ranks: ReadonlyMap<ItemId, number>): Row[] {
  const rows: Row[] = []
  const walk = (step: StepPlan, key: string, depth: number) => {
    rows.push({ kind: 'detail', key: `${key}#detail`, depth, step })
    for (const line of step.materials) {
      const lineKey = `${key}/${line.itemId}`
      const child = childOf(line)
      const expanded = child !== null && (open.get(lineKey) ?? startsOpen(line))
      rows.push({ kind: 'line', key: lineKey, depth, line, child, expanded, swatch: depth === 1 ? (ranks.get(line.itemId) ?? null) : null })
      if (child && expanded) walk(child, lineKey, depth + 1)
    }
  }
  const rootOpen = open.get('root') ?? true
  rows.push({ kind: 'root', key: 'root', step: plan.root, expanded: rootOpen })
  if (rootOpen) walk(plan.root, 'root', 1)
  return rows
}

function nodeKeys(step: StepPlan, key: string, keys: string[] = []) {
  for (const line of step.materials) {
    const child = childOf(line)
    if (!child) continue
    const lineKey = `${key}/${line.itemId}`
    keys.push(lineKey)
    nodeKeys(child, lineKey, keys)
  }
  return keys
}

const depthStyle = (depth: number) => ({ '--depth': depth }) as CSSProperties

const BUY_LABEL = { market: 'on the Market', manual: 'at your price', npc: 'from the NPC shop' } as const

function stepSummary(step: StepPlan, catalog: Catalog) {
  if (step.successRate === 0) {
    const recipe = catalog.recipes.get(step.recipeId)
    return `Needs ${recipe?.profession ?? 'more'} mastery ${recipe?.masteryLevel ?? ''}`.trim()
  }
  return `${attemptsText(step.attempts)} at ${rate(step.successRate)}`
}

const RATE_NOTE: Record<Exclude<StepPlan['rateSource'], 'recipe' | 'fixed'>, string> = {
  basic: 'The client lists no curve for this recipe, so rates use the basic equipment curve.',
  expert: "The client lists no curve for this recipe, so rates use the Expert's curve.",
  artisan: "The client lists no curve for this recipe, so rates use the Artisan's curve.",
  dragonlord: 'The client lists no curve for this recipe, so rates use the Dragon Lord curve.',
  consumable: 'The client lists no curve for this recipe, so rates use the consumable curve.',
  material: 'The client lists no curve for this recipe, so rates use the material curve.',
}

interface Props {
  plan: PlanResult
  planning: Planning
  overrides: PriceOverrides
  editing: Editing | null
  ranks: ReadonlyMap<ItemId, number>
  quantity: number
  now: number
  onEdit(editing: Editing | null): void
}

export function Ladder({ plan, planning, overrides, editing, ranks, quantity, now, onEdit }: Props) {
  const { catalog, mastery } = planning
  const [open, setOpen] = useState<ReadonlyMap<string, boolean>>(new Map())
  const rows = useMemo(() => flatten(plan, open, ranks), [plan, open, ranks])
  const keys = useMemo(() => nodeKeys(plan.root, 'root'), [plan])
  const item = (id: ItemId) => catalog.items.get(id)

  const toggle = (key: string, isOpen: boolean) => setOpen((previous) => new Map(previous).set(key, !isOpen))
  const setAll = (value: boolean) => setOpen(new Map([['root', true], ...keys.map((key): [string, boolean] => [key, value])]))

  return (
    <section className="panel ladder" aria-labelledby="ladder-title">
      <div className="panel-head">
        <h2 className="panel-title" id="ladder-title">Ladder</h2>
        {keys.length > 0 && (
          <div className="panel-actions">
            <button type="button" className="btn btn-quiet" onClick={() => setAll(true)}>Expand all</button>
            <button type="button" className="btn btn-quiet" onClick={() => setAll(false)}>Collapse all</button>
          </div>
        )}
      </div>
      <div className="lrow lhead" aria-hidden="true">
        <span>Item and how to get it</span>
        <span className="r">Need</span>
        <span className="r">Each</span>
        <span className="r">Subtotal</span>
        <span />
      </div>
      <ul className="ladder-list">
        {rows.map((row) => {
          if (row.kind === 'detail') {
            const { step } = row
            const recipe = catalog.recipes.get(step.recipeId)
            const profession = recipe?.profession ?? null
            return (
              <li className="lrow ldetail" key={row.key} style={depthStyle(row.depth)}>
                <div className="ldetail-body">
                  <dl className="mini-stats">
                    <div><dt>Success</dt><dd className="num">{rate(step.successRate)}</dd></div>
                    {step.comboRate > 0 && <div><dt>Combo</dt><dd className="num">{rate(step.comboRate)}</dd></div>}
                    <div><dt>Attempts</dt><dd className="num">{Number.isFinite(step.attempts) ? expected(step.attempts) : 'n/a'}</dd></div>
                    {recipe && profession && (
                      <div>
                        <dt>{profession}</dt>
                        <dd className="num">needs {recipe.masteryLevel}, you have {mastery[profession]}</dd>
                      </div>
                    )}
                  </dl>
                  {step.successRate === 0 ? (
                    <p className="field-hint is-warn">Mastery is too low to attempt this step.</p>
                  ) : (
                    step.rateSource !== 'recipe' && step.rateSource !== 'fixed' && <p className="field-hint">{RATE_NOTE[step.rateSource]}</p>
                  )}
                </div>
              </li>
            )
          }

          if (row.kind === 'root') {
            const { step } = row
            const target = item(step.itemId)
            return (
              <li className="lrow lline is-root" key={row.key} style={depthStyle(0)}>
                <div className="lname">
                  <button
                    type="button"
                    className="toggle"
                    aria-expanded={row.expanded}
                    aria-label={`${row.expanded ? 'Collapse' : 'Expand'} ${target?.name ?? 'target'}`}
                    onClick={() => toggle('root', row.expanded)}
                  >
                    <Icon name="chevron" size={14} />
                  </button>
                  <ItemIcon item={target} size={28} />
                  <span className="lname-text">
                    <span className="lname-main">{target?.name}</span>
                    <span className="lname-sub"><span className="how how-craft">Craft</span> {stepSummary(step, catalog)}</span>
                  </span>
                </div>
                <span className="lcell lneed num" data-label="Need">{quantity}</span>
                <span className="lcell leach num" data-label="Each">{kina(plan.unitCost)}</span>
                <span className="lcell lsum num" data-label="Subtotal">{kina(plan.cost)}</span>
                <span />
              </li>
            )
          }

          const { line, child, depth } = row
          const lineItem = item(line.itemId)
          const a = line.acquisition
          const isEditing = editing?.rowKey === row.key
          const manual = a.method === 'buy' && a.quote.kind === 'manual'
          const stale = a.method === 'buy' && a.quote.kind === 'market' && isStale(a.quote.capturedAt, now)
          return (
            <li className="lli" key={row.key}>
              <div className={`lrow lline ${a.method === 'none' ? 'is-missing' : ''}`} style={depthStyle(depth)}>
                <div className="lname">
                  {child ? (
                    <button
                      type="button"
                      className="toggle"
                      aria-expanded={row.expanded}
                      aria-label={`${row.expanded ? 'Collapse' : 'Expand'} ${lineItem?.name ?? line.itemId}`}
                      onClick={() => toggle(row.key, row.expanded)}
                    >
                      <Icon name="chevron" size={14} />
                    </button>
                  ) : (
                    <span className="toggle-gap" />
                  )}
                  {row.swatch !== null && <span className="swatch" style={{ background: segmentColor(row.swatch) }} aria-hidden="true" />}
                  <ItemIcon item={lineItem} size={28} />
                  <span className="lname-text">
                    <span className="lname-main">{lineItem?.name ?? line.itemId}</span>
                    <span className="lname-sub">
                      {a.method === 'buy' && (
                        <>
                          <span className="how">Buy</span> {BUY_LABEL[a.quote.kind]}
                          {manual && <span className="tag">your price</span>}
                          {stale && <span className="stale-flag"><Icon name="alert" size={12} />stale</span>}
                        </>
                      )}
                      {a.method === 'craft' && child && <><span className="how how-craft">Craft</span> {stepSummary(child, catalog)}</>}
                      {a.method === 'morph' && child && <><span className="how how-craft">Morph</span> from Odyle{child.successRate === 0 ? `, ${stepSummary(child, catalog)}` : ''}</>}
                      {a.method === 'none' && <span className="how how-missing">No price</span>}
                    </span>
                  </span>
                </div>
                <span className="lcell lneed num" data-label="Need">
                  {expected(line.expected)}
                  <small>{line.perAttempt} per attempt</small>
                </span>
                <span className={`lcell leach num ${manual ? 'is-manual' : ''}`} data-label="Each">
                  {a.method === 'none' ? 'n/a' : kina(a.unit)}
                </span>
                <span className="lcell lsum num" data-label="Subtotal">{kina(line.subtotal)}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Set your price for ${lineItem?.name ?? line.itemId}`}
                  aria-expanded={isEditing}
                  onClick={() => onEdit(isEditing ? null : { rowKey: row.key, itemId: line.itemId })}
                >
                  <Icon name="pencil" size={14} />
                </button>
              </div>
              {isEditing && editing && (
                <div className="edit-row" style={depthStyle(depth)}>
                  <PriceEditor editing={editing} planning={planning} overrides={overrides} onClose={() => onEdit(null)} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
