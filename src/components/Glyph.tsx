const PATHS = {
  chevron: 'm4 6 4 4 4-4',
  refresh: 'M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.5H10',
  arrow: 'M8 3v10m-4-4 4 4 4-4',
  link: 'M6.7 8.7a3.3 3.3 0 0 0 5 .4l2-2A3.3 3.3 0 0 0 9 2.4L7.8 3.5M9.3 7.3a3.3 3.3 0 0 0-5-.4l-2 2A3.3 3.3 0 0 0 7 13.6l1.1-1.1',
  check: 'm3.5 8.5 3 3 6-7',
  external: 'M6.5 3.5h-2A1.5 1.5 0 0 0 3 5v6.5A1.5 1.5 0 0 0 4.5 13H11a1.5 1.5 0 0 0 1.5-1.5v-2M9.5 2.5h4v4M13.5 2.5l-6 6',
} as const

type GlyphName = keyof typeof PATHS

export function Glyph({ name, className }: { name: GlyphName; className?: string }) {
  return (
    <svg className={`glyph ${className ?? ''}`} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
