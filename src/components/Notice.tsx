import type { ReactNode } from 'react'

export function Notice({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="notice" role="status">
      <div className="notice-text">
        <p className="notice-title">{title}</p>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  )
}
