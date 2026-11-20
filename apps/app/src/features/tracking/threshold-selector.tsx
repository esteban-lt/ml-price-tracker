import { useId } from 'react'
import { CircleAlert, Percent, Target } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ThresholdType } from '@/lib/api/types'
import { formatPercent, formatPrice, targetFromPercentage } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface ThresholdDraft {
  type: ThresholdType
  /** Raw text of the input, so "1,234.5" can be typed freely. */
  priceText: string
  percentText: string
}

export const PERCENT_SHORTCUTS = [5, 10, 15, 20]
const MAX_PRICE = 99_999_999.99

/** "6,499.00" → 6499. Returns NaN when it isn't a number. */
export function parseAmount(text: string) {
  const clean = text.replace(/[\s$,]/g, '')
  return clean === '' ? Number.NaN : Number(clean)
}

const hasMaxTwoDecimals = (value: number) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6

/** Same rules as the API (guide A2), with messages in Spanish. */
export function validateThreshold(draft: ThresholdDraft): { value: number; error: string | null } {
  if (draft.type === 'price_below') {
    const value = parseAmount(draft.priceText)
    if (Number.isNaN(value)) return { value, error: 'Escribe un precio objetivo.' }
    if (value <= 0) return { value, error: 'El precio debe ser mayor a 0.' }
    if (value > MAX_PRICE) return { value, error: 'El precio es demasiado alto.' }
    if (!hasMaxTwoDecimals(value)) return { value, error: 'Usa máximo 2 decimales.' }
    return { value, error: null }
  }
  const value = parseAmount(draft.percentText)
  if (Number.isNaN(value)) return { value, error: 'Escribe un porcentaje.' }
  if (value < 1 || value > 99) return { value, error: 'El porcentaje debe estar entre 1 y 99.' }
  if (!hasMaxTwoDecimals(value)) return { value, error: 'Usa máximo 2 decimales.' }
  return { value, error: null }
}

interface ThresholdSelectorProps {
  draft: ThresholdDraft
  onChange: (draft: ThresholdDraft) => void
  /** Price the percentage is computed on: today's price (A2) or the reference price (A4). */
  basePrice: number | null
  /** Price to compare against for the "already met" warning. */
  currentPrice: number | null
  currency?: string
  /** "hoy" in A2, "cuando empezaste a seguirlo" in A4. */
  baseLabel: string
  showErrors: boolean
}

/** Selector de umbral (A2 and A4): two options, the value and a preview of the target price. */
export function ThresholdSelector({
  draft,
  onChange,
  basePrice,
  currentPrice,
  currency = 'MXN',
  baseLabel,
  showErrors,
}: ThresholdSelectorProps) {
  const id = useId()
  const { value, error } = validateThreshold(draft)
  const target =
    error != null
      ? null
      : draft.type === 'price_below'
        ? value
        : basePrice != null
          ? targetFromPercentage(basePrice, value)
          : null
  const alreadyMet = target != null && currentPrice != null && target >= currentPrice
  const dropFromBase =
    target != null && basePrice != null && draft.type === 'price_below' && basePrice > 0
      ? Math.round((1 - target / basePrice) * 100)
      : null

  const options: { type: ThresholdType; label: string; icon: typeof Target }[] = [
    { type: 'price_below', label: 'Cuando baje de un precio', icon: Target },
    { type: 'percentage_drop', label: 'Cuando baje un porcentaje', icon: Percent },
  ]

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="m-0 grid grid-cols-2 gap-2 border-0 p-0">
        <legend className="mb-2 text-[15px] font-semibold">¿Cuándo te avisamos?</legend>
        {options.map(({ type, label, icon: Icon }) => {
          const checked = draft.type === type
          return (
            <label
              key={type}
              className={cn(
                'flex cursor-pointer flex-col gap-1.5 rounded-[14px] border p-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
                checked ? 'border-2 border-primary bg-accent p-[11px]' : 'border-input bg-card hover:bg-secondary',
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-between',
                  checked ? 'text-success-soft-foreground' : 'text-muted-foreground',
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                <input
                  type="radio"
                  name={`${id}-type`}
                  value={type}
                  checked={checked}
                  onChange={() => onChange({ ...draft, type })}
                  className="m-0 size-[18px] accent-primary"
                />
              </span>
              <span className="text-sm leading-tight font-semibold">{label}</span>
            </label>
          )
        })}
      </fieldset>

      {draft.type === 'price_below' ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-price`} className="text-[13px] font-semibold">
            Precio objetivo
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id={`${id}-price`}
              inputMode="decimal"
              autoComplete="off"
              value={draft.priceText}
              onChange={(e) => onChange({ ...draft, priceText: e.target.value })}
              aria-invalid={showErrors && error ? true : undefined}
              aria-describedby={`${id}-help`}
              className={cn('num pl-7', alreadyMet && 'border-[#d9a43a]')}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-percent`} className="text-[13px] font-semibold">
            Porcentaje de baja
          </Label>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-28">
              <Input
                id={`${id}-percent`}
                inputMode="decimal"
                autoComplete="off"
                value={draft.percentText}
                onChange={(e) => onChange({ ...draft, percentText: e.target.value })}
                aria-invalid={showErrors && error ? true : undefined}
                aria-describedby={`${id}-help`}
                className="num pr-8"
              />
              <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
            <div role="group" aria-label="Atajos de porcentaje" className="flex flex-wrap gap-2">
              {PERCENT_SHORTCUTS.map((p) => {
                const active = parseAmount(draft.percentText) === p
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChange({ ...draft, percentText: String(p) })}
                    className={cn(
                      'num h-12 rounded-xl px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-border',
                    )}
                  >
                    {p} %
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div id={`${id}-help`} aria-live="polite">
        {showErrors && error ? (
          <p className="m-0 text-[13px] text-destructive">{error}</p>
        ) : alreadyMet ? (
          <div className="flex gap-2.5 rounded-xl border border-warning-border bg-warning-soft p-3 text-warning-foreground">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <span className="text-[13px] leading-snug">
              <b>El precio actual ya cumple esta condición.</b> Te avisaremos la próxima vez que baje hasta aquí después
              de subir.
            </span>
          </div>
        ) : target != null ? (
          <p className="num m-0 rounded-xl bg-accent p-3 text-sm text-accent-foreground">
            Te avisaremos cuando cueste <b>{formatPrice(target, currency)}</b> o menos
            {draft.type === 'percentage_drop' && ` (${formatPercent(value)} menos que ${baseLabel})`}
            {draft.type === 'price_below' &&
              dropFromBase != null &&
              dropFromBase > 0 &&
              ` (${dropFromBase} % menos que ${baseLabel})`}
            .
          </p>
        ) : null}
      </div>
    </div>
  )
}
