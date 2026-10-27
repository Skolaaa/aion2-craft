import type { ReactNode } from 'react'
import type { Segment } from '../state/answer.ts'

interface Props {
  label: string
  value: string | null
  empty: string
  tone?: string
  children: ReactNode
}

/** The Kina amounts and the tax percent of a sentence in mono, the rest as plain text. */
export const typeset = (segments: readonly Segment[]) =>
  segments.map((segment, index) => (segment.kind === 'text' ? segment.text : <span className="mono" key={index}>{segment.text}</span>))

/** One cell of the figure strip under an answer: label, the amount or why there is none, and a note. */
export function Figure({ label, value, empty, tone, children }: Props) {
  return (
    <div className="figure">
      <dt className="figure-label">{label}</dt>
      <dd className={`figure-value ${value === null ? 'is-empty' : (tone ?? '')}`}>{value ?? empty}</dd>
      <dd className="figure-note meta">{children}</dd>
    </div>
  )
}
