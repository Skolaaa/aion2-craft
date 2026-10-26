import type { ItemId } from '../domain/types.ts'
import type { Planning } from '../state/planning.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import { PriceForm } from './PriceForm.tsx'
import { kina } from './format.ts'

export interface Editing {
  rowKey: string
  itemId: ItemId
}

interface Props {
  editing: Editing
  planning: Planning
  overrides: PriceOverrides
  onClose(): void
}

export function PriceEditor({ editing, planning, overrides, onClose }: Props) {
  const { itemId, rowKey } = editing
  const name = planning.catalog.items.get(itemId)?.name ?? String(itemId)
  const manual = overrides.prices.get(itemId)
  const quote = planning.prices.quote(itemId)
  const hint =
    manual !== undefined ? 'Reset to use the market or NPC price again.'
    : quote.kind === 'market' ? `Market lowest is ${kina(quote.unit)}.`
    : quote.kind === 'npc' ? `The NPC shop sells it for ${kina(quote.unit)}.`
    : 'There is no market or NPC price on record.'
  return (
    <PriceForm
      id={`edit-${rowKey.replace(/[^\w-]/g, '-')}`}
      label={<>Your price for <strong>{name}</strong>, per item</>}
      current={manual}
      hint={hint}
      autoFocus
      onSave={(price) => {
        overrides.set(itemId, price)
        onClose()
      }}
      onReset={() => {
        overrides.reset(itemId)
        onClose()
      }}
      onClose={onClose}
    />
  )
}
