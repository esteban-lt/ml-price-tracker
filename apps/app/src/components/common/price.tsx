import { discountPercent, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

interface PriceProps {
  price: number
  originalPrice?: number | null
  currency?: string
  size?: 'lg' | 'md' | 'sm'
  className?: string
}

const SIZES = {
  lg: { price: 'text-[32px] leading-[1.05]', strike: 'text-sm' },
  md: { price: 'text-[22px] leading-tight', strike: 'text-[13px]' },
  sm: { price: 'text-[15px]', strike: 'text-xs' },
}

/** Price with the original one struck through and the discount, when there is one. */
export function Price({ price, originalPrice, currency = 'MXN', size = 'md', className }: PriceProps) {
  const discount = discountPercent(price, originalPrice)
  const styles = SIZES[size]
  return (
    <div className={className}>
      {discount != null && originalPrice != null && (
        <div className="flex items-center gap-1.5">
          <span className={cn('num text-subtle line-through', styles.strike)}>
            <span className="sr-only">Antes </span>
            {formatPrice(originalPrice, currency)}
          </span>
          <DiscountTag value={discount} />
        </div>
      )}
      <div className={cn('num font-[650]', styles.price)}>
        {discount != null && <span className="sr-only">Ahora </span>}
        {formatPrice(price, currency)}
      </div>
    </div>
  )
}

export function DiscountTag({ value }: { value: number }) {
  return (
    <span className="num rounded-md bg-success-soft px-1.5 py-0.5 text-xs font-bold whitespace-nowrap text-success-soft-foreground">
      -{value} %
    </span>
  )
}
