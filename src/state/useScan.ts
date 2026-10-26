import { useDeferredValue, useMemo } from 'react'
import type { Planning } from './planning.ts'
import { scanCraftables, type ScanRow } from './scan.ts'

export function useScan(planning: Planning): ScanRow[] {
  const deferred = useDeferredValue(planning)
  return useMemo(() => scanCraftables(deferred), [deferred])
}
