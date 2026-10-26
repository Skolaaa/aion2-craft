import { useState } from 'react'
import type { Catalog } from '../domain/types.ts'
import type { World } from '../market/exchangeClient.ts'
import { FACTION, MAX_MASTERY, PROFESSIONS, type Setup } from '../state/setup.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import { Icon } from './Icon.tsx'
import { ItemIcon } from './ItemIcon.tsx'
import { NumberField, NumberInput } from './NumberField.tsx'
import { WorldPicker } from './WorldPicker.tsx'
import { kina } from './format.ts'

interface Props {
  worlds: readonly World[]
  worldsLoading: boolean
  world: World
  setup: Setup
  catalog: Catalog
  overrides: PriceOverrides
  patch(change: Partial<Setup>): void
  onWorld(world: World): void
}

const OPTIONS = [
  { key: 'allowCraft', label: 'Craft sub-materials', note: 'Craft an ingredient yourself when that costs less than buying it.' },
  { key: 'allowMorph', label: 'Morph from Odyle', note: 'Turn Odyle into materials with Substance Morph when that costs less.' },
  { key: 'byproductCredit', label: 'Credit byproducts', note: 'Count the normal items that failed combo attempts leave behind, at market price after tax.' },
] as const

export function SetupPanel({ worlds, worldsLoading, world, setup, catalog, overrides, patch, onWorld }: Props) {
  const [confirmingReset, setConfirmingReset] = useState(false)
  const taxPercent = Math.round(setup.taxRate * 1000) / 10
  const overrideList = [...overrides.prices].map(([itemId, price]) => ({ item: catalog.items.get(itemId), itemId, price }))

  return (
    <div className="setup">
      <section className="setup-section">
        <h2 className="section-title"><label htmlFor="world">World</label></h2>
        <WorldPicker id="world" worlds={worlds} value={world} onPick={onWorld} />
        <p className="field-hint">
          {worldsLoading ? 'Loading the world list.' : `${world.regionName}. ${FACTION[world.race]} recipes.`}
        </p>
      </section>

      <fieldset className="setup-section">
        <legend className="section-title">Crafting mastery</legend>
        {PROFESSIONS.map(({ id, label, inGame }) => (
          <div className="mastery-row" key={id}>
            <label className="mastery-name" htmlFor={`mastery-${id}`}>
              {label}
              {inGame && <small>{inGame}</small>}
            </label>
            <input
              className="slider"
              type="range"
              min={0}
              max={MAX_MASTERY}
              value={setup.mastery[id]}
              aria-label={`${label} mastery slider`}
              onChange={(event) => patch({ mastery: { ...setup.mastery, [id]: Number(event.target.value) } })}
            />
            <NumberInput
              id={`mastery-${id}`}
              value={setup.mastery[id]}
              min={0}
              max={MAX_MASTERY}
              onChange={(value) => patch({ mastery: { ...setup.mastery, [id]: value } })}
            />
          </div>
        ))}
      </fieldset>

      <section className="setup-section">
        <NumberField
          id="tax"
          label={<span className="section-title">Market tax</span>}
          value={taxPercent}
          min={0}
          max={50}
          step={0.5}
          integer={false}
          suffix="%"
          hint="Default 5%. The real rate shows at the top right of the Market screen in game."
          onChange={(value) => patch({ taxRate: value / 100 })}
        />
      </section>

      <fieldset className="setup-section">
        <legend className="section-title">Options</legend>
        {OPTIONS.map(({ key, label, note }) => (
          <label className="check" key={key}>
            <input type="checkbox" checked={setup[key]} onChange={(event) => patch({ [key]: event.target.checked })} />
            <span>
              <span className="check-label">{label}</span>
              <span className="field-hint">{note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <section className="setup-section" aria-labelledby="your-prices">
        <h2 className="section-title" id="your-prices">
          Your prices <span className="count">{overrideList.length}</span>
        </h2>
        {overrideList.length === 0 ? (
          <p className="field-hint">Prices you type for an item replace the market and NPC price. They stay saved for {world.name}.</p>
        ) : (
          <>
            <ul className="override-list">
              {overrideList.map(({ item, itemId, price }) => (
                <li className="override" key={itemId}>
                  <ItemIcon item={item} size={24} />
                  <span className="override-name">{item?.name ?? itemId}</span>
                  <span className="override-price num">{kina(price)}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Reset your price for ${item?.name ?? itemId}`}
                    onClick={() => overrides.reset(itemId)}
                  >
                    <Icon name="undo" size={14} />
                  </button>
                </li>
              ))}
            </ul>
            {confirmingReset ? (
              <div className="confirm">
                <span>Remove all {overrideList.length}?</span>
                <button type="button" className="btn btn-danger" onClick={() => { overrides.resetAll(); setConfirmingReset(false) }}>
                  Remove
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setConfirmingReset(false)}>Keep</button>
              </div>
            ) : (
              <button type="button" className="btn btn-quiet" onClick={() => setConfirmingReset(true)}>Reset all prices</button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
