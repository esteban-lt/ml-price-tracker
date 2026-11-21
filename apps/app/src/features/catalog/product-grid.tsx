import { useState } from 'react'
import type { CatalogProduct } from '@/lib/api/types'
import { ProductCard, ProductCardSkeleton } from './product-card'
import { QuickViewDialog } from './quick-view-dialog'

const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4'

interface ProductGridProps {
  products: CatalogProduct[]
  showRank?: boolean
  /** e.g. "Computación", shown in the quick view as "#1 en Computación". */
  rankContext?: string
}

/** Grid of catalog cards with the quick view (P5) attached. */
export function ProductGrid({ products, showRank, rankContext }: ProductGridProps) {
  const [selected, setSelected] = useState<CatalogProduct | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className={GRID}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            rank={showRank ? product.position : undefined}
            onQuickView={(p) => {
              setSelected(p)
              setOpen(true)
            }}
          />
        ))}
      </div>
      {selected && (
        <QuickViewDialog
          product={selected}
          open={open}
          onOpenChange={setOpen}
          rankLabel={showRank && rankContext ? `#${selected.position} en ${rankContext}` : undefined}
        />
      )}
    </>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}
