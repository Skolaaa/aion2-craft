import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'

interface Props {
  tone: 'info' | 'warn' | 'error'
  title: string
  children?: ReactNode
  actions?: ReactNode
  live?: boolean
}

export function Notice({ tone, title, children, actions, live = false }: Props) {
  return (
    <div className={`notice notice-${tone}`} role={live ? (tone === 'error' ? 'alert' : 'status') : undefined}>
      <span className="notice-mark"><Icon name={tone === 'info' ? 'info' : 'alert'} size={18} /></span>
      <div className="notice-body">
        <p className="notice-title">{title}</p>
        {children && <div className="notice-text">{children}</div>}
      </div>
      {actions && <div className="notice-actions">{actions}</div>}
    </div>
  )
}
