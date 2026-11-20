import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ExternalLink,
  LineChart,
  Loader2,
  Pause,
  Pencil,
  Percent,
  Play,
  Target,
  TrendingDown,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { DiscountTag } from '@/components/common/price'
import { ProductImage } from '@/components/common/product-image'
import { ErrorState } from '@/components/common/states'
import { EditThresholdDialog } from '@/features/tracking/edit-threshold-dialog'
import { ChartLegend, GAP_MS, PriceHistoryChart } from '@/features/tracking/price-history-chart'
import { useLatestSnapshot, usePriceHistory, useTrackedProduct, useTrackingActions } from '@/features/tracking/queries'
import { ChangeLabel, TrackingStatusBadges, trackingFacts } from '@/features/tracking/tracking-status'
import { UnfollowDialog } from '@/features/tracking/unfollow-dialog'
import { ApiError } from '@/lib/api/client'
import type { PriceSnapshot, TrackedProduct } from '@/lib/api/types'
import {
  describeThreshold,
  discountPercent,
  formatDate,
  formatDateTime,
  formatPrice,
  formatRelative,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import { NotFoundPage } from './not-found-page'

const RANGES = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
  { days: 365, label: '1 año' },
]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A3 · Detalle del seguimiento */
export function TrackingDetailPage() {
  const { id = '' } = useParams()
  const validId = UUID.test(id)
  const tracking = useTrackedProduct(validId ? id : '')

  if (!validId || (tracking.error instanceof ApiError && tracking.error.status === 404)) return <NotFoundPage />
  if (tracking.isError) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <ErrorState onRetry={() => tracking.refetch()} retrying={tracking.isFetching} />
      </div>
    )
  }
  if (!tracking.data) return <DetailSkeleton />
  return <Detail tracking={tracking.data} />
}

