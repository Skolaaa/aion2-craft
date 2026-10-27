import { describe, expect, it } from 'vitest'
import recipes from '../data/recipes.json'
import { parseGrade } from '../domain/catalog.ts'
import { GRADE, gradeName, gradeRules } from './grade.ts'
import { contrast, HEAT_BASE } from './heat.ts'

describe('grades', () => {
  it('reads every grade the bundled catalog uses without falling back', () => {
    const used = new Set(Object.values(recipes.items).map((item) => item.grade))
    for (const grade of used) expect(parseGrade(grade), grade).toBe(grade)
  })

  it('falls back to Common for a grade it does not know', () => {
    expect(parseGrade('Fabled')).toBe('Common')
    expect(parseGrade('toString')).toBe('Common')
  })

  it("prints the Global client's names for NC's internal ids", () => {
    expect(gradeName('Legend')).toBe('Epic')
    expect(gradeName('Epic')).toBe('Heroic')
    expect(gradeName('Unique')).toBe('Unique')
  })

  it('writes one data-grade rule per grade, in the game colours', () => {
    const rules = gradeRules().split('\n')
    expect(rules).toHaveLength(Object.keys(GRADE).length)
    expect(rules).toContain("[data-grade='Rare'] { --grade: #19E048; }")
    expect(rules).toContain("[data-grade='Epic'] { --grade: #FF6C00; }")
  })

  it('keeps every grade colour at 4.5:1 on the page', () => {
    for (const [grade, { colour }] of Object.entries(GRADE)) {
      expect(contrast(colour, HEAT_BASE), grade).toBeGreaterThanOrEqual(4.5)
    }
  })
})
