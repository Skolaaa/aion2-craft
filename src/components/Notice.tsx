import type { ReactNode } from 'react'

interface Props {
  title: string
  children?: ReactNode
  detail?: string | null
  action?: ReactNode
}

export function Notice({ title, children, detail, action }: Props) {
  return (
    <div className="notice" role="status">
      <div className="notice-text">
        <p className="notice-title">{title}</p>
        {children && <p>{children}</p>}
        {detail && <p className="meta">{detail}</p>}
      </div>
      {action}
    </div>
  )
}
