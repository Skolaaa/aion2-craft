import { taxPercent } from '../state/format.ts'
import type { SetupPatch } from '../state/setup.ts'
import { NumberInput } from './NumberInput.tsx'

export function TaxForm({ taxRate, patch }: { taxRate: number; patch(change: SetupPatch): void }) {
  return (
    <div className="stack">
      <div className="tax-row">
        <label className="label" htmlFor="tax">Tax in percent</label>
        <NumberInput
          id="tax"
          describedBy="tax-hint"
          value={taxPercent(taxRate)}
          min={0}
          max={50}
          step={0.1}
          initialFocus
          onChange={(value) => patch({ taxRate: value / 100 })}
        />
      </div>
      <div className="stack-tight meta" id="tax-hint">
        <p>Market screen in game, top right.</p>
        <p>Lowers what a sale pays out, so it moves the margin.</p>
      </div>
    </div>
  )
}
