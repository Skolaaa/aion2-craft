import type { Grade } from '../domain/types.ts'

export const GRADE_COLOUR: Readonly<Record<Grade, string>> = {
  Common: '#D9D9D9',
  Rare: '#5FB4FF',
  Legend: '#D08BFF',
  Unique: '#FFB347',
  Epic: '#FF6B6B',
  Special: '#7FE0D6',
}

export const gradeRules = () =>
  Object.entries(GRADE_COLOUR)
    .map(([grade, colour]) => `[data-grade='${grade}'] { --grade: ${colour}; }`)
    .join('\n')
