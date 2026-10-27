import type { CSSProperties, ReactNode } from 'react'
import type { Item } from '../domain/types.ts'
import { Glyph } from './Glyph.tsx'
import { ItemIcon } from './ItemIcon.tsx'

interface Props {
  item: Item | undefined
  meta?: ReactNode
  narrowMeta?: ReactNode
  controls?: ReactNode
  depth?: number
  toggle?: ReactNode
  href?: string
  onOpen?(): void
}

export function ItemCell({ item, meta, narrowMeta, controls, depth, toggle, href, onOpen }: Props) {
  const name = item?.name ?? 'Unknown item'
  const style = depth === undefined ? undefined : ({ '--depth': depth } as CSSProperties)
  const nameNode = onOpen ? (
    <button type="button" className="item-open" onClick={(event) => { event.stopPropagation(); onOpen() }}>{name}</button>
  ) : (
    <span className="item-name-cell">{name}</span>
  )
  const where = `Where to get ${name}, on AION2 Hub`
  return (
    <div className={`item-cell ${depth === undefined ? '' : 'is-tree'}`} style={style} data-grade={item?.grade}>
      {depth !== undefined && (toggle ?? <span className="toggle-gap" />)}
      <ItemIcon item={item} />
      <div className="item-text">
        {href ? (
          <span>
            {nameNode}
            <a className="item-link" href={href} target="_blank" rel="noreferrer" aria-label={where} title={where} onClick={(event) => event.stopPropagation()}>
              <Glyph name="external" />
            </a>
          </span>
        ) : (
          nameNode
        )}
        {(meta || narrowMeta) && (
          <span className="meta">
            {meta}
            {narrowMeta && <span className="show-narrow">{meta ? ', ' : ''}{narrowMeta}</span>}
          </span>
        )}
        {controls}
      </div>
    </div>
  )
}
