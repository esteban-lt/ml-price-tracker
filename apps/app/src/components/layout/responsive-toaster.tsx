import { useSyncExternalStore } from 'react'
import { Toaster } from '@/components/ui/sonner'

const query = '(min-width: 768px)'
const subscribe = (callback: () => void) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

/** Toasts: bottom on mobile, top right on desktop; they close after ~4.5 s (guide 4.3). */
export function ResponsiveToaster() {
  const desktop = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
  return <Toaster position={desktop ? 'top-right' : 'bottom-center'} duration={4500} closeButton={false} />
}
