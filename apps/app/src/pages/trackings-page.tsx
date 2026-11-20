import { useState } from 'react'
import { Link } from 'react-router'
import { Bell, Plus, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/common/states'
import { useUnreadAlertsCount } from '@/features/alerts/queries'
import { useTrackedProducts } from '@/features/tracking/queries'
import { TrackingCard, TrackingCardSkeleton } from '@/features/tracking/tracking-card'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'active' | 'paused'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'paused', label: 'Pausados' },
]

const COLUMNS = ['Producto', 'Tu aviso', 'Hoy', 'Desde que lo sigues', 'Estado', '']

/** A1 · Mis seguimientos */
export function TrackingsPage() {
  const trackings = useTrackedProducts()
  const { data: unread = 0 } = useUnreadAlertsCount()
  const [filter, setFilter] = useState<Filter>('all')

  const all = trackings.data ?? []
  const counts = {
    all: all.length,
    active: all.filter((t) => t.status === 'active').length,
    paused: all.filter((t) => t.status === 'paused').length,
  }
  const visible = filter === 'all' ? all : all.filter((t) => t.status === filter)

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-8 sm:px-6 sm:py-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-3 font-display text-[clamp(30px,5vw,36px)] font-extrabold">
            Mis seguimientos
            {trackings.isSuccess && (
              <span className="num rounded-full bg-border px-2.5 py-0.5 font-sans text-[15px] font-bold tracking-normal">
                {all.length}
              </span>
            )}
          </h1>
          <p className="m-0 mt-1 text-muted-foreground">Revisamos cada precio cuatro veces al día.</p>
        </div>
        <Button asChild>
          <Link to="/buscar">
            <Plus aria-hidden="true" />
            Seguir otro producto
          </Link>
        </Button>
      </div>

      {trackings.isError ? (
        <ErrorState
          title="No pudimos cargar tus seguimientos."
          onRetry={() => trackings.refetch()}
          retrying={trackings.isFetching}
        />
      ) : trackings.isSuccess && all.length === 0 ? (
        <EmptyState
          icon={<Target aria-hidden="true" />}
          title="Todavía no sigues ningún producto."
          description="Busca un producto de Mercado Libre, elige tu precio y te avisamos cuando baje."
          action={
            <>
              <Button asChild>
                <Link to="/buscar">Buscar productos</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/categorias">Ver categorías</Link>
              </Button>
            </>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Filtrar seguimientos" className="flex gap-2">
              {FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                  className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    filter === id ? 'bg-ink text-ink-foreground' : 'border border-border bg-card hover:bg-secondary',
                  )}
                >
                  {label}
                  {trackings.isSuccess && <span className="num opacity-70">{counts[id]}</span>}
                </button>
              ))}
            </div>
            {unread > 0 && (
              <Link
                to="/alertas"
                className="inline-flex items-center gap-2.5 rounded-full bg-success-soft py-1.5 pr-3.5 pl-1.5 font-semibold text-success-soft-foreground no-underline"
              >
                <span className="flex size-[30px] items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bell aria-hidden="true" className="size-4" />
                </span>
                {unread === 1 ? '1 alerta sin leer' : `${unread} alertas sin leer`}
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-3 md:gap-0 md:overflow-hidden md:rounded-[18px] md:border md:border-border md:bg-card">
            <div
              aria-hidden="true"
              className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_44px] gap-x-4 bg-background px-5 py-2.5 text-xs font-bold tracking-[.06em] text-muted-foreground uppercase md:grid"
            >
              {COLUMNS.map((c, i) => (
                <span key={i} className={i === 2 ? 'text-right' : undefined}>
                  {c}
                </span>
              ))}
            </div>
            {trackings.isPending ? (
              Array.from({ length: 4 }, (_, i) => <TrackingCardSkeleton key={i} />)
            ) : visible.length === 0 ? (
              <p className="m-0 p-8 text-center text-muted-foreground">
                {filter === 'paused' ? 'No tienes seguimientos pausados.' : 'No tienes seguimientos activos.'}
              </p>
            ) : (
              visible.map((tracking) => <TrackingCard key={tracking.id} tracking={tracking} />)
            )}
          </div>
        </>
      )}
    </div>
  )
}
