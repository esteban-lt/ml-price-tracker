import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { PriceSnapshot } from '@/lib/api/types'
import { formatDateTime, formatPrice, formatSellers } from '@/lib/format'

interface PriceHistoryChartProps {
  snapshots: PriceSnapshot[]
  target: number | null
  reference: number | null
  currency?: string
  /** Text summary for screen readers (min, max, current…). */
  summary: string
}

const HEIGHT = 290
const PAD = { top: 20, right: 16, bottom: 34, left: 64 }
/** Checks happen every 6 h; a longer jump means there were no sellers (no snapshots). */
const GAP_MS = 9 * 60 * 60 * 1000

const axisDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })
const axisPrice = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
})

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** Nice round steps for the price axis. */
function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || max || 1
  const raw = span / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(v)
  return ticks
}

/**
 * Step chart of the lowest price over time, with the target and reference lines.
 * Gaps (no sellers) break the line and are hatched. Rendered at the container's
 * real width so labels keep their size on phones.
 */
export function PriceHistoryChart({ snapshots, target, reference, currency = 'MXN', summary }: PriceHistoryChartProps) {
  const [containerRef, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const id = useId()
  const hatchId = `${id}-hatch`

  const model = useMemo(() => {
    if (width === 0 || snapshots.length === 0) return null
    const times = snapshots.map((s) => new Date(s.checkedAt).getTime())
    const t0 = times[0]
    // Extend the last step until now so the current price is visible as a segment.
    const t1 = Math.max(Date.now(), times.at(-1)! + 60 * 60 * 1000)
    const values = snapshots.map((s) => s.price)
    for (const extra of [target, reference]) if (extra != null) values.push(extra)
    const lo = Math.min(...values)
    const hi = Math.max(...values)
    const ticks = niceTicks(lo * 0.98, hi * 1.02)
    const yMin = ticks[0]
    const yMax = ticks.at(-1)!
    const plotW = width - PAD.left - PAD.right
    const plotH = HEIGHT - PAD.top - PAD.bottom
    const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0 || 1)) * plotW
    const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH

    // Build the step path, breaking it on gaps.
    let d = ''
    const gaps: { x0: number; x1: number }[] = []
    snapshots.forEach((s, i) => {
      const px = x(times[i])
      const py = y(s.price)
      if (i === 0) d += `M${px},${py}`
      else if (times[i] - times[i - 1] > GAP_MS) {
        gaps.push({ x0: x(times[i - 1]) + 1, x1: px })
        d += `M${px},${py}`
      } else d += `H${px}V${py}`
    })
    const lastX = x(t1)
    d += `H${lastX}`

    const xTickCount = Math.max(2, Math.min(5, Math.floor(plotW / 110)))
    const xTicks = Array.from({ length: xTickCount }, (_, i) => t0 + ((t1 - t0) * i) / (xTickCount - 1))

    return { times, x, y, d, gaps, ticks, xTicks, plotW, plotH, lastX }
  }, [width, snapshots, target, reference])

  function pick(clientX: number, rect: DOMRect) {
    if (!model) return
    const px = clientX - rect.left
    let best = 0
    model.times.forEach((t, i) => {
      if (Math.abs(model.x(t) - px) < Math.abs(model.x(model.times[best]) - px)) best = i
    })
    setActive(best)
  }

  function handleKey(event: KeyboardEvent<SVGSVGElement>) {
    if (!snapshots.length) return
    const last = snapshots.length - 1
    const current = active ?? last
    const next =
      event.key === 'ArrowLeft'
        ? Math.max(0, current - 1)
        : event.key === 'ArrowRight'
          ? Math.min(last, current + 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next != null) {
      event.preventDefault()
      setActive(next)
    } else if (event.key === 'Escape') setActive(null)
  }

  const point = active != null ? snapshots[active] : null

  return (
    <figure className="m-0">
      <div ref={containerRef} className="relative w-full" style={{ height: HEIGHT }}>
        {model && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={summary}
            tabIndex={0}
            onKeyDown={handleKey}
            onFocus={() => setActive((a) => a ?? snapshots.length - 1)}
            onBlur={() => setActive(null)}
            onPointerMove={(e: PointerEvent<SVGSVGElement>) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
            onPointerLeave={() => setActive(null)}
            className="block touch-pan-y rounded-lg font-sans focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <defs>
              <pattern id={hatchId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="7" stroke="var(--input)" strokeWidth="2" />
              </pattern>
            </defs>

            {/* Grid + price axis */}
            {model.ticks.map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={width - PAD.right} y1={model.y(v)} y2={model.y(v)} stroke="var(--border)" />
                <text x={PAD.left - 8} y={model.y(v) + 4} textAnchor="end" fontSize="12" fill="var(--muted-foreground)">
                  {axisPrice.format(v)}
                </text>
              </g>
            ))}

            {/* Date axis */}
            {model.xTicks.map((t, i) => (
              <text
                key={t}
                x={model.x(t)}
                y={HEIGHT - 10}
                fontSize="12"
                fill="var(--muted-foreground)"
                textAnchor={i === 0 ? 'start' : i === model.xTicks.length - 1 ? 'end' : 'middle'}
              >
                {axisDate.format(t).replace('.', '')}
              </text>
            ))}

            {/* No sellers */}
            {model.gaps.map((gap) => (
              <g key={gap.x0}>
                <rect
                  x={gap.x0}
                  y={PAD.top}
                  width={Math.max(2, gap.x1 - gap.x0)}
                  height={model.plotH}
                  fill={`url(#${hatchId})`}
                  opacity="0.8"
                />
              </g>
            ))}

            {/* Reference and target lines */}
            {reference != null && (
              <g>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={model.y(reference)}
                  y2={model.y(reference)}
                  stroke="var(--subtle)"
                  strokeDasharray="2 4"
                  strokeWidth="1.5"
                />
                <text
                  x={width - PAD.right - 4}
                  y={model.y(reference) - 6}
                  textAnchor="end"
                  fontSize="12"
                  fill="var(--muted-foreground)"
                  paintOrder="stroke"
                  stroke="var(--card)"
                  strokeWidth="4"
                >
                  Al seguirlo {formatPrice(reference, currency)}
                </text>
              </g>
            )}
            {target != null && (
              <g>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={model.y(target)}
                  y2={model.y(target)}
                  stroke="var(--primary)"
                  strokeDasharray="6 5"
                  strokeWidth="1.5"
                />
                <text
                  x={PAD.left + 6}
                  y={model.y(target) + 16}
                  fontSize="12"
                  fontWeight="600"
                  fill="var(--success-soft-foreground)"
                  paintOrder="stroke"
                  stroke="var(--card)"
                  strokeWidth="4"
                >
                  Tu precio {formatPrice(target, currency)}
                </text>
              </g>
            )}

            {/* Price */}
            <path d={model.d} fill="none" stroke="var(--foreground)" strokeWidth="2.5" strokeLinejoin="round" />
            {snapshots.length <= 2 &&
              snapshots.map((s, i) => (
                <circle key={s.id} cx={model.x(model.times[i])} cy={model.y(s.price)} r="4" fill="var(--foreground)" />
              ))}
            <circle
              cx={model.lastX}
              cy={model.y(snapshots.at(-1)!.price)}
              r="6"
              fill="var(--primary)"
              stroke="var(--card)"
              strokeWidth="2.5"
            />

            {/* Active point */}
            {point && active != null && (
              <g pointerEvents="none">
                <line
                  x1={model.x(model.times[active])}
                  x2={model.x(model.times[active])}
                  y1={PAD.top}
                  y2={PAD.top + model.plotH}
                  stroke="var(--foreground)"
                  strokeOpacity="0.25"
                />
                <circle
                  cx={model.x(model.times[active])}
                  cy={model.y(point.price)}
                  r="5.5"
                  fill="var(--card)"
                  stroke="var(--foreground)"
                  strokeWidth="2.5"
                />
              </g>
            )}
          </svg>
        )}

        {point && model && active != null && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 rounded-xl bg-[#12201C] px-3 py-2 text-white shadow-lg"
            style={
              model.x(model.times[active]) > width / 2
                ? { right: width - model.x(model.times[active]) + 12 }
                : { left: model.x(model.times[active]) + 12 }
            }
          >
            <div className="text-xs text-[#C9D4CF]">{formatDateTime(point.checkedAt)}</div>
            <div className="num text-[17px] font-bold">{formatPrice(point.price, point.currency)}</div>
            {(point.originalPrice != null || point.sellersCount != null) && (
              <div className="num text-xs text-[#C9D4CF]">
                {point.originalPrice != null && point.originalPrice > point.price && (
                  <>antes {formatPrice(point.originalPrice, point.currency)}</>
                )}
                {point.originalPrice != null &&
                  point.originalPrice > point.price &&
                  point.sellersCount != null &&
                  ' · '}
                {point.sellersCount != null && formatSellers(point.sellersCount)}
              </div>
            )}
          </div>
        )}
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  )
}

export function ChartLegend({
  showGaps,
  showTarget,
  showReference,
}: {
  showGaps: boolean
  showTarget: boolean
  showReference: boolean
}) {
  return (
    <div className="flex flex-wrap gap-x-4.5 gap-y-2 text-[13px] text-muted-foreground" aria-hidden="true">
      <span className="flex items-center gap-1.5">
        <span className="h-[3px] w-5 rounded bg-foreground" />
        Precio
      </span>
      {showTarget && (
        <span className="flex items-center gap-1.5">
          <span className="w-5 border-t-2 border-dashed border-primary" />
          Tu precio
        </span>
      )}
      {showReference && (
        <span className="flex items-center gap-1.5">
          <span className="w-5 border-t-2 border-dotted border-subtle" />
          Al seguirlo
        </span>
      )}
      {showGaps && (
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-sm bg-[repeating-linear-gradient(45deg,var(--input)_0_2px,transparent_2px_5px)]" />
          Sin vendedores
        </span>
      )}
    </div>
  )
}

export { GAP_MS }
