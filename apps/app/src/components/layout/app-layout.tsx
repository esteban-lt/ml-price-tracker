import { Outlet, ScrollRestoration } from 'react-router'
import { Header } from './header'
import { Footer } from './footer'
import { SessionExpiredDialog } from '@/features/auth/session-expired-dialog'
import { FollowProvider } from '@/features/tracking/follow-context'

export function AppLayout() {
  return (
    <FollowProvider>
      <div className="flex min-h-svh flex-col">
        <a
          href="#contenido"
          className="sr-only z-50 rounded-lg bg-card px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Saltar al contenido
        </a>
        <Header />
        <main id="contenido" className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <SessionExpiredDialog />
        <ScrollRestoration />
      </div>
    </FollowProvider>
  )
}
