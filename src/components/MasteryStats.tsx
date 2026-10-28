import type { CSSProperties } from 'react'
import type { Mastery } from '../domain/types.ts'
import { taxPercent } from '../state/format.ts'
import { MAX_MASTERY, PROFESSIONS, type SetupPatch } from '../state/setup.ts'
import { NumberInput } from './NumberInput.tsx'

interface Props {
  patch(change: SetupPatch): void
}

export function MasteryStats({ mastery, patch }: Props & { mastery: Mastery }) {
  const set = (id: keyof Mastery, value: number) => patch({ mastery: { ...mastery, [id]: Math.round(value) } })
  return (
    <fieldset className="settings-group">
      <legend className="section-title"><span>Mastery</span></legend>
      <p className="meta">
        Your level in each profession, 0 to {MAX_MASTERY}. Drag the bar or type the number. A recipe above your level cannot be crafted.
      </p>
      {PROFESSIONS.map(({ id, label, inGame }, index) => {
        const inputId = `mastery-${id}`
        const labelId = `${inputId}-label`
        return (
          <div className="stat" key={id}>
            <div className="stat-name">
              <label htmlFor={inputId} id={labelId}>{label}</label>
              {inGame && <span className="meta">{inGame} in game</span>}
            </div>
            <div className="stat-big">
              <NumberInput id={inputId} value={mastery[id]} min={0} max={MAX_MASTERY} initialFocus={index === 0} onChange={(value) => set(id, value)} />
              <small>of {MAX_MASTERY}</small>
            </div>
            <input
              type="range"
              className="level-track"
              style={{ '--fill': `${mastery[id]}%` } as CSSProperties}
              min={0}
              max={MAX_MASTERY}
              step={1}
              value={mastery[id]}
              aria-labelledby={labelId}
              onChange={(event) => set(id, event.target.valueAsNumber)}
            />
          </div>
        )
      })}
    </fieldset>
  )
}

export function TaxStat({ taxRate, patch }: Props & { taxRate: number }) {
  return (
    <fieldset className="settings-group">
      <legend className="section-title"><span>Market tax</span></legend>
      <div className="stat">
        <div className="stat-name">
          <label htmlFor="tax">Tax on each sale</label>
          <span className="meta" id="tax-hint">Market screen in game, top right. Lowers what a sale pays out, so it moves the margin.</span>
        </div>
        <div className="stat-big">
          <NumberInput id="tax" describedBy="tax-hint" value={taxPercent(taxRate)} min={0} max={50} step={0.1} onChange={(value) => patch({ taxRate: value / 100 })} />
          <small>%</small>
        </div>
      </div>
    </fieldset>
  )
}
