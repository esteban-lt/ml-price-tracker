import type { CatalogProduct } from '@/lib/api/types'

/** "Seguir precio" pressed without a session: remembered through login/registration (same tab). */
const PENDING_KEY = 'nudge:pending-follow'

export function savePendingFollow(product: CatalogProduct) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(product))
  } catch {
    // Private mode: the user will just have to press "Seguir precio" again.
  }
}

export function peekPendingFollow(): CatalogProduct | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as CatalogProduct) : null
  } catch {
    return null
  }
}

export function takePendingFollow(): CatalogProduct | null {
  const pending = peekPendingFollow()
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // ignore
  }
  return pending
}
