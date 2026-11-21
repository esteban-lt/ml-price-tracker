import { Navigate, Outlet, useLocation } from 'react-router'
import { SplashScreen } from '@/components/layout/splash-screen'
import { useAuth } from './auth-context'

/** Routes that need a session. Anonymous visitors go to login and come back after. */
export function RequireAuth() {
  const { status, signedOut } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <SplashScreen />
  if (status === 'anonymous' && signedOut) return <Navigate to="/" replace />
  if (status === 'anonymous') {
    return <Navigate to="/iniciar-sesion" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

/** Login, register… make no sense with a session: send the user to the app. */
export function RequireGuest() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <SplashScreen />
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/seguimientos'} replace />
  }
  return <Outlet />
}