function Detail({ tracking }: { tracking: TrackedProduct }) {
  const navigate = useNavigate()
  const { pause, resume } = useTrackingActions()
  const latest = useLatestSnapshot(tracking.product.id)
  const facts = trackingFacts(tracking, latest.data)
  const [editOpen, setEditOpen] = useState(false)
  const [unfollowOpen, setUnfollowOpen] = useState(false)
  const paused = tracking.status === 'paused'
  const toggling = pause.isPending || resume.isPending

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-6 sm:px-6">
      <Breadcrumbs items={[{ label: 'Mis seguimientos', to: '/seguimientos' }, { label: tracking.product.name }]} />

      <section className="flex flex-wrap items-center gap-5 rounded-[20px] border border-border bg-card p-5">
        <ProductImage src={tracking.product.imageUrl} className="size-24 rounded-2xl sm:size-28" />
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
          <h1 className="m-0 font-display text-[clamp(22px,3vw,28px)] leading-tight font-bold">
            {tracking.product.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <TrackingStatusBadges tracking={tracking} />
            <span className="text-[13px] text-muted-foreground">
              Lo sigues desde el {formatDate(tracking.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={toggling}
            onClick={() => (paused ? resume.mutate(tracking.id) : pause.mutate(tracking.id))}
          >
            {toggling ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : paused ? (
              <Play aria-hidden="true" />
            ) : (
              <Pause aria-hidden="true" />
            )}
            {paused ? 'Reanudar' : 'Pausar'}
          </Button>
          <Button asChild variant="outline">
            <a href={tracking.product.url} target="_blank" rel="noopener noreferrer">
              Ver en Mercado Libre
              <ExternalLink aria-hidden="true" />
              <span className="sr-only">(se abre en otra pestaña)</span>
            </a>
          </Button>
        </div>
      </section>

      {!tracking.product.isAvailable && (
        <div
          role="status"
          className="rounded-xl border border-warning-border bg-warning-soft p-3.5 text-sm text-warning-foreground"
        >
          <b>Este producto ya no tiene vendedores.</b> Su precio no se actualiza hasta que vuelva a venderse.
        </div>
      )}
      {paused && (
        <div role="status" className="rounded-xl bg-muted p-3.5 text-sm text-muted-foreground">
          Este seguimiento está pausado: no te avisaremos aunque baje el precio.
        </div>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <HistorySection tracking={tracking} target={facts.target} />

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <section className="flex flex-col gap-3.5 rounded-[20px] border border-border bg-card p-5.5">
            <div>
              <div className="text-sm text-muted-foreground">Precio actual</div>
              {latest.isPending ? (
                <Skeleton className="mt-1 h-11 w-48" />
              ) : facts.current ? (
                <>
                  <div className="num font-display text-[clamp(36px,5vw,44px)] leading-[1.05] font-bold">
                    {formatPrice(facts.current.price, facts.current.currency)}
                  </div>
                  <CurrentMeta snapshot={facts.current} />
                </>
              ) : (
                <div className="mt-1 text-muted-foreground">Sin revisiones en los últimos 7 días.</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-background p-3">
                <div className="text-xs text-muted-foreground">Desde que lo sigues</div>
                <ChangeLabel change={facts.change} className="flex items-center gap-1 text-lg" />
                {tracking.referencePrice != null && (
                  <div className="num text-xs text-muted-foreground">antes {formatPrice(tracking.referencePrice)}</div>
                )}
              </div>
              <div className="rounded-xl bg-background p-3">
                <div className="text-xs text-muted-foreground">Tu precio objetivo</div>
                <div className="num text-lg font-bold">{facts.target != null ? formatPrice(facts.target) : '—'}</div>
                <div className="text-xs text-muted-foreground">o menos</div>
              </div>
            </div>
            {facts.belowTarget && tracking.product.isAvailable && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-xl bg-primary px-3.5 py-3 text-primary-foreground"
              >
                <TrendingDown aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <span className="text-sm">
                  Ya está por debajo de tu precio.{' '}
                  <Link to="/alertas" className="font-bold text-inherit">
                    Ver alertas
                  </Link>
                </span>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3.5 rounded-[20px] border border-border bg-card p-5.5">
            <div className="flex items-center justify-between">
              <h2 className="m-0 font-display text-xl font-bold">Tu aviso</h2>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil aria-hidden="true" />
                Editar
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success-soft-foreground">
                {tracking.thresholdType === 'price_below' ? (
                  <Target aria-hidden="true" className="size-5" />
                ) : (
                  <Percent aria-hidden="true" className="size-5" />
                )}
              </span>
              <div>
                <div className="text-base font-semibold">
                  {describeThreshold(tracking.thresholdType, tracking.thresholdValue)}
                </div>
                {tracking.referencePrice != null && (
                  <div className="num text-[13px] text-muted-foreground">
                    Precio de referencia {formatPrice(tracking.referencePrice)}
                  </div>
                )}
              </div>
            </div>
            <div className="h-px bg-border" />
            <Button
              variant="destructive-ghost"
              size="sm"
              className="self-start px-2"
              onClick={() => setUnfollowOpen(true)}
            >
              <Trash2 aria-hidden="true" />
              Dejar de seguir
            </Button>
          </section>
        </aside>
      </div>

      <EditThresholdDialog tracking={tracking} open={editOpen} onOpenChange={setEditOpen} />
      <UnfollowDialog
        tracking={tracking}
        open={unfollowOpen}
        onOpenChange={setUnfollowOpen}
        onDeleted={() => navigate('/seguimientos', { replace: true })}
      />
    </div>
  )
}

function CurrentMeta({ snapshot }: { snapshot: PriceSnapshot }) {
  const discount = discountPercent(snapshot.price, snapshot.originalPrice)
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
      {discount != null && snapshot.originalPrice != null && (
        <>
          <span className="num text-subtle line-through">{formatPrice(snapshot.originalPrice, snapshot.currency)}</span>
          <DiscountTag value={discount} />
        </>
      )}
      <span title={formatDateTime(snapshot.checkedAt)}>· revisado {formatRelative(snapshot.checkedAt)}</span>
    </div>
  )
}

function HistorySection({ tracking, target }: { tracking: TrackedProduct; target: number | null }) {
  const [days, setDays] = useState(30)
  const history = usePriceHistory(tracking.product.id, days)
  const snapshots = history.data ?? []
  const label = RANGES.find((r) => r.days === days)?.label ?? `${days} días`

  const prices = snapshots.map((s) => s.price)
  const stats =
    prices.length > 0
      ? {
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
          current: prices.at(-1)!,
        }
      : null
  const hasGaps = snapshots.some(
    (s, i) => i > 0 && new Date(s.checkedAt).getTime() - new Date(snapshots[i - 1].checkedAt).getTime() > GAP_MS,
  )
  const summary = stats
    ? `Últimos ${label}: precio mínimo ${formatPrice(stats.min)}, máximo ${formatPrice(stats.max)}, actual ${formatPrice(stats.current)}.${hasGaps ? ' Hubo periodos sin vendedores.' : ''}`
    : `Sin datos en los últimos ${label}.`

  return (
    <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-4.5 rounded-[20px] border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-display text-[22px] font-bold">Historial de precios</h2>
        <div role="group" aria-label="Rango" className="flex gap-1 rounded-xl bg-secondary p-1">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              aria-pressed={days === range.days}
              onClick={() => setDays(range.days)}
              className={cn(
                'h-9 rounded-[9px] px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                days === range.days
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {history.isPending ? (
        <Skeleton className="h-[290px] w-full rounded-xl" />
      ) : history.isError ? (
        <ErrorState
          title="No pudimos cargar el historial."
          onRetry={() => history.refetch()}
          retrying={history.isFetching}
        />
      ) : snapshots.length === 0 ? (
        <div className="flex h-[200px] flex-col items-center justify-center gap-3 rounded-xl bg-background text-center">
          <LineChart aria-hidden="true" className="size-8 text-muted-foreground" />
          <p className="m-0 max-w-sm text-muted-foreground">No hay revisiones en este rango.</p>
          {days < 365 && (
            <Button variant="outline" size="sm" onClick={() => setDays(RANGES.find((r) => r.days > days)!.days)}>
              Ver un rango mayor
            </Button>
          )}
        </div>
      ) : (
        <>
          <PriceHistoryChart
            snapshots={snapshots}
            target={target}
            reference={tracking.referencePrice}
            summary={summary}
          />
          {snapshots.length <= 2 && (
            <p className="m-0 text-[13px] text-muted-foreground">
              Revisamos el precio cuatro veces al día; aquí verás su evolución.
            </p>
          )}
          <ChartLegend showGaps={hasGaps} showTarget={target != null} showReference={tracking.referencePrice != null} />
          {stats && (
            <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
              {[
                { label: 'Mínimo del rango', value: stats.min },
                { label: 'Máximo del rango', value: stats.max },
                { label: 'Promedio', value: stats.avg },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-background p-3">
                  <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                  <dd className="num m-0 text-lg font-bold">{formatPrice(stat.value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-6 sm:px-6" aria-busy="true">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-[150px] w-full rounded-[20px]" />
      <div className="flex flex-wrap gap-5">
        <Skeleton className="h-[420px] flex-[999_1_560px] rounded-[20px]" />
        <Skeleton className="h-[420px] flex-[1_1_320px] rounded-[20px]" />
      </div>
    </div>
  )
}
