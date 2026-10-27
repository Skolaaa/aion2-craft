import { useState } from 'react'
import type { Item } from '../domain/types.ts'

export function ItemIcon({ item, size = 28 }: { item: Item | undefined; size?: 28 | 48 }) {
  const src = item?.icon ? `/a2t${item.icon}` : null
  const [failed, setFailed] = useState<string | null>(null)
  const box = { width: size, height: size }
  if (src === null || failed === src) return <span className="item-icon" style={box} data-grade={item?.grade} aria-hidden="true" />
  return (
    <img
      className="item-icon"
      style={box}
      src={src}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      decoding="async"
      data-grade={item?.grade}
      onError={() => setFailed(src)}
    />
  )
}
