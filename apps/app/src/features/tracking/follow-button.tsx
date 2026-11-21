import { Link } from 'react-router'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CatalogProduct } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { useFollow } from './follow-context'
import { useFollowedProducts } from './queries'

/** "Seguir precio", or "Siguiendo" (link to the tracking) when the user already follows it. */
export function FollowButton({
  product,
  className,
  size,
  onBeforeFollow,
}: {
  product: CatalogProduct
  className?: string
  size?: 'default' | 'sm' | 'lg'
  onBeforeFollow?: () => void
}) {
  const followed = useFollowedProducts()
  const { follow } = useFollow()
  const trackingId = followed.get(product.id)

  if (trackingId) {
    return (
      <Button
        asChild
        variant="secondary"
        size={size}
        className={cn('bg-muted text-muted-foreground hover:bg-border', className)}
      >
        <Link to={`/seguimientos/${trackingId}`} aria-label={`Ya sigues ${product.name}. Ver seguimiento`}>
          <Check aria-hidden="true" />
          Siguiendo
        </Link>
      </Button>
    )
  }

  return (
    <Button
      size={size}
      className={className}
      onClick={() => {
        onBeforeFollow?.()
        follow(product)
      }}
    >
      Seguir precio
    </Button>
  )
}
