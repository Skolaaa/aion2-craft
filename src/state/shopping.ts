import type { ItemId, PlanResult } from '../domain/types.ts'
import type { BuyList } from './answer.ts'
import { kina } from './format.ts'

export interface ShoppingNames {
  itemName(itemId: ItemId): string
  worldName: string
  link: string
}

const units = (count: number) => Math.ceil(count - 1e-9)

/**
 * The buy table as plain text for a chat message. Counts are whole units, rounded up,
 * so the Kina on each line is what buying that many costs, not the expected value.
 */
export function shoppingText(plan: PlanResult, { lines, credit }: BuyList, { itemName, worldName, link }: ShoppingNames): string {
  const out: string[] = [`What to buy for ${plan.target.quantity} × ${itemName(plan.target.itemId)} on ${worldName}`]
  let total = 0
  const held = lines.filter((line) => line.kind === 'owned')
  for (const line of lines) {
    if (line.kind === 'owned') continue
    const count = units(line.expected - line.owned)
    const have = line.owned > 0 ? `, have ${units(line.owned)}` : ''
    if (line.kind === 'missing') out.push(`  ${count} × ${itemName(line.itemId)}: no price yet${have}`)
    else {
      const cost = count * line.unit
      total += cost
      out.push(`  ${count} × ${itemName(line.itemId)}: ${kina(cost)} Kina at ${kina(line.unit)} each${have}`)
    }
  }
  if (lines.length === held.length) out.push('  Nothing, you have it all.')
  if (held.length > 0) {
    out.push('From your own stock')
    for (const line of held) out.push(`  ${units(line.expected)} × ${itemName(line.itemId)}`)
  }
  const expected = Number.isFinite(plan.cost) ? ` Expected crafting cost ${kina(plan.cost)} Kina at your mastery${credit > 0 ? ', leftovers credited' : ''}.` : ''
  out.push(`Total to buy ${kina(total)} Kina.${expected}`)
  out.push(link)
  return out.join('\n')
}
