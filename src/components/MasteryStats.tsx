import type { CSSProperties, ReactNode } from 'react'
import type { Mastery } from '../domain/types.ts'
import { taxPercent } from '../state/format.ts'
import { MAX_MASTERY } from '../domain/types.ts'
import { PROFESSIONS, type SetupPatch } from '../state/setup.ts'
import { NumberInput } from './NumberInput.tsx'

interface StatProps {
  inputId: string
  label: string
  note?: string
  unit: ReactNode
  input: ReactNode
  children?: ReactNode
}

function Stat({ inputId, label, note, unit, input, children }: StatProps) {
  return (
    <div className="stat">
      <div className="stat-name">
        <label htmlFor={inputId} id={`${inputId}-label`}>{label}</label>
        {note && <span className="meta" id={`${inputId}-hint`}>{note}</span>}
      </div>
      <div className="stat-big">
        {input}
        <small>{unit}</small>
      </div>
      {children}
    </div>
  )
}

interface MasteryProps {
  mastery: Mastery
  patch(change: SetupPatch): void
}

export function MasteryStats({ mastery, patch }: MasteryProps) {
  const set = (id: keyof Mastery, value: number) => patch({ mastery: { ...mastery, [id]: Math.round(value) } })
  return (
    <fieldset className="settings-group">
      <legend className="section-title"><span>Mastery</span></legend>
      <p className="meta">
        Your level in each profession, 0 to {MAX_MASTERY}. Drag the bar or type the number. A recipe above your level cannot be crafted.
      </p>
      {PROFESSIONS.map(({ id, label, inGame }) => {
        const inputId = `mastery-${id}`
        return (
          <Stat
            key={id}
            inputId={inputId}
            label={label}
            note={inGame ? `${inGame} in game` : undefined}
            unit={`of ${MAX_MASTERY}`}
            input={<NumberInput id={inputId} value={mastery[id]} min={0} max={MAX_MASTERY} onChange={(value) => set(id, value)} />}
          >
            <input
              type="range"
              className="level-track"
              style={{ '--fill': `${(mastery[id] / MAX_MASTERY) * 100}%` } as CSSProperties}
              min={0}
              max={MAX_MASTERY}
              step={1}
              value={mastery[id]}
              aria-labelledby={`${inputId}-label`}
              onChange={(event) => set(id, event.target.valueAsNumber)}
            />
          </Stat>
        )
      })}
    </fieldset>
  )
}

interface TaxProps {
  taxRate: number
  patch(change: SetupPatch): void
}

export function TaxStat({ taxRate, patch }: TaxProps) {
  return (
    <fieldset className="settings-group">
      <legend className="section-title"><span>Market tax</span></legend>
      <Stat
        inputId="tax"
        label="Tax on each sale"
        note="Market screen in game, top right. Lowers what a sale pays out, so it moves the margin."
        unit="%"
        input={<NumberInput id="tax" describedBy="tax-hint" value={taxPercent(taxRate)} min={0} max={50} step={0.1} onChange={(value) => patch({ taxRate: value / 100 })} />}
      />
    </fieldset>
  )
}
