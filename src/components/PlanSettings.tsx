import type { ItemId } from '../domain/types.ts'
import { itemName } from '../state/craftables.ts'
import { kina } from '../state/format.ts'
import type { Planning } from '../state/planning.ts'
import { PLAN_FLAGS, type PlanFlag, type Setup, type SetupPatch } from '../state/setup.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import { Button } from './Button.tsx'
import { ItemCell } from './ItemCell.tsx'
import { PriceCell } from './PriceCell.tsx'
import { Table, type Column } from './Table.tsx'

const OPTIONS: Record<PlanFlag, { label: string; note: string }> = {
  allowCraft: {
    label: 'Craft parts when that is cheaper',
    note: 'When off, every part with a listing is bought. Parts nobody lists are still crafted.',
  },
  allowMorph: {
    label: 'Morph materials from Odyle when that is cheaper',
    note: 'Substance Morph turns Odyle into the Bound version of a material, which recipes accept.',
  },
  byproductCredit: {
    label: 'Count leftover normal items',
    note: 'Combo attempts also make normal items. Subtract them at the lowest listing after tax.',
  },
}

interface Props {
  setup: Setup
  patch(change: SetupPatch): void
  planning: Planning
  overrides: PriceOverrides
}

export function PlanSettings({ setup, patch, planning, overrides }: Props) {
  const { world, catalog, market } = planning
  const entries = [...overrides.prices]
  const priceColumns: Column<[ItemId, number]>[] = [
    { key: 'item', header: 'Item', render: ([itemId]) => <ItemCell item={catalog.items.get(itemId)} /> },
    {
      key: 'listing',
      header: 'Lowest listing',
      numeric: true,
      hideNarrow: true,
      render: ([itemId]) => {
        const lowest = market.get(itemId)?.lowest
        return lowest == null ? <span className="meta">none</span> : kina(lowest)
      },
    },
    {
      key: 'yours',
      header: 'Your price',
      numeric: true,
      render: ([itemId, price]) => {
        const name = itemName(catalog, itemId)
        return (
          <span className="price-actions">
            <PriceCell itemName={name} unit={price} own={false} onSave={(next) => overrides.save(itemId, next)} />
            <Button className="button-small" aria-label={`Reset the price of ${name}`} onClick={() => overrides.save(itemId, null)}>Reset</Button>
          </span>
        )
      },
    },
  ]

  return (
    <>
      <fieldset className="settings-group">
        <legend className="section-title">Plan</legend>
        {PLAN_FLAGS.map((flag) => (
          <label className="check" key={flag}>
            <input type="checkbox" checked={setup[flag]} onChange={(event) => patch({ [flag]: event.target.checked })} />
            <span className="item-text">
              <span>{OPTIONS[flag].label}</span>
              <span className="meta">{OPTIONS[flag].note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <section className="settings-group" aria-labelledby="your-prices">
        <div className="group-head">
          <h3 className="section-title" id="your-prices">Your prices on {world.name}</h3>
          {entries.length > 1 && <Button className="button-small" onClick={overrides.resetAll}>Reset all</Button>}
        </div>
        <Table
          label={`Your prices on ${world.name}`}
          columns={priceColumns}
          rows={entries}
          rowKey={([itemId]) => String(itemId)}
          empty="None yet. Click a unit price in a table to set yours."
        />
      </section>
    </>
  )
}
