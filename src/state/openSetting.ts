import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export type Setting =
  | { kind: 'world'; from: 'region' | 'world' }
  | { kind: 'mastery' }
  | { kind: 'tax' }
  | { kind: 'plan' }

export interface Opened {
  setting: Setting
  anchor: HTMLElement
}

export interface OpenSetting {
  opened: Opened | null
  open(setting: Setting, anchor: HTMLElement): void
  close(focusAnchor?: boolean): void
}

export const settingKey = (setting: Setting) => (setting.kind === 'world' ? `world-${setting.from}` : setting.kind)

// One value says which setting is open, so two can never be open together. Focus goes back to the
// chip after its surface has left the DOM, since a modal surface keeps the chip inert until then.
export function useOpenSetting(): OpenSetting {
  const [opened, setOpened] = useState<Opened | null>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (opened !== null) return
    returnTo.current?.focus()
    returnTo.current = null
  }, [opened])

  const close = useCallback(
    (focusAnchor = true) => {
      if (opened && focusAnchor) returnTo.current = opened.anchor
      setOpened(null)
    },
    [opened],
  )

  const open = useCallback(
    (setting: Setting, anchor: HTMLElement) => {
      if (opened?.anchor === anchor) close()
      else setOpened({ setting, anchor })
    },
    [opened, close],
  )

  return { opened, open, close }
}
