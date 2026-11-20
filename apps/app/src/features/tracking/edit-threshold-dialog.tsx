import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormAlert } from '@/components/common/form-field'
import type { TrackedProduct } from '@/lib/api/types'
import { errorMessage } from '@/lib/errors'
import { formatPrice } from '@/lib/format'
import { useLatestSnapshot, useTrackingActions } from './queries'
import { ThresholdSelector, validateThreshold, type ThresholdDraft } from './threshold-selector'

const amountFormatter = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function draftFrom(tracking: TrackedProduct): ThresholdDraft {
  const isPrice = tracking.thresholdType === 'price_below'
  const reference = tracking.referencePrice
  return {
    type: tracking.thresholdType,
    priceText: isPrice
      ? amountFormatter.format(tracking.thresholdValue)
      : reference != null
        ? amountFormatter.format(Math.round(reference * 0.9 * 100) / 100)
        : '',
    percentText: isPrice ? '10' : String(tracking.thresholdValue),
  }
}

/** A4 · Editar umbral */
export function EditThresholdDialog({
  tracking,
  open,
  onOpenChange,
}: {
  tracking: TrackedProduct
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        {open && <EditForm tracking={tracking} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function EditForm({ tracking, onDone }: { tracking: TrackedProduct; onDone: () => void }) {
  const { updateThreshold } = useTrackingActions()
  const { data: latest } = useLatestSnapshot(tracking.product.id)
  const [draft, setDraft] = useState(() => draftFrom(tracking))
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    const { value, error } = validateThreshold(draft)
    if (error) return
    updateThreshold.mutate(
      { id: tracking.id, threshold: { thresholdType: draft.type, thresholdValue: value } },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <DialogHeader className="gap-1 pr-10 text-left">
        <DialogTitle className="font-display text-[22px] font-bold">Editar umbral</DialogTitle>
        <DialogDescription className="line-clamp-2">{tracking.product.name}</DialogDescription>
      </DialogHeader>

      <ThresholdSelector
        draft={draft}
        onChange={setDraft}
        basePrice={tracking.referencePrice}
        currentPrice={latest?.price ?? null}
        currency={latest?.currency}
        baseLabel="cuando empezaste a seguirlo"
        showErrors={submitted}
      />

      {tracking.referencePrice != null && (
        <p className="num m-0 text-[13px] text-muted-foreground">
          El porcentaje se calcula sobre {formatPrice(tracking.referencePrice)}, el precio que tenía cuando empezaste a
          seguirlo. Ese precio no cambia al editar.
        </p>
      )}

      {updateThreshold.isError && <FormAlert>{errorMessage(updateThreshold.error)}</FormAlert>}

      <DialogFooter className="flex-col-reverse gap-2.5 sm:flex-row">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={updateThreshold.isPending}>
          {updateThreshold.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}
