import { catalogFor } from './data/catalog.ts'
import { planCraft } from './domain/planCraft.ts'
import { makePriceBook } from './domain/priceBook.ts'
import type { Mastery } from './domain/types.ts'

const TARGET = 110130013
const MASTERY: Mastery = { Blacksmithing: 100, Tailoring: 100, Jewelcrafting: 100, Alchemy: 100, Cooking: 100 }

export function App() {
  const world = catalogFor('Light')
  const prices = makePriceBook({ manual: new Map(), market: new Map(), npc: world.npcPrices })
  const plan = planCraft({
    target: { itemId: TARGET, quantity: 1 },
    mastery: MASTERY,
    options: { allowCraft: true, allowMorph: true, byproductCredit: false, taxRate: 0.05 },
    world,
    prices,
  })
  const steps = []
  for (let step = plan?.root; step; ) {
    steps.push(step)
    const previous = step.materials.find((m) => m.acquisition.method === 'craft' && m.acquisition.step.wantCombo)
    step = previous?.acquisition.method === 'craft' ? previous.acquisition.step : undefined
  }
  return (
    <main>
      <h1>{world.items.get(TARGET)?.name}</h1>
      <ul>
        {steps.map((s) => (
          <li key={s.recipeId}>
            recipe {s.recipeId}: success {s.successRate}, attempts {s.attempts.toFixed(4)}
          </li>
        ))}
      </ul>
      <p>Missing prices for {plan?.missing.length} items.</p>
    </main>
  )
}
