import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BellOff, CheckCheck, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductImage } from '@/components/common/product-image'
import { EmptyState, ErrorState } from '@/components/common/states'
import { useAlertActions, useAlerts, useUnreadAlertsCount } from '@/features/alerts/queries'
import { useTrackedProducts } from '@/features/tracking/queries'
import type { Alert } from '@/lib/api/types'
import { formatDateTime, formatPercent, formatPrice, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

type Tab = 'all' | 'unread'

/** A5 · Alertas */
export function AlertsPage() {
  const [tab, setTab] = useState<Tab>('all')
  const alerts = useAlerts(tab === 'unread')
  const { data: unread = 0 } = useUnreadAlertsCount()
  const { markAllRead } = useAlertActions()
  const trackings = useTrackedProducts()

  // The alert has no tracking id: find the tracking by product id (hide the link if it's gone).
  const trackingByProduct = useMemo(
    () => new Map((trackings.data ?? []).map((t) => [t.product.id, t.id])),
    [trackings.data],
  )

  const items = alerts.data?.pages.flatMap((p) => p.items) ?? []
  const total = alerts.data?.pages[0]?.total ?? 0

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-5 px-4 py-8 sm:px-6 sm:py-9">
      <div>
        <h1 className="m-0 font-display text-[clamp(30px,5vw,36px)] font-extrabold">Alertas</h1>
        <p className="m-0 mt-1 text-muted-foreground">El precio de cada alerta es el del momento en que bajó.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filtrar alertas" className="flex gap-1 rounded-xl bg-secondary p-1">
          {(
            [
              { id: 'all', label: 'Todas' },
              { id: 'unread', label: 'Sin leer' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-[9px] px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
              {id === 'unread' && unread > 0 && (
                <span className="num rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{unread}</span>
              )}
            </button>
          ))}
        </div>
        {unread > 0 && (
          <Button variant="ghost" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            {markAllRead.isPending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <CheckCheck aria-hidden="true" />
            )}
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {alerts.isPending ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
              <Skeleton className="size-16 rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </li>
          ))}
        </ul>
      ) : alerts.isError ? (
        <ErrorState
          title="No pudimos cargar tus alertas."
          onRetry={() => alerts.refetch()}
          retrying={alerts.isFetching}
        />
      ) : items.length === 0 ? (
        tab === 'unread' ? (
          <EmptyState
            icon={<CheckCircle2 aria-hidden="true" />}
            title="Estás al día."
            description="No tienes alertas sin leer."
          />
        ) : (
          <EmptyState
            icon={<BellOff aria-hidden="true" />}
            title="Aún no tienes alertas"
            description="Te avisaremos aquí cuando un precio baje."
            action={
              <Button asChild variant="outline">
                <Link to="/seguimientos">Ir a Mis seguimientos</Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {items.map((alert) => (
              <AlertItem key={alert.id} alert={alert} trackingId={trackingByProduct.get(alert.product.id)} />
            ))}
          </ul>
          <div className="flex flex-col items-center gap-3">
            {alerts.hasNextPage && (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => alerts.fetchNextPage()}
                disabled={alerts.isFetchingNextPage}
              >
                {alerts.isFetchingNextPage && <Loader2 aria-hidden="true" className="animate-spin" />}
                Cargar más
              </Button>
            )}
            <p className="num m-0 text-sm text-muted-foreground">
              Mostrando {items.length} de {total} {total === 1 ? 'alerta' : 'alertas'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function describeCondition(alert: Alert) {
  return alert.thresholdType === 'price_below'
    ? `menos de ${formatPrice(alert.thresholdValue, alert.currency)}`
    : `−${formatPercent(alert.thresholdValue)}`
}

function AlertItem({ alert, trackingId }: { alert: Alert; trackingId?: string }) {
  const navigate = useNavigate()
  const { markRead } = useAlertActions()
  const isUnread = !alert.readAt
  const open = () => {
    if (isUnread) markRead.mutate(alert.id)
  }

  return (
    <li
      className={cn(
        'relative flex flex-wrap gap-x-4 gap-y-3 rounded-2xl border bg-card p-4',
        isUnread ? 'border-primary/40 bg-accent/60' : 'border-border',
      )}
    >
      <div className="flex min-w-0 flex-[1_1_320px] gap-3.5">
        <div className="relative shrink-0">
          <ProductImage src={alert.product.imageUrl} className="size-16 rounded-xl" imgClassName="p-1" />
          {isUnread && (
            <span className="absolute -top-1 -left-1 size-3 rounded-full border-2 border-card bg-primary">
              <span className="sr-only">Nueva</span>
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={cn('line-clamp-2 leading-snug', isUnread ? 'font-semibold' : 'font-medium')}>
            {alert.product.name}
          </span>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="num font-display text-xl font-bold text-success-soft-foreground">
              Bajó a {formatPrice(alert.price, alert.currency)}
            </span>
            {alert.originalPrice != null && alert.originalPrice > alert.price && (
              <span className="num text-sm text-subtle line-through">
                {formatPrice(alert.originalPrice, alert.currency)}
              </span>
            )}
          </div>
          <div className="num text-[13px] text-muted-foreground">
            Tu aviso: {describeCondition(alert)} ·{' '}
            <time dateTime={alert.createdAt} title={formatDateTime(alert.createdAt)}>
              {formatRelative(alert.createdAt)}
            </time>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {trackingId ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              open()
              navigate(`/seguimientos/${trackingId}`)
            }}
          >
            Ver seguimiento
          </Button>
        ) : (
          <span className="px-2 text-[13px] text-muted-foreground">Ya no lo sigues</span>
        )}
        <Button asChild variant="ghost" size="sm" className="text-accent-foreground">
          <a href={alert.product.url} target="_blank" rel="noopener noreferrer" onClick={open}>
            Ver en Mercado Libre
            <ExternalLink aria-hidden="true" />
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        </Button>
        {isUnread && (
          <Button variant="ghost" size="sm" onClick={open} aria-label={`Marcar como leída: ${alert.product.name}`}>
            <CheckCheck aria-hidden="true" />
            <span className="sm:sr-only">Marcar como leída</span>
          </Button>
        )}
      </div>
    </li>
  )
}
