import { useEffect, useState } from 'react'

type CopyState = 'idle' | 'copied' | 'failed'

/** Writes text to the clipboard and reports 'copied' for two seconds. Resolves false when the clipboard refuses. */
export function useClipboard() {
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (state !== 'copied') return
    const timer = setTimeout(() => setState('idle'), 2000)
    return () => clearTimeout(timer)
  }, [state])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
      return true
    } catch {
      setState('failed')
      return false
    }
  }

  return { state, copy }
}
