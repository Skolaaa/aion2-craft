import type { Mastery } from '../domain/types.ts'
import { MAX_MASTERY, PROFESSIONS, type SetupPatch } from '../state/setup.ts'
import { NumberInput } from './NumberInput.tsx'

export function MasteryForm({ mastery, patch }: { mastery: Mastery; patch(change: SetupPatch): void }) {
  const set = (id: keyof Mastery, value: number) => patch({ mastery: { ...mastery, [id]: Math.round(value) } })
  return (
    <div className="stack">
      <p className="meta">Your level in each profession. A recipe above it cannot be crafted.</p>
      {PROFESSIONS.map(({ id, label, inGame }, index) => (
        <div className="mastery-row" key={id}>
          <label className="mastery-label" htmlFor={`mastery-${id}`} id={`mastery-${id}-label`}>
            {label}
            {inGame && <span className="meta">{inGame} in game</span>}
          </label>
          <NumberInput
            id={`mastery-${id}`}
            value={mastery[id]}
            min={0}
            max={MAX_MASTERY}
            initialFocus={index === 0}
            onChange={(value) => set(id, value)}
          />
          <input
            type="range"
            className="mastery-slider"
            min={0}
            max={MAX_MASTERY}
            step={1}
            value={mastery[id]}
            aria-labelledby={`mastery-${id}-label`}
            onChange={(event) => set(id, event.target.valueAsNumber)}
          />
        </div>
      ))}
    </div>
  )
}
