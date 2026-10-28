import { MAX_EXP, parseExp } from '../state/useCraftExp.ts'
import { NumberCell } from './NumberCell.tsx'

interface Props {
  recipeName: string
  /** What the route uses: the player's value, else the measured one. */
  exp: number | null
  /** The player entered `exp`, as against a measured value. */
  yours: boolean
  onSave(exp: number | null): void
}

const parseExpText = (text: string) => {
  const value = Math.floor(Number(text))
  return text.trim() === '' || value === 0 ? null : parseExp(value)
}

/** The mastery EXP one craft gives. Empty or zero clears the player's value, so the measured one shows again. */
export function ExpCell({ recipeName, exp, yours, onSave }: Props) {
  return <NumberCell className="input-exp" label={`Mastery EXP one craft of ${recipeName} gives`} placeholder="enter" max={MAX_EXP} shown={exp} current={yours ? exp : null} parse={parseExpText} onSave={onSave} />
}
