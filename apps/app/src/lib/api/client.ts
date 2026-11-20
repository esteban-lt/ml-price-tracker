import type { ApiErrorBody, AuthResponse } from './types'

/**
 * Base URL of the API.
 * - Development: "/api", forwarded by the Vite proxy (see vite.config.ts) so the
 *   refresh_token cookie stays same-site.
 * - Production: VITE_API_URL, e.g. https://nudge-api.estebanlt.com
 */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api'

/** Error thrown for every non-2xx response, or for network failures (status 0). */
export class ApiError extends Error {
  readonly status: number
  readonly body: ApiErrorBody

  constructor(status: number, body: ApiErrorBody) {
    const messages = Array.isArray(body.message) ? body.message : [body.message]
    super(messages.join('. '))
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }

  get messages(): string[] {
    return Array.isArray(this.body.message) ? this.body.message : [this.body.message]
  }

  get isNetworkError() {
    return this.status === 0
  }
}

// ---------------------------------------------------------------------------
// Session: the access token lives only in memory; the refresh token is an
// HttpOnly cookie the browser sends to /auth/*.
// ---------------------------------------------------------------------------

let accessToken: string | null = null
let refreshing: Promise<AuthResponse | null> | null = null

type SessionListener = (session: AuthResponse | null) => void
const listeners = new Set<SessionListener>()

/** Subscribe to session changes caused by the client itself (refresh, expiry). */
export function onSessionChange(listener: SessionListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

function emit(session: AuthResponse | null) {
  for (const listener of listeners) listener(session)
}

/**
 * Rotates the refresh cookie and returns a new session, or null when there is none.
 * Concurrent callers share one request. If it fails, it retries once after ~1 s
 * because another tab may have just rotated the cookie (skipped on app start,
 * so anonymous visitors don't wait).
 */
export function refreshSession({ retry = true }: { retry?: boolean } = {}): Promise<AuthResponse | null> {
  refreshing ??= (async () => {
    for (let attempt = 0; attempt < (retry ? 2 : 1); attempt++) {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (response.ok) {
          const session = (await response.json()) as AuthResponse
          accessToken = session.token
          emit(session)
          return session
        }
        if (response.status !== 401 || !retry) break
      } catch {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    accessToken = null
    return null
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** Query string parameters; undefined values are skipped. */
  query?: Record<string, string | number | boolean | undefined>
  /** Overrides the Authorization header (used with the verification token). */
  bearer?: string
}

/** Fires when a protected request fails and the session could not be renewed. */
let onSessionExpired: (() => void) | null = null
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler
}

export async function api<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const { body, query, bearer, headers: initHeaders, ...init } = options
  const headers = new Headers(initHeaders)
  const token = bearer ?? accessToken
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (body !== undefined) headers.set('Content-Type', 'application/json')

  let url = `${API_URL}${path}`
  if (query) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, String(value))
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, { statusCode: 0, message: 'Network error' })
  }

  // Expired access token: renew once and repeat the request.
  if (response.status === 401 && retry && !bearer && accessToken) {
    const session = await refreshSession()
    if (session) return api<T>(path, options, false)
    emit(null)
    onSessionExpired?.()
  }

  if (!response.ok) {
    let errorBody: ApiErrorBody
    try {
      errorBody = (await response.json()) as ApiErrorBody
    } catch {
      errorBody = { statusCode: response.status, message: response.statusText }
    }
    throw new ApiError(response.status, errorBody)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
