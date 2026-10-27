import { useLayoutEffect, useRef, useState } from 'react'

export type Setting =
  | { kind: 'world'; from: 'region' | 'world' | 'first' }
  | { kind: 'mastery' }
  | { kind: 'tax' }
  | { kind: 'plan' }

export const SETTINGS = {
  region: { kind: 'world', from: 'region' },
  world: { kind: 'world', from: 'world' },
  first: { kind: 'world', from: 'first' },
  tax: { kind: 'tax' },
  mastery: { kind: 'mastery' },
  plan: { kind: 'plan' },
} as const satisfies Record<string, Setting>

interface Opened {
  setting: Setting
  anchor: HTMLElement
}

export interface OpenSetting {
  opened: Opened | null
  open(setting: Setting, anchor: HTMLElement): void
  close(focusAnchor?: boolean): void
}

export const settingKey = (setting: Setting) => (setting.kind === 'world' ? `world-${setting.from}` : setting.kind)

// Focus goes back to the chip after its surface has left the DOM, since a modal surface keeps the
// chip inert until then.
export function useOpenSetting(): OpenSetting {
  const [opened, setOpened] = useState<Opened | null>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (opened !== null) return
    returnTo.current?.focus()
    returnTo.current = null
  }, [opened])

  const close = (focusAnchor = true) => {
    if (opened && focusAnchor) returnTo.current = opened.anchor
    setOpened(null)
  }

  const open = (setting: Setting, anchor: HTMLElement) => {
    if (opened?.anchor === anchor) close()
    else setOpened({ setting, anchor })
  }

  return { opened, open, close }
}
