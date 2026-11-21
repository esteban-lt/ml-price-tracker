import { useState } from 'react'
import { ProductImage } from '@/components/common/product-image'
import { peekPendingFollow } from '@/features/tracking/pending-follow'

/** "Al terminar seguirás configurando <producto>" when the visitor came from "Seguir precio". */
export function PendingFollowBanner() {
  const [product] = useState(peekPendingFollow)
  if (!product) return null
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card px-3 py-2.5">
      <ProductImage src={product.pictures[0]} size="thumb" className="size-11 shrink-0 rounded-lg" imgClassName="p-1" />
      <p className="m-0 text-sm leading-snug">
        <span className="text-muted-foreground">Al terminar seguirás configurando</span>
        <br />
        <b className="line-clamp-1">{product.name}</b>
      </p>
    </div>
  )
}
