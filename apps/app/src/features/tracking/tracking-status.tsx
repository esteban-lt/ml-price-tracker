import { Pause, TrendingDown, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { PriceSnapshot, TrackedProduct } from '@/lib/api/types'
import { targetPrice } from '@/lib/format'

export interface TrackingFacts {
  /** Price that triggers the alert (null for a percentage without reference). */
  target: number | null
  current: PriceSnapshot | null
  /** Change since following, in percent (negative = cheaper). */
  change: number | null
  /** Current price is at or below the target. */
  belowTarget: boolean
}

export function trackingFacts(tracking: TrackedProduct, current: PriceSnapshot | null | undefined): TrackingFacts {
  const target = targetPrice(tracking.thresholdType, tracking.thresholdValue, tracking.referencePrice)
  const price = current?.price ?? null
  const change =
    price != null && tracking.referencePrice ? Math.round((price / tracking.referencePrice - 1) * 100) : null
  return {
    target,
    current: current ?? null,
    change,
    belowTarget: price != null && target != null && price <= target,
  }
}

/** Activo / Pausado / Sin vendedores (+ "Bajó de tu precio"). Never color only: icon and text. */
export function TrackingStatusBadges({ tracking, belowTarget }: { tracking: TrackedProduct; belowTarget?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tracking.status === 'paused' ? (
        <Badge variant="paused">
          <Pause aria-hidden="true" />
          Pausado
        </Badge>
      ) : (
        <Badge variant="success">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
          Activo
        </Badge>
      )}
      {!tracking.product.isAvailable && (
        <Badge variant="paused">
          <TriangleAlert aria-hidden="true" />
          Sin vendedores
        </Badge>
      )}
      {belowTarget && tracking.product.isAvailable && (
        <Badge variant="solid">
          <TrendingDown aria-hidden="true" />
          Bajó de tu precio
        </Badge>
      )}
    </div>
  )
}

/** "−8 %" in green when cheaper, "+3 %" when more expensive. */
export function ChangeLabel({ change, className }: { change: number | null; className?: string }) {
  if (change == null) return <span className={className}>—</span>
  const text = change === 0 ? 'Sin cambio' : `${change < 0 ? '−' : '+'}${Math.abs(change)} %`
  const color = change < 0 ? 'text-success-soft-foreground' : change > 0 ? 'text-destructive' : 'text-muted-foreground'
  return <span className={`num font-semibold ${color} ${className ?? ''}`}>{text}</span>
}
