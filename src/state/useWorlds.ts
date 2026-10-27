import { useEffect, useState } from 'react'
import { fetchWorlds } from '../market/exchangeClient.ts'
import type { WorldDirectory } from '../market/worlds.ts'
import { messageOf } from './feedError.ts'

export type WorldsState =
  | { status: 'loading' }
  | { status: 'ready'; directory: WorldDirectory }
  | { status: 'failed'; message: string }

export const readyDirectory = (state: WorldsState): WorldDirectory | null => (state.status === 'ready' ? state.directory : null)

export function useWorlds() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<WorldsState>({ status: 'loading' })
  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    fetchWorlds().then(
      (directory) => {
        if (live) setState({ status: 'ready', directory })
      },
      (error: unknown) => {
        if (live) setState({ status: 'failed', message: messageOf(error) })
      },
    )
    return () => {
      live = false
    }
  }, [attempt])
  return { state, retry: () => setAttempt((n) => n + 1) }
}
