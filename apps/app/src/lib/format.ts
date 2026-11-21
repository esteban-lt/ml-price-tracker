import type { ThresholdType } from './api/types'

const currencyFormatters = new Map<string, Intl.NumberFormat>()

/** $5,499.00 */
export function formatPrice(value: number, currency = 'MXN') {
  let formatter = currencyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    currencyFormatters.set(currency, formatter)
  }
  return formatter.format(value)
}

const percentFormatter = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 })

/** "15 %" */
export function formatPercent(value: number) {
  return `${percentFormatter.format(value)} %`
}

/** Discount between the original and the current price, rounded: 21 for -21 %. */
export function discountPercent(price: number, originalPrice: number | null | undefined) {
  if (!originalPrice || originalPrice <= price) return null
  return Math.round((1 - price / originalPrice) * 100)
}

/** "3 vendedores" / "1 vendedor" */
export function formatSellers(count: number) {
  return `${count} ${count === 1 ? 'vendedor' : 'vendedores'}`
}

/** Target price of a percentage drop, rounded to cents exactly like the backend. */
export function targetFromPercentage(referencePrice: number, percentage: number) {
  return Math.round(referencePrice * (1 - percentage / 100) * 100) / 100
}

/** Price that triggers the alert, or null when it can't be known (percentage without reference). */
export function targetPrice(type: ThresholdType, value: number, referencePrice: number | null) {
  if (type === 'price_below') return value
  return referencePrice == null ? null : targetFromPercentage(referencePrice, value)
}

/** "Avísame si baja de $4,999.99" / "Avísame si baja 15 %" */
export function describeThreshold(type: ThresholdType, value: number, currency = 'MXN') {
  return type === 'price_below'
    ? `Avísame si baja de ${formatPrice(value, currency)}`
    : `Avísame si baja ${formatPercent(value)}`
}

const absoluteFormatter = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const dayFormatter = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
const relativeFormatter = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })

/** "26 oct 2026, 12:00" in the user's time zone. */
export function formatDateTime(iso: string) {
  return absoluteFormatter.format(new Date(iso)).replace(/(\p{L}{3,})\./u, '$1')
}

/** "26 oct 2026" */
export function formatDate(iso: string) {
  return dayFormatter.format(new Date(iso)).replace(/(\p{L}{3,})\./u, '$1')
}

/** "hace 3 horas", "ayer"… falls back to the absolute date after a week. */
export function formatRelative(iso: string, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return 'hace un momento'
  if (abs < 3600) return relativeFormatter.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relativeFormatter.format(Math.round(seconds / 3600), 'hour')
  if (abs < 7 * 86400) return relativeFormatter.format(Math.round(seconds / 86400), 'day')
  return formatDate(iso)
}
