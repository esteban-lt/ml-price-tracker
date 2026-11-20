import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { RefreshCw, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/** Simple illustration, title, short text and one main action. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-lg flex-col items-center gap-3 rounded-[20px] border border-border bg-card px-6 py-12 text-center',
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-success-soft text-success-soft-foreground [&_svg]:size-7">
        {icon}
      </span>
      <h2 className="m-0 font-display text-[22px] font-bold">{title}</h2>
      {description && <div className="m-0 text-muted-foreground">{description}</div>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2.5">{action}</div>}
    </div>
  )
}

/** Generic error inside a section, with "Reintentar". */
export function ErrorState({
  title = 'Algo salió mal.',
  description = 'Inténtalo de nuevo.',
  onRetry,
  retrying,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  retrying?: boolean
}) {
  return (
    <section
      role="alert"
      className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-[20px] border border-border bg-card px-6 py-12 text-center"
    >
      <h2 className="m-0 font-display text-[22px] font-bold">{title}</h2>
      <p className="m-0 text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} disabled={retrying} className="mt-2">
          <RefreshCw aria-hidden="true" className={cn(retrying && 'animate-spin')} />
          Reintentar
        </Button>
      )}
    </section>
  )
}

/** S3 · Servicio no disponible (Mercado Libre answered 502/503 or rate-limited the app). */
export function ServiceUnavailable({ onRetry, retrying }: { onRetry: () => void; retrying?: boolean }) {
  const { status } = useAuth()
  return (
    <section
      role="alert"
      className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-[20px] border border-border bg-card px-6 py-12 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-warning-soft text-warning-foreground">
        <WifiOff aria-hidden="true" className="size-7" />
      </span>
      <h2 className="m-0 font-display text-[22px] font-bold">No pudimos conectar con Mercado Libre</h2>
      <p className="m-0 text-muted-foreground">
        Tus seguimientos y alertas siguen funcionando. Intenta de nuevo en unos minutos.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <Button onClick={onRetry} disabled={retrying}>
          <RefreshCw aria-hidden="true" className={cn(retrying && 'animate-spin')} />
          Reintentar
        </Button>
        {status === 'authenticated' && (
          <Button asChild variant="outline">
            <Link to="/seguimientos">Ir a Mis seguimientos</Link>
          </Button>
        )}
      </div>
    </section>
  )
}
