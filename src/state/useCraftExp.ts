import type { RecipeId } from '../domain/types.ts'
import { useItemMap } from './useItemMap.ts'
import { isFiniteNumber, type Parse } from './usePersistentState.ts'

const MAX_EXP = 99_999

/** A whole number of EXP from 1 to 99,999, as the craft log shows it. */
export const parseExp: Parse<number> = (raw) => (isFiniteNumber(raw) && Number.isInteger(raw) && raw >= 1 && raw <= MAX_EXP ? raw : null)

export interface CraftExp {
  yours: ReadonlyMap<RecipeId, number>
  save(recipeId: RecipeId, exp: number | null): void
}

/** The EXP the player saw one craft give, per recipe, kept game-wide rather than per world because the game grants the same EXP everywhere. */
export function useCraftExp(): CraftExp {
  const { values, save } = useItemMap('craftExp', parseExp)
  return { yours: values, save }
}
