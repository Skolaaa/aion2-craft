const WHOLE = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const MINUS = '−'

export const STALE_AFTER_MS = 3 * 60 * 60 * 1000

export const kina = (value: number) => WHOLE.format(Math.round(value))

export function signedKina(value: number) {
  const rounded = Math.round(value)
  return `${rounded < 0 ? MINUS : rounded > 0 ? '+' : ''}${WHOLE.format(Math.abs(rounded))}`
}

export function percent(fraction: number, digits = 1, signed = false) {
  const text = Math.abs(fraction * 100).toFixed(digits)
  const sign = Number(text) === 0 ? '' : fraction < 0 ? MINUS : signed ? '+' : ''
  return `${sign}${text}%`
}

// A fraction as the tenths of a percent it displays as, so a value shown as 0.0% counts as zero.
export const shownTenths = (fraction: number) => Math.round(fraction * 1000)

// Rounds the way the value is displayed (whole Kina, a tenth of a percent), so one shown as zero gets no tone.
export function toneOf(value: number | null, unit: 'kina' | 'fraction'): 'is-gain' | 'is-loss' | undefined {
  const shown = value === null ? 0 : unit === 'kina' ? Math.round(value) : shownTenths(value)
  return shown === 0 ? undefined : shown > 0 ? 'is-gain' : 'is-loss'
}

export function rate(fraction: number) {
  const text = (fraction * 100).toFixed(1)
  return `${text.endsWith('.0') ? text.slice(0, -2) : text}%`
}

export const decimal = (value: number, digits = 2) =>
  value.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(value) ? 0 : digits, maximumFractionDigits: digits }).replace('-', MINUS)

export const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

// The exchange sends six fractional digits, which not every engine parses.
export const timeOf = (iso: string) => Date.parse(iso.replace(/(\.\d{3})\d+/, '$1'))

export function age(iso: string, now: number) {
  const minutes = Math.max(0, (now - timeOf(iso)) / 60_000)
  if (minutes < 1) return 'less than a minute'
  if (minutes < 90) return `${Math.round(minutes)} min`
  const hours = Math.round(minutes / 60)
  return hours < 36 ? `${hours} h` : `${Math.round(hours / 24)} d`
}

export const isStale = (iso: string, now: number) => now - timeOf(iso) > STALE_AFTER_MS

export function parseKina(text: string): number | null {
  const match = /^(\d+(?:\.\d+)?)([km]?)$/.exec(text.trim().toLowerCase().replace(/[,\s_]/g, ''))
  if (!match) return null
  const scale = match[2] === 'k' ? 1e3 : match[2] === 'm' ? 1e6 : 1
  const value = Math.round(Number(match[1]) * scale)
  return value > 0 && Number.isSafeInteger(value) ? value : null
}

export const taxPercent = (taxRate: number) => Math.round(taxRate * 1000) / 10

export const taxLabel = (taxRate: number) => `${taxPercent(taxRate)}%`

const SHORT_DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export const shortDate = (isoDate: string) => SHORT_DATE.format(Date.parse(isoDate))
