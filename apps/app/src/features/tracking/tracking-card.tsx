import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ProductImage } from '@/components/common/product-image'
import type { TrackedProduct } from '@/lib/api/types'
import { describeThreshold, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useLatestSnapshot } from './queries'
import { TrackingActionsMenu } from './tracking-actions-menu'
import { ChangeLabel, TrackingStatusBadges, trackingFacts } from './tracking-status'

const DAY = 24 * 60 * 60 * 1000

/**
 * Tracking row/card (guide 4.5). On wide screens it lines up as a table:
 * product · your alert · today · since you follow it · status · actions.
 */
export function TrackingCard({ tracking }: { tracking: TrackedProduct }) {
  const latest = useLatestSnapshot(tracking.product.id)
  const facts = trackingFacts(tracking, latest.data)
  const unavailable = !tracking.product.isAvailable
  const isNew = Date.now() - new Date(tracking.createdAt).getTime() < DAY
  const detailUrl = `/seguimientos/${tracking.id}`

  return (
    <article
      className={cn(
        'relative grid grid-cols-[64px_1fr_auto] gap-x-3 gap-y-2 border-border p-4 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_auto] md:items-center md:gap-x-4 md:border-t md:px-5 md:py-3.5',
        'max-md:rounded-2xl max-md:border max-md:bg-card',
        unavailable && 'bg-secondary/50',
      )}
    >
      {/* Product */}
      <div className="contents md:flex md:min-w-0 md:items-center md:gap-3">
        <ProductImage
          src={tracking.product.imageUrl}
          className={cn('row-span-2 size-16 rounded-xl md:size-[52px]', unavailable && 'opacity-60')}
          imgClassName="p-1"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            to={detailUrl}
            className="line-clamp-2 leading-snug font-semibold text-foreground no-underline after:absolute after:inset-0 hover:text-primary md:after:hidden"
          >
            {tracking.product.name}
          </Link>
          {isNew && (
            <Badge variant="ink" className="h-5 text-[11px]">
              Nuevo
            </Badge>
          )}
          {unavailable && (
            <span className="text-xs text-muted-foreground">
              Su precio no se actualiza hasta que vuelva a venderse.
            </span>
          )}
        </div>
      </div>

      {/* Menu (top right on mobile, last column on desktop) */}
      <div className="relative z-10 col-start-3 row-start-1 -mt-2 -mr-2 md:col-start-6 md:m-0">
        <TrackingActionsMenu tracking={tracking} />
      </div>

      {/* Your alert */}
      <div className="col-start-2 col-end-4 text-[13px] text-foreground md:col-auto">
        {describeThreshold(tracking.thresholdType, tracking.thresholdValue)}
        {tracking.thresholdType === 'percentage_drop' && facts.target != null && (
          <span className="num block text-muted-foreground">objetivo {formatPrice(facts.target)}</span>
        )}
      </div>

      {/* Today */}
      <div className="col-start-2 md:col-auto md:text-right">
        <span className="text-xs text-muted-foreground md:hidden">Hoy </span>
        {latest.isPending ? (
          <Skeleton className="inline-block h-5 w-20 align-middle" />
        ) : facts.current ? (
          <span className="num text-[17px] font-[650]">{formatPrice(facts.current.price, facts.current.currency)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>

      {/* Since you follow it */}
      <div className="col-start-3 row-start-3 text-right text-[13px] md:col-auto md:row-auto md:text-left">
        <ChangeLabel change={facts.change} />
        {tracking.referencePrice != null && (
          <span className="num block text-muted-foreground">ref. {formatPrice(tracking.referencePrice)}</span>
        )}
      </div>

      {/* Status */}
      <div className="col-start-2 col-end-4 md:col-auto">
        <TrackingStatusBadges tracking={tracking} belowTarget={facts.belowTarget} />
      </div>
    </article>
  )
}

export function TrackingCardSkeleton() {
  return (
    <div className="flex items-center gap-3 border-border p-4 max-md:rounded-2xl max-md:border max-md:bg-card md:border-t md:px-5">
      <Skeleton className="size-16 rounded-xl md:size-[52px]" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="hidden h-6 w-24 md:block" />
    </div>
  )
}
