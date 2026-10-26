const WHOLE = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const FIXED2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const NA = 'n/a'
export const MINUS = '−'
export const STALE_AFTER_MS = 3 * 60 * 60 * 1000

export const isNum = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value)

export const kina = (value: number | null | undefined) => (isNum(value) ? WHOLE.format(Math.round(value)) : NA)

export function signedKina(value: number | null | undefined) {
  if (!isNum(value)) return NA
  const rounded = Math.round(value)
  return `${rounded < 0 ? MINUS : rounded > 0 ? '+' : ''}${WHOLE.format(Math.abs(rounded))}`
}

export function percent(fraction: number | null | undefined, digits = 1, signed = false) {
  if (!isNum(fraction)) return NA
  const text = Math.abs(fraction * 100).toFixed(digits)
  const sign = Number(text) === 0 ? '' : fraction < 0 ? MINUS : signed ? '+' : ''
  return `${sign}${text}%`
}

export const rate = (fraction: number) => `${(fraction * 100).toFixed(2)}%`

export const expected = (value: number) => (Number.isInteger(value) ? WHOLE.format(value) : FIXED2.format(value))

export const attemptsText = (value: number) => `${expected(value)} ${value === 1 ? 'attempt' : 'attempts'}`

// The exchange sends six fractional digits, which not every engine parses.
export const timeOf = (iso: string) => Date.parse(iso.replace(/(\.\d{3})\d+/, '$1'))

export function ago(iso: string | null | undefined, now: number) {
  if (!iso) return 'never'
  const seconds = Math.max(0, (now - timeOf(iso)) / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 90) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 36) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}

export const isStale = (iso: string | null | undefined, now: number) => !!iso && now - timeOf(iso) > STALE_AFTER_MS

// Accepts 1200, 1,200, 1.2k and 1.2m.
export function parseKina(text: string): number | null {
  const match = /^(\d+(?:\.\d+)?)([km]?)$/.exec(text.trim().toLowerCase().replace(/[,\s_]/g, ''))
  if (!match) return null
  const scale = match[2] === 'k' ? 1e3 : match[2] === 'm' ? 1e6 : 1
  const value = Math.round(Number(match[1]) * scale)
  return value > 0 && Number.isSafeInteger(value) ? value : null
}
