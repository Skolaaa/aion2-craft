import { useState } from 'react'
import type { Item } from '../domain/types.ts'

export function ItemIcon({ item, size = 32 }: { item: Item | undefined; size?: number }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }
  if (!item?.icon || failed) return <span className="item-icon item-icon-blank" style={style} aria-hidden="true" />
  return (
    <img
      className="item-icon"
      src={`/a2t${item.icon}`}
      style={style}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
