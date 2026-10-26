import type { PlanResult } from '../domain/types.ts'
import type { Planning } from '../state/planning.ts'
import type { PriceOverrides } from '../state/useOverrides.ts'
import { Icon } from './Icon.tsx'
import { ItemIcon } from './ItemIcon.tsx'
import { PriceEditor, type Editing } from './PriceEditor.tsx'
import { expected, kina } from './format.ts'

interface Props {
  plan: PlanResult
  planning: Planning
  overrides: PriceOverrides
  editing: Editing | null
  onEdit(editing: Editing | null): void
}

export function ShoppingList({ plan, planning, overrides, editing, onEdit }: Props) {
  const total = plan.shopping.reduce((sum, line) => sum + line.subtotal, 0)

  return (
    <section className="panel shopping" aria-labelledby="shopping-title">
      <div className="panel-head">
        <h2 className="panel-title" id="shopping-title">Shopping list</h2>
        <p className="panel-total num">{kina(total)} <span className="unit">Kina</span></p>
      </div>
      {plan.shopping.length === 0 ? (
        <p className="empty-line">Nothing to buy. Every material is crafted, or still needs a price.</p>
      ) : (
        <ul className="shop-list">
          {plan.shopping.map((line) => {
            const item = planning.catalog.items.get(line.itemId)
            const rowKey = `shop:${line.itemId}`
            const isEditing = editing?.rowKey === rowKey
            const manual = overrides.prices.has(line.itemId)
            return (
              <li className="shop-item" key={line.itemId}>
                <div className="shop-row">
                  <span className="shop-bar" style={{ width: `${total > 0 ? (line.subtotal / total) * 100 : 0}%` }} aria-hidden="true" />
                  <ItemIcon item={item} size={28} />
                  <span className="shop-name">{item?.name ?? line.itemId}</span>
                  <span className="shop-count num">{expected(line.expected)}</span>
                  <span className={`shop-unit num ${manual ? 'is-manual' : ''}`}>
                    {kina(line.unit)}
                    {manual && <span className="tag">your price</span>}
                  </span>
                  <span className="shop-sum num">{kina(line.subtotal)}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Set your price for ${item?.name ?? line.itemId}`}
                    aria-expanded={isEditing}
                    onClick={() => onEdit(isEditing ? null : { rowKey, itemId: line.itemId })}
                  >
                    <Icon name="pencil" size={14} />
                  </button>
                </div>
                {isEditing && editing && (
                  <div className="edit-row">
                    <PriceEditor editing={editing} planning={planning} overrides={overrides} onClose={() => onEdit(null)} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
