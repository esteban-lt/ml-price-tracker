import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { trackingApi } from '@/lib/api/endpoints'
import { useAuth } from '@/features/auth/auth-context'

export const trackingKeys = {
  all: ['me', 'tracked'] as const,
  list: ['me', 'tracked', 'list'] as const,
  detail: (id: string) => ['me', 'tracked', 'detail', id] as const,
  history: (productId: string, days: number) => ['me', 'price-history', productId, days] as const,
}

export function useTrackedProducts() {
  const { status } = useAuth()
  return useQuery({
    queryKey: trackingKeys.list,
    queryFn: trackingApi.list,
    enabled: status === 'authenticated',
  })
}

/** Map of catalog id (MLM…) → tracking id, to show "Siguiendo" on catalog cards. */
export function useFollowedProducts() {
  const { data } = useTrackedProducts()
  return useMemo(() => new Map((data ?? []).map((t) => [t.product.externalId, t.id])), [data])
}
