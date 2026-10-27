import type { CSSProperties, ReactNode } from 'react'
import type { Item } from '../domain/types.ts'
import { ItemIcon } from './ItemIcon.tsx'

interface Props {
  item: Item | undefined
  meta?: ReactNode
  narrowMeta?: ReactNode
  depth?: number
  toggle?: ReactNode
  onOpen?(): void
}

export function ItemCell({ item, meta, narrowMeta, depth, toggle, onOpen }: Props) {
  const name = item?.name ?? 'Unknown item'
  const style = depth === undefined ? undefined : ({ '--depth': depth } as CSSProperties)
  return (
    <div className={`item-cell ${depth === undefined ? '' : 'is-tree'}`} style={style} data-grade={item?.grade}>
      {depth !== undefined && (toggle ?? <span className="toggle-gap" />)}
      <ItemIcon item={item} />
      <div className="item-text">
        {onOpen ? (
          <button type="button" className="item-open" onClick={(event) => { event.stopPropagation(); onOpen() }}>{name}</button>
        ) : (
          <span className="item-name-cell">{name}</span>
        )}
        {(meta || narrowMeta) && (
          <span className="meta">
            {meta}
            {narrowMeta && <span className="show-narrow">{meta ? ', ' : ''}{narrowMeta}</span>}
          </span>
        )}
      </div>
    </div>
  )
}
