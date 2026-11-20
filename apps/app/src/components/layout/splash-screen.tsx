import { LogoMark } from '@/components/common/logo'

/** S0 · Carga inicial: shown while the session is restored, to avoid header flicker. */
export function SplashScreen() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <LogoMark className="size-12 animate-pulse" />
      <span className="sr-only">Cargando Nudge…</span>
    </div>
  )
}
