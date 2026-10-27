const PATHS = {
  chevron: 'm4 6 4 4 4-4',
  refresh: 'M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.5H10',
  arrow: 'M8 3v10m-4-4 4 4 4-4',
} as const

export type GlyphName = keyof typeof PATHS

export function Glyph({ name, className }: { name: GlyphName; className?: string }) {
  return (
    <svg className={`glyph ${className ?? ''}`} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
