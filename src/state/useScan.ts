import { useDeferredValue, useMemo } from 'react'
import type { Planning } from './planning.ts'
import { scanCraftables, type ScanRow } from './scan.ts'

// Planning every recipe is slow, so the scan follows a deferred planning and a slider tick or keystroke renders before it catches up.
export function useScan(planning: Planning): ScanRow[] {
  const deferred = useDeferredValue(planning)
  return useMemo(() => scanCraftables(deferred), [deferred])
}
