import { shownTenths } from './format.ts'

type Rgb = readonly [number, number, number]

const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16)
const rgbOf = (hex: string): Rgb => [channel(hex, 1), channel(hex, 3), channel(hex, 5)]
const hexOf = (rgb: Rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

const linear = (c: number) => {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

const luminance = ([r, g, b]: Rgb) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

export const contrast = (a: string, b: string) => ratio(luminance(rgbOf(a)), luminance(rgbOf(b)))

// The ramp lives here rather than in styles.css because the ink is picked against the composited
// background.
export const HEAT_BASE = '#121212'
const BASE = rgbOf(HEAT_BASE)
const FROM = rgbOf('#B35317')
const TO = rgbOf('#FFDC8F')
const ALPHA_MIN = 0.14
// Black and white keep 4.5:1 across the whole ramp. The --page and --text inks fall to 4.0:1 mid-ramp.
const BLACK = { ink: '#000000', luminance: 0 } as const
const WHITE = { ink: '#FFFFFF', luminance: 1 } as const

// Absolute rather than relative to the rows on screen, so +40% looks the same in the answer panel
// and the scanner.
export const HEAT_CAP = 1

interface Heat {
  background: string
  color: typeof BLACK.ink | typeof WHITE.ink
}

export function heatOf(marginPct: number | null): Heat | null {
  const shown = marginPct === null ? 0 : shownTenths(marginPct)
  if (shown <= 0) return null
  const t = Math.min(1, shown / 1000 / HEAT_CAP)
  const alpha = ALPHA_MIN + (1 - ALPHA_MIN) * t
  const [r, g, b] = mix(BASE, mix(FROM, TO, t), alpha)
  const rgb: Rgb = [Math.round(r), Math.round(g), Math.round(b)]
  const lit = luminance(rgb)
  return { background: hexOf(rgb), color: ratio(BLACK.luminance, lit) >= ratio(WHITE.luminance, lit) ? BLACK.ink : WHITE.ink }
}
