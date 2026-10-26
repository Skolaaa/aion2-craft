import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button.tsx'

interface Props {
  open: boolean
  title: string
  onClose(): void
  children: ReactNode
  footer?: ReactNode
}

export function Dialog({ open, title, onClose, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      // The body fills the dialog, so a click that lands on the dialog itself is on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog-body">
        <header className="dialog-head">
          <h2 className="section-title" id={titleId}>{title}</h2>
          <Button onClick={onClose}>Close</Button>
        </header>
        {open && children}
        {footer && <footer className="dialog-foot">{footer}</footer>}
      </div>
    </dialog>
  )
}
