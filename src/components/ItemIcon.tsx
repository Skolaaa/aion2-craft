import { useState, type CSSProperties } from 'react'
import type { Item } from '../domain/types.ts'

export function ItemIcon({ item, size = 32 }: { item: Item | undefined; size?: 32 | 48 }) {
  const src = item?.icon ? `/a2t${item.icon}` : null
  const [failed, setFailed] = useState<string | null>(null)
  const style = { '--size': `${size}px` } as CSSProperties
  if (src === null || failed === src) return <span className="item-icon" style={style} aria-hidden="true" />
  return (
    <img
      className="item-icon"
      style={style}
      src={src}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(src)}
    />
  )
}
