import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { CatalogProduct } from '@/lib/api/types'
import { useAuth } from '@/features/auth/auth-context'
import { FollowDialog } from './follow-dialog'
import { savePendingFollow, takePendingFollow } from './pending-follow'

interface FollowContextValue {
  /** "Seguir precio": opens A2, or sends the visitor to log in and keeps the intent. */
  follow: (product: CatalogProduct) => void
}

const FollowContext = createContext<FollowContextValue | null>(null)

export function FollowProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [product, setProduct] = useState<CatalogProduct | null>(null)
  const [open, setOpen] = useState(false)

  const follow = useCallback(
    (next: CatalogProduct) => {
      if (status === 'authenticated') {
        setProduct(next)
        setOpen(true)
        return
      }
      savePendingFollow(next)
      navigate('/iniciar-sesion', {
        state: { from: location.pathname + location.search, reason: 'follow' },
      })
    },
    [status, navigate, location.pathname, location.search],
  )

  // Back from login/registration with a saved intent: reopen A2 for that product.
  useEffect(() => {
    if (status !== 'authenticated') return
    const pending = takePendingFollow()
    if (pending) {
      setProduct(pending)
      setOpen(true)
    }
  }, [status])

  const value = useMemo(() => ({ follow }), [follow])

  return (
    <FollowContext.Provider value={value}>
      {children}
      {product && <FollowDialog product={product} open={open} onOpenChange={setOpen} />}
    </FollowContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useFollow() {
  const context = useContext(FollowContext)
  if (!context) throw new Error('useFollow must be used inside <FollowProvider>')
  return context
}
