import { useLocation } from 'react-router'

/** State passed between account screens through navigation. */
export interface AuthLocationState {
  /** Where to return after logging in. */
  from?: string
  /** The visitor pressed "Seguir precio" without a session. */
  reason?: 'follow'
  /** Prefills the email (login → forgot password). */
  email?: string
  /** One-off message to show at the top of the form. */
  notice?: string
}

export function useAuthLocationState(): AuthLocationState {
  const location = useLocation()
  return (location.state as AuthLocationState | null) ?? {}
}
