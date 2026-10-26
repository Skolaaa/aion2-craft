// The only three glyphs the UI draws. Everything else is a word or a game icon.
const PATHS = {
  search: 'M7 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11Zm4-1.5 3.5 3.5',
  chevron: 'm4 6 4 4 4-4',
  refresh: 'M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.5H10',
} as const

export type GlyphName = keyof typeof PATHS

export function Glyph({ name, className }: { name: GlyphName; className?: string }) {
  return (
    <svg className={`glyph ${className ?? ''}`} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
