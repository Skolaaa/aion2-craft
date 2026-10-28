import mastery from './mastery.json'

/** `MASTERY_EXP[level - 1]` is the EXP from `level` to `level + 1`. 0 at the level 50 quest gate and at 100. */
export const MASTERY_EXP: readonly number[] = mastery.expToNext
