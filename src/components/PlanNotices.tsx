import type { PlanResult } from '../domain/types.ts'
import type { Planning } from '../state/planning.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import { ItemIcon } from './ItemIcon.tsx'
import { Notice } from './Notice.tsx'
import { PriceForm } from './PriceForm.tsx'
import { Icon } from './Icon.tsx'
import { kina } from './format.ts'

interface Props {
  plan: PlanResult
  planning: Planning
  overrides: PriceOverrides
}

export function PlanNotices({ plan, planning, overrides }: Props) {
  const { catalog, mastery } = planning
  const blocked = plan.blocked.flatMap((id) => catalog.recipes.get(id) ?? [])
  const missing = plan.missing.flatMap((id) => catalog.items.get(id) ?? [])
  const target = catalog.items.get(plan.target.itemId)
  const ownPrice = overrides.prices.get(plan.target.itemId)

  return (
    <>
      {blocked.length > 0 && (
        <Notice tone="warn" title={blocked.length === 1 ? 'One step needs more mastery' : `${blocked.length} steps need more mastery`}>
          <ul className="notice-list">
            {blocked.map((recipe) => (
              <li key={recipe.id}>
                <strong>{recipe.name}</strong> needs {recipe.profession} mastery {recipe.masteryLevel}.
                {recipe.profession && ` You have ${mastery[recipe.profession]}.`}
              </li>
            ))}
          </ul>
          <p>Raise the mastery under Your setup to price this item.</p>
        </Notice>
      )}
      {missing.length > 0 && (
        <Notice
          tone="warn"
          title={missing.length === 1 ? 'One material has no price' : `${missing.length} materials have no price`}
        >
          <p>The total stays blank until each one has a price. Enter what it costs you in game.</p>
          <ul className="missing-list">
            {missing.map((item) => (
              <li key={item.id}>
                <PriceForm
                  id={`missing-${item.id}`}
                  label={<span className="missing-name"><ItemIcon item={item} size={24} />{item.name}</span>}
                  current={undefined}
                  onSave={(price) => overrides.set(item.id, price)}
                />
              </li>
            ))}
          </ul>
        </Notice>
      )}
      {target && plan.market === null && Number.isFinite(plan.cost) && (
        <Notice tone="info" title={`Add your own price for ${target.name}`}>
          <p>Nobody lists it on {planning.world.name}. Enter the price you expect and the margin appears. It applies only to this item.</p>
          <PriceForm
            id={`target-${target.id}`}
            label="Your price for one item"
            current={undefined}
            onSave={(price) => overrides.set(target.id, price)}
          />
        </Notice>
      )}
      {target && ownPrice !== undefined && (
        <Notice
          tone="info"
          title={`You set ${kina(ownPrice)} Kina as the market price`}
          actions={<button type="button" className="btn" onClick={() => overrides.reset(target.id)}><Icon name="undo" size={14} />Reset</button>}
        >
          <p>This replaces the Market listing for {target.name} in the margin and the verdict.</p>
        </Notice>
      )}
    </>
  )
}
