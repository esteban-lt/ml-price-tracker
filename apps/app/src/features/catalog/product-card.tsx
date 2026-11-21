import { Skeleton } from '@/components/ui/skeleton'
import { Price } from '@/components/common/price'
import { ProductImage } from '@/components/common/product-image'
import { FollowButton } from '@/features/tracking/follow-button'
import type { CatalogProduct } from '@/lib/api/types'
import { formatSellers } from '@/lib/format'

interface ProductCardProps {
  product: CatalogProduct
  /** Ranking badge ("#1"), only in best sellers. */
  rank?: number
  onQuickView: (product: CatalogProduct) => void
}

/** Catalog product card (guide 4.5). */
export function ProductCard({ product, rank, onQuickView }: ProductCardProps) {
  return (
    <article className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3">
      <button
        type="button"
        onClick={() => onQuickView(product)}
        aria-label={`Vista rápida: ${product.name}`}
        className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ProductImage src={product.pictures[0]} className="aspect-square w-full">
          {rank != null && (
            <span className="num absolute top-2 left-2 rounded-full bg-[#12201C] px-2 py-px text-xs font-bold text-white">
              #{rank}
            </span>
          )}
        </ProductImage>
      </button>
      <h3 className="m-0 line-clamp-2 min-h-[2.7em] text-sm leading-[1.35] font-medium">
        <button
          type="button"
          onClick={() => onQuickView(product)}
          className="text-left hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
          title={product.name}
        >
          {product.name}
        </button>
      </h3>
      <Price price={product.price} originalPrice={product.originalPrice} currency={product.currency} />
      <div className="flex flex-wrap gap-x-2.5 text-[13px]">
        {product.freeShipping && <span className="font-semibold text-success-soft-foreground">Envío gratis</span>}
        <span className="text-muted-foreground">{formatSellers(product.sellersCount)}</span>
      </div>
      <FollowButton product={product} className="mt-auto w-full" />
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-1 h-6 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-1 h-11 w-full rounded-xl" />
    </div>
  )
}
