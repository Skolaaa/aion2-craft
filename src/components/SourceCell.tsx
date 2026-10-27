import type { Alternative, Method } from '../domain/types.ts'
import { blockedNote } from '../state/answer.ts'
import type { Planning } from '../state/planning.ts'
import { Segmented } from './Segmented.tsx'

interface Props {
  itemName: string
  options: readonly Alternative[]
  value: Method
  planning: Planning
  onChange(method: Method): void
}

/** Buy, craft or morph for one line of the plan. A way the planner listed at Infinity is disabled and says why. */
export function SourceCell({ itemName, options, value, planning, onChange }: Props) {
  const segments = options.map((option) => ({
    value: option.method,
    label: option.method,
    disabled: !Number.isFinite(option.unit),
    title: option.method !== 'buy' && !Number.isFinite(option.unit) ? blockedNote(option, planning) : undefined,
  }))
  return <Segmented label={`How to get ${itemName}`} options={segments} value={value} onChange={onChange} />
}
