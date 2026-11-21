import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
import { ProductImage } from '@/components/common/product-image'
import { ApiError } from '@/lib/api/client'
import { trackingApi } from '@/lib/api/endpoints'
import type { CatalogProduct } from '@/lib/api/types'
import { errorMessage, isMercadoLibreUnavailable } from '@/lib/errors'
import { formatPrice } from '@/lib/format'
import { trackingKeys, useFollowedProducts } from './queries'
import { ThresholdSelector, validateThreshold, type ThresholdDraft } from './threshold-selector'

const amountFormatter = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Suggested target: 10 % below today's price. */
function initialDraft(price: number): ThresholdDraft {
  return {
    type: 'price_below',
    priceText: amountFormatter.format(Math.round(price * 0.9 * 100) / 100),
    percentText: '10',
  }
}

type FollowError = { kind: 'already' } | { kind: 'message'; text: string; retry?: boolean }

/** A2 · Seguir producto */
export function FollowDialog({
  product,
  open,
  onOpenChange,
}: {
  product: CatalogProduct
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        {/* key: a fresh form for each product */}
        <FollowForm key={product.id} product={product} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function FollowForm({ product, onDone }: { product: CatalogProduct; onDone: () => void }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const followed = useFollowedProducts()
  const [draft, setDraft] = useState(() => initialDraft(product.price))
  const [submitted, setSubmitted] = useState(false)
  const [failure, setFailure] = useState<FollowError | null>(null)

  const mutation = useMutation({
    mutationFn: (threshold: { thresholdType: ThresholdDraft['type']; thresholdValue: number }) =>
      trackingApi.create(product.id, threshold),
    onSuccess: (tracking) => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.all })
      onDone()
      toast.success('Ahora sigues este producto', {
        action: { label: 'Ver', onClick: () => navigate(`/seguimientos/${tracking.id}`) },
      })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        queryClient.invalidateQueries({ queryKey: trackingKeys.all })
        setFailure({ kind: 'already' })
      } else if (error instanceof ApiError && error.status === 404) {
        setFailure({
          kind: 'message',
          text: 'Este producto ya no tiene vendedores, así que no se puede seguir por ahora.',
        })
      } else {
        setFailure({ kind: 'message', text: errorMessage(error), retry: isMercadoLibreUnavailable(error) })
      }
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    const { value, error } = validateThreshold(draft)
    if (error) return
    setFailure(null)
    mutation.mutate({ thresholdType: draft.type, thresholdValue: value })
  }

  const existingId = followed.get(product.id)

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <DialogHeader className="gap-1 pr-10 text-left">
        <DialogTitle className="font-display text-[22px] font-bold">Seguir precio</DialogTitle>
        <DialogDescription>Elige cuándo quieres que te avisemos.</DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-3 rounded-2xl border border-border p-3">
        <ProductImage
          src={product.pictures[0]}
          size="thumb"
          className="size-16 shrink-0 rounded-xl"
          imgClassName="p-1"
        />
        <div className="min-w-0">
          <p className="m-0 line-clamp-2 text-sm leading-snug font-medium">{product.name}</p>
          <p className="num m-0 mt-0.5 text-lg font-[650]">
            {formatPrice(product.price, product.currency)}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">hoy</span>
          </p>
        </div>
      </div>

      <ThresholdSelector
        draft={draft}
        onChange={(next) => {
          setDraft(next)
          if (failure?.kind === 'message') setFailure(null)
        }}
        basePrice={product.price}
        currentPrice={product.price}
        currency={product.currency}
        baseLabel="hoy"
        showErrors={submitted}
      />

      {failure && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {failure.kind === 'already' ? (
            <>
              Ya sigues este producto.{' '}
              {existingId && (
                <Link to={`/seguimientos/${existingId}`} onClick={onDone} className="font-semibold text-inherit">
                  Ver su seguimiento
                </Link>
              )}
            </>
          ) : (
            failure.text
          )}
        </div>
      )}

      <DialogFooter className="flex-col-reverse gap-2.5 sm:flex-row">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={mutation.isPending || failure?.kind === 'already'}>
          {mutation.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
          {mutation.isPending
            ? 'Siguiendo…'
            : failure?.kind === 'message' && failure.retry
              ? 'Reintentar'
              : 'Seguir precio'}
        </Button>
      </DialogFooter>
    </form>
  )
}
