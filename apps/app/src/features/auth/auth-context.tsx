import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  onSessionChange,
  refreshSession,
  setAccessToken,
  setSessionExpiredHandler,
} from '@/lib/api/client'
import { authApi } from '@/lib/api/endpoints'
import type { AuthResponse, User } from '@/lib/api/types'

type Status = 'loading' | 'authenticated' | 'anonymous'

/** Pending email verification. Lives only in memory (the token lasts 30 min). */
export interface PendingVerification {
  email: string
  verificationToken: string
  /** Seconds before "Reenviar código" is enabled. */
  resendIn: number
  /** True when we arrived from login with an unverified account: ask for a new code right away. */
  requestNewCode: boolean
}

interface AuthContextValue {
  status: Status
  user: User | null
  /** Saves a session returned by login, verify-email or change-password. */
  startSession: (session: AuthResponse) => void
  updateUser: (user: User) => void
  logout: () => Promise<void>
  logoutAll: () => Promise<void>
  /** Clears local state after the account was deleted. */
  clearSession: () => void
  sessionExpired: boolean
  dismissSessionExpired: () => void
  pendingVerification: PendingVerification | null
  setPendingVerification: (value: PendingVerification | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null)

  const applySession = useCallback((session: AuthResponse | null) => {
    setAccessToken(session?.token ?? null)
    setUser(session?.user ?? null)
    setStatus(session ? 'authenticated' : 'anonymous')
  }, [])

  // S0: restore the session from the refresh cookie when the app opens.
  useEffect(() => {
    let cancelled = false
    refreshSession({ retry: false }).then((session) => {
      if (!cancelled) applySession(session)
    })
    return () => {
      cancelled = true
    }
  }, [applySession])

  // Keep React state in sync with renewals the API client does on its own.
  useEffect(
    () =>
      onSessionChange((session) => {
        if (session) {
          setUser(session.user)
          setStatus('authenticated')
        }
      }),
    [],
  )

  // S2: a protected request failed and the session could not be renewed.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setAccessToken(null)
      setUser(null)
      setStatus('anonymous')
      setSessionExpired(true)
      queryClient.removeQueries({ queryKey: ['me'] })
    })
    return () => setSessionExpiredHandler(null)
  }, [queryClient])

  const clearSession = useCallback(() => {
    applySession(null)
    // Drop every cached private query (trackings, alerts…); public catalog stays.
    queryClient.removeQueries({ queryKey: ['me'] })
  }, [applySession, queryClient])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
  }, [clearSession])

  const logoutAll = useCallback(async () => {
    await authApi.logoutAll()
    clearSession()
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      startSession: (session) => {
        applySession(session)
        setSessionExpired(false)
        setPendingVerification(null)
      },
      updateUser: setUser,
      logout,
      logoutAll,
      clearSession,
      sessionExpired,
      dismissSessionExpired: () => setSessionExpired(false),
      pendingVerification,
      setPendingVerification,
    }),
    [status, user, applySession, logout, logoutAll, clearSession, sessionExpired, pendingVerification],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
