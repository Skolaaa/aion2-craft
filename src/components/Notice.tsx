import type { ReactNode } from 'react'
import { Button } from './Button.tsx'
import { Glyph } from './Glyph.tsx'

interface Props {
  title: string
  children?: ReactNode
  detail?: string | null
  onRetry(): void
}

export function Notice({ title, children, detail, onRetry }: Props) {
  return (
    <div className="notice" role="status">
      <div className="notice-text">
        <p className="notice-title">{title}</p>
        {children && <p>{children}</p>}
        {detail && <p className="meta">{detail}</p>}
      </div>
      <Button onClick={onRetry}><Glyph name="refresh" />Try again</Button>
    </div>
  )
}

export const WorldsFailed = ({ message, onRetry, children }: { message: string; onRetry(): void; children: ReactNode }) => (
  <Notice title="The world list did not load" detail={message} onRetry={onRetry}>{children}</Notice>
)
