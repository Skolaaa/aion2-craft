const GLYPHS = {
  chevron: 'M6 3.5 10.5 8 6 12.5',
  refresh: 'M13 8a5 5 0 1 1-1.5-3.55M13 2.5v3h-3',
  pencil: 'M10.5 2.5 13.5 5.5 5 14H2v-3z',
  undo: 'M3.5 6.5h6a3.5 3.5 0 0 1 0 7H6M6 3.5 3.5 6.5 6 9.5',
  search: 'M7 12.2A5.2 5.2 0 1 0 7 1.8a5.2 5.2 0 0 0 0 10.4ZM10.8 10.8 14.2 14.2',
  alert: 'M8 2 14.5 13.5h-13ZM8 6.5v3M8 11.6v.2',
  info: 'M8 14.2A6.2 6.2 0 1 0 8 1.8a6.2 6.2 0 0 0 0 12.4ZM8 7.2v4M8 4.9v.2',
  close: 'M4 4 12 12M12 4 4 12',
  up: 'M8 13V3M4 7l4-4 4 4',
  down: 'M8 3v10M4 9l4 4 4-4',
  sort: 'M5 6.5 8 3.5l3 3M5 9.5l3 3 3-3',
  mark: 'M8 1.5 14 8l-6 6.5L2 8ZM2 8h12M8 1.5 5.6 8 8 14.5 10.4 8Z',
} as const

export type GlyphName = keyof typeof GLYPHS

export function Icon({ name, size = 16 }: { name: GlyphName; size?: number }) {
  return (
    <svg className="glyph" viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false">
      <path d={GLYPHS[name]} />
    </svg>
  )
}
