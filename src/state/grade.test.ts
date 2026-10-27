import { describe, expect, it } from 'vitest'
import recipes from '../data/recipes.json'
import { parseGrade } from '../domain/catalog.ts'
import { GRADE_COLOUR, gradeRules } from './grade.ts'
import { contrast, HEAT_BASE } from './heat.ts'

describe('grades', () => {
  it('reads every grade the bundled catalog uses without falling back', () => {
    const used = new Set(Object.values(recipes.items).map((item) => item.grade))
    for (const grade of used) expect(parseGrade(grade), grade).toBe(grade)
  })

  it('falls back to Common for a grade it does not know', () => {
    expect(parseGrade('Mythic')).toBe('Common')
    expect(parseGrade('toString')).toBe('Common')
  })

  it('writes one data-grade rule per colour', () => {
    const rules = gradeRules().split('\n')
    expect(rules).toHaveLength(Object.keys(GRADE_COLOUR).length)
    expect(rules).toContain("[data-grade='Epic'] { --grade: #FF6B6B; }")
    expect(rules).toContain("[data-grade='Special'] { --grade: #7FE0D6; }")
  })

  it('keeps every grade colour at 4.5:1 on the page', () => {
    for (const [grade, colour] of Object.entries(GRADE_COLOUR)) {
      expect(contrast(colour, HEAT_BASE), grade).toBeGreaterThanOrEqual(4.5)
    }
  })
})
