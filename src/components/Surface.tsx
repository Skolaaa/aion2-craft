import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { Button } from './Button.tsx'

export type Placement = 'popover' | 'drawer'

const SHEET = '(max-width: 639.98px)'
const GAP = 4
const EDGE = 8

interface Props {
  anchor: HTMLElement
  placement: Placement
  title: string
  width?: number
  flush?: boolean
  // focusAnchor is false when the user moved on by clicking or tabbing elsewhere.
  onClose(focusAnchor: boolean): void
  children: ReactNode
  footer?: ReactNode
}

const inside = (node: EventTarget | null, ...parents: HTMLElement[]) => node instanceof Node && parents.some((parent) => parent.contains(node))

// A popover on a wide screen is non-modal, so one click moves from one setting to the next and the
// page stays readable. The sheet and the drawer are modal. Mounted only while open.
export function Surface({ anchor, placement, title, width = 320, flush = false, onClose, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const close = useRef(onClose)
  close.current = onClose

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const sheet = window.matchMedia(SHEET)
    const modal = placement === 'drawer' || sheet.matches

    const place = () => {
      const box = anchor.getBoundingClientRect()
      const left = Math.max(EDGE, Math.min(box.left, window.innerWidth - width - EDGE))
      dialog.style.setProperty('--surface-top', `${box.bottom + GAP}px`)
      dialog.style.setProperty('--surface-left', `${left}px`)
    }
    dialog.style.setProperty('--surface-width', `${width}px`)
    if (modal) dialog.showModal()
    else {
      place()
      dialog.show()
    }
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      close.current(true)
    }
    const onPointer = (event: PointerEvent) => {
      if (!inside(event.target, dialog, anchor)) close.current(false)
    }
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof HTMLElement && !inside(event.relatedTarget, dialog, anchor)) close.current(false)
    }
    const onCross = () => close.current(true)

    document.addEventListener('keydown', onKey)
    if (placement === 'popover') sheet.addEventListener('change', onCross)
    if (!modal) {
      document.addEventListener('pointerdown', onPointer, true)
      dialog.addEventListener('focusout', onFocusOut)
      window.addEventListener('resize', place)
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      sheet.removeEventListener('change', onCross)
      document.removeEventListener('pointerdown', onPointer, true)
      dialog.removeEventListener('focusout', onFocusOut)
      window.removeEventListener('resize', place)
      dialog.close()
    }
  }, [anchor, placement, width])

  return (
    <dialog
      ref={ref}
      className="surface"
      data-placement={placement}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose(true)
      }}
      // The content fills the dialog, so a click on the dialog itself landed on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose(true)
      }}
    >
      <header className="surface-head">
        <h2 className="surface-title" id={titleId}>{title}</h2>
        <Button className="button-small" onClick={() => onClose(true)}>Close</Button>
      </header>
      <div className={`surface-content ${flush ? 'is-flush' : ''}`}>{children}</div>
      {footer && <footer className="surface-foot">{footer}</footer>}
    </dialog>
  )
}
