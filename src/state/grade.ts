import type { Grade } from '../domain/types.ts'

// The game's own grade table, as NCSoft's icon index ships it (aion2.exchange/item-icons/index.json).
// Keys are NC's internal ids, which the catalog stores; `name` is what the Global client prints.
export const GRADE: Readonly<Record<Grade, { name: string; colour: string }>> = {
  Common: { name: 'Common', colour: '#C3C3C3' },
  Rare: { name: 'Rare', colour: '#19E048' },
  Legend: { name: 'Epic', colour: '#379AFF' },
  Unique: { name: 'Unique', colour: '#FFD02B' },
  Epic: { name: 'Heroic', colour: '#FF6C00' },
  Mythic: { name: 'Mythic', colour: '#FF3245' },
  Special: { name: 'Special', colour: '#00FFD8' },
}

export const gradeName = (grade: Grade): string => GRADE[grade].name

export const gradeRules = () =>
  Object.entries(GRADE)
    .map(([grade, { colour }]) => `[data-grade='${grade}'] { --grade: ${colour}; }`)
    .join('\n')
