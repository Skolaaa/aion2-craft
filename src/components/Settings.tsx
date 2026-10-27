import type { ItemId } from '../domain/types.ts'
import { SIDE, type World, type WorldDirectory } from '../market/worlds.ts'
import { itemName } from '../state/craftables.ts'
import { kina, taxPercent } from '../state/format.ts'
import type { Planning } from '../state/planning.ts'
import { MAX_MASTERY, PROFESSIONS, type Setup, type SetupPatch } from '../state/setup.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import { Button } from './Button.tsx'
import { Field, NumberInput } from './Field.tsx'
import { Glyph } from './Glyph.tsx'
import { ItemCell } from './ItemCell.tsx'
import { PriceCell } from './PriceCell.tsx'
import { Surface } from './Surface.tsx'
import { Table, type Column } from './Table.tsx'

interface Props {
  anchor: HTMLElement
  onClose(focusAnchor: boolean): void
  directory: WorldDirectory | null
  planning: Planning
  setup: Setup
  patch(change: SetupPatch): void
  onWorld(world: World): void
  overrides: PriceOverrides
}

const OPTIONS = [
  {
    key: 'allowCraft',
    label: 'Craft parts when that is cheaper',
    note: 'When off, every part with a listing is bought. Parts nobody lists are still crafted.',
  },
  {
    key: 'allowMorph',
    label: 'Morph materials from Odyle when that is cheaper',
    note: 'Substance Morph turns Odyle into the Bound version of a material, which recipes accept.',
  },
  {
    key: 'byproductCredit',
    label: 'Count leftover normal items',
    note: 'Combo attempts also make normal items. Subtract them at the lowest listing after tax.',
  },
] as const

export function Settings({ anchor, onClose, ...body }: Props) {
  return (
    <Surface
      anchor={anchor}
      placement="drawer"
      title="Settings"
      onClose={onClose}
      footer={<Button variant="primary" onClick={() => onClose(true)}>Done</Button>}
    >
      <SettingsBody {...body} />
    </Surface>
  )
}

function SettingsBody({ directory, planning, setup, patch, onWorld, overrides }: Omit<Props, 'anchor' | 'onClose'>) {
  const { world, catalog, market } = planning
  const regions = directory?.regions ?? [{ code: world.region, name: world.regionName, worlds: [{ world, match: null }] }]
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
      <Field id="world" label="World" hint="Prices, recipes and your own prices follow the world and its faction.">
        <div className="select-box">
          <select
            id="world"
            className="select"
            aria-describedby="world-hint"
            value={world.id}
            disabled={directory === null}
            onChange={(event) => {
              const next = directory?.byId.get(Number(event.target.value))
              if (next) onWorld(next.world)
            }}
          >
            {regions.map((region) => (
              <optgroup key={region.code} label={region.name}>
                {region.worlds.map(({ world: w }) => (
                  <option key={w.id} value={w.id}>
                    {w.name}, {SIDE[w.race].name}{w.hasData ? '' : ', no prices yet'}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <Glyph name="chevron" />
        </div>
      </Field>

      <fieldset className="settings-group">
        <legend className="section-title">Mastery</legend>
        <p className="meta">Your level in each profession. A recipe above it cannot be crafted.</p>
        {PROFESSIONS.map(({ id, label, inGame }) => (
          <div className="mastery-row" key={id}>
            <label className="mastery-label" htmlFor={`mastery-${id}`} id={`mastery-${id}-label`}>
              {label}
              {inGame && <span className="meta">{inGame} in game</span>}
            </label>
            <NumberInput
              id={`mastery-${id}`}
              className="mastery-number"
              value={setup.mastery[id]}
              min={0}
              max={MAX_MASTERY}
              onChange={(value) => patch({ mastery: { ...setup.mastery, [id]: Math.round(value) } })}
            />
            <input
              type="range"
              className="mastery-slider"
              min={0}
              max={MAX_MASTERY}
              step={1}
              value={setup.mastery[id]}
              aria-labelledby={`mastery-${id}-label`}
              onChange={(event) => patch({ mastery: { ...setup.mastery, [id]: event.target.valueAsNumber } })}
            />
          </div>
        ))}
      </fieldset>

      <Field id="tax" label="Market tax in percent" hint="The Market screen in game shows the rate. 5% unless you know yours." className="tax">
        <NumberInput
          id="tax"
          describedBy="tax-hint"
          value={taxPercent(setup.taxRate)}
          min={0}
          max={50}
          step={0.1}
          onChange={(value) => patch({ taxRate: value / 100 })}
        />
      </Field>

      <fieldset className="settings-group">
        <legend className="section-title">Plan</legend>
        {OPTIONS.map(({ key, label, note }) => (
          <label className="check" key={key}>
            <input type="checkbox" checked={setup[key]} onChange={(event) => patch({ [key]: event.target.checked })} />
            <span className="item-text">
              <span>{label}</span>
              <span className="meta">{note}</span>
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
