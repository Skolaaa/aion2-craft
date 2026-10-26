import { useEffect, useState } from 'react'
import { fetchWorlds, type WorldList } from '../market/exchangeClient.ts'
import { messageOf } from './feedError.ts'

export type WorldsState =
  | { status: 'loading' }
  | { status: 'ready'; data: WorldList }
  | { status: 'failed'; message: string }

export function useWorlds() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<WorldsState>({ status: 'loading' })
  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    fetchWorlds().then(
      (data) => {
        if (live) setState({ status: 'ready', data })
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
