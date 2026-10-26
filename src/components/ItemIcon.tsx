import { useState } from 'react'
import type { Item } from '../domain/types.ts'

export function ItemIcon({ item, size = 32 }: { item: Item | undefined; size?: 32 | 48 }) {
  const src = item?.icon ? `/a2t${item.icon}` : null
  const [failed, setFailed] = useState<string | null>(null)
  const className = `item-icon item-icon-${size}`
  if (src === null || failed === src) return <span className={className} aria-hidden="true" />
  return (
    <img
      className={className}
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
