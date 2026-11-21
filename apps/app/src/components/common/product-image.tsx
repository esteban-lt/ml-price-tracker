import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Mercado Libre serves each photo in several sizes by suffix: -F (~1200 px),
 * -O (~500 px), -V (~250 px), -I (~90 px), as .jpg or .webp. The API returns
 * -F.jpg (~80 KB); a card only needs -O.webp (~5 KB).
 */
export type ImageSize = 'thumb' | 'card' | 'large'
const SUFFIX: Record<ImageSize, string> = { thumb: 'V', card: 'O', large: 'F' }

export function mercadoLibreImage(url: string, size: ImageSize) {
  if (!/^https:\/\/[^/]*mlstatic\.com\//.test(url)) return url
  return url.replace(/-[A-Z]\.(jpe?g|webp|png)$/i, `-${SUFFIX[size]}.webp`)
}

interface ProductImageProps {
  src: string | null | undefined
  alt?: string
  size?: ImageSize
  className?: string
  imgClassName?: string
  children?: React.ReactNode
}

/**
 * Square white frame with the photo contained inside (Mercado Libre photos have
 * white backgrounds and mixed sizes). Shows a placeholder when there's no image.
 */
export function ProductImage({ src, alt = '', size = 'card', className, imgClassName, children }: ProductImageProps) {
  // 0: optimized variant, 1: original URL from the API, 2: give up.
  const [attempt, setAttempt] = useState(0)
  const url = src ? (attempt === 0 ? mercadoLibreImage(src, size) : src) : null

  return (
    <div className={cn('product-frame relative', className)}>
      {url && attempt < 2 ? (
        <img
          key={url}
          src={url}
          alt={alt}
          loading={size === 'large' ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setAttempt((a) => (a === 0 && url !== src ? 1 : 2))}
          className={cn('size-full object-contain p-2', imgClassName)}
        />
      ) : (
        <ImageOff aria-hidden="true" className="size-1/3 max-h-12 max-w-12" />
      )}
      {children}
    </div>
  )
}
