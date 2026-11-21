import { useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Price } from '@/components/common/price'
import { ProductImage } from '@/components/common/product-image'
import { FollowButton } from '@/features/tracking/follow-button'
import type { CatalogProduct } from '@/lib/api/types'
import { formatSellers } from '@/lib/format'
import { cn } from '@/lib/utils'

interface QuickViewDialogProps {
  product: CatalogProduct
  open: boolean
  onOpenChange: (open: boolean) => void
  rankLabel?: string
}

/** P5 · Vista rápida: same data as the listing card (there's no extra request). */
export function QuickViewDialog({ product, open, onOpenChange, rankLabel }: QuickViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6 sm:max-w-[880px] md:grid-cols-[1.1fr_1fr]">
        {/* key resets the gallery when another product is opened */}
        <Gallery key={product.id} pictures={product.pictures} name={product.name} />
        <div className="flex flex-col gap-4 md:pt-6">
          {rankLabel && (
            <span className="num self-start rounded-full bg-[#12201C] px-2.5 py-0.5 text-xs font-bold text-white">
              {rankLabel}
            </span>
          )}
          <DialogTitle className="m-0 font-display text-[22px] leading-tight font-bold">{product.name}</DialogTitle>
          <div>
            <Price price={product.price} originalPrice={product.originalPrice} currency={product.currency} size="lg" />
            <DialogDescription className="mt-1 text-[13px] text-muted-foreground">
              Precio de la oferta más barata
            </DialogDescription>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            {product.freeShipping && <span className="font-semibold text-success-soft-foreground">Envío gratis</span>}
            <span>Disponible con {formatSellers(product.sellersCount)}</span>
          </div>
          <div className="mt-auto flex flex-col gap-2.5">
            <FollowButton product={product} size="lg" className="w-full" onBeforeFollow={() => onOpenChange(false)} />
            <Button asChild variant="outline" size="lg" className="w-full">
              <a href={product.url} target="_blank" rel="noopener noreferrer">
                Ver en Mercado Libre
                <ExternalLink aria-hidden="true" />
                <span className="sr-only">(se abre en otra pestaña)</span>
              </a>
            </Button>
            <p className="m-0 text-center text-[13px] text-muted-foreground">
              Descripción, especificaciones y opiniones en Mercado Libre.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Gallery({ pictures, name }: { pictures: string[]; name: string }) {
  const [index, setIndex] = useState(0)
  const total = pictures.length
  const go = (delta: number) => setIndex((i) => (i + delta + total) % total)

  return (
    <div className="flex flex-col gap-3">
      <ProductImage
        src={pictures[index]}
        alt={name}
        size="large"
        className="aspect-square w-full rounded-2xl"
        imgClassName="p-4"
      >
        {total > 1 && (
          <>
            <Button
              variant="outline"
              size="icon-sm"
              className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full border-[#e1e6e2] bg-white text-[#12201C] hover:bg-[#f0f3f1]"
              onClick={() => go(-1)}
              aria-label="Imagen anterior"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full border-[#e1e6e2] bg-white text-[#12201C] hover:bg-[#f0f3f1]"
              onClick={() => go(1)}
              aria-label="Imagen siguiente"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            <span className="num absolute right-2 bottom-2 rounded-full bg-[#12201C]/75 px-2 py-0.5 text-xs font-semibold text-white">
              {index + 1} / {total}
            </span>
          </>
        )}
      </ProductImage>
      {total > 1 && (
        <div role="group" aria-label="Imágenes del producto" className="flex gap-2 overflow-x-auto pb-1">
          {pictures.slice(0, 8).map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Imagen ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                'shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                i === index ? 'ring-2 ring-primary' : 'opacity-80 hover:opacity-100',
              )}
            >
              <ProductImage src={src} size="thumb" className="size-14 rounded-lg" imgClassName="p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
