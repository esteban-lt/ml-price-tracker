import { ApiError } from './api/client'

/** Common messages from the screens guide (section 4.4). */
export const MESSAGES = {
  tooManyRequests: 'Hiciste muchos intentos seguidos. Espera un minuto e inténtalo de nuevo.',
  mercadoLibreDown: 'No pudimos conectar con Mercado Libre. Intenta de nuevo en unos minutos.',
  network: 'Revisa tu conexión a internet.',
  unexpected: 'Algo salió mal. Inténtalo de nuevo.',
} as const

/** True for 502/503 and Mercado Libre's own 429, which the guide shows as "service unavailable" (S3). */
export function isMercadoLibreUnavailable(error: unknown) {
  if (!(error instanceof ApiError)) return false
  if (error.status === 502 || error.status === 503) return true
  return error.status === 429 && /mercado libre/i.test(error.message)
}

export function isRateLimited(error: unknown) {
  return error instanceof ApiError && error.status === 429 && !isMercadoLibreUnavailable(error)
}

/**
 * Turns any error into a message for the user. Business messages from the API
 * are already in Spanish; validation and session ones come in English, so they
 * are replaced by the generic ones (screens validate on the client first).
 */
export function errorMessage(error: unknown, fallback: string = MESSAGES.unexpected): string {
  if (!(error instanceof ApiError)) return fallback
  if (error.isNetworkError) return MESSAGES.network
  if (isMercadoLibreUnavailable(error)) return MESSAGES.mercadoLibreDown
  if (error.status === 429) return MESSAGES.tooManyRequests
  if (error.status >= 500) return MESSAGES.unexpected
  const message = error.messages[0]
  return message && looksSpanish(message) ? message : fallback
}

function looksSpanish(text: string) {
  return /[áéíóúñ¿¡]|\b(el|la|de|no|ya|un|una|que|debe|tienes|te)\b/i.test(text)
}
