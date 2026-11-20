import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { trackingApi } from '@/lib/api/endpoints'
import type { PriceSnapshot, Threshold, TrackedProduct } from '@/lib/api/types'
import { errorMessage } from '@/lib/errors'
import { useAuth } from '@/features/auth/auth-context'
import { alertKeys } from '@/features/alerts/queries'

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

export function useTrackedProduct(id: string) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: trackingKeys.detail(id),
    queryFn: () => trackingApi.get(id),
    enabled: !!id,
    // Show the list's copy right away while the detail loads.
    initialData: () => queryClient.getQueryData<TrackedProduct[]>(trackingKeys.list)?.find((t) => t.id === id),
    initialDataUpdatedAt: () => queryClient.getQueryState(trackingKeys.list)?.dataUpdatedAt,
  })
}

/** Map of catalog id (MLM…) → tracking id, to show "Siguiendo" on catalog cards. */
export function useFollowedProducts() {
  const { data } = useTrackedProducts()
  return useMemo(() => new Map((data ?? []).map((t) => [t.product.externalId, t.id])), [data])
}

export function usePriceHistory(productId: string | undefined, days: number) {
  return useQuery({
    queryKey: trackingKeys.history(productId ?? '', days),
    queryFn: () => trackingApi.priceHistory(productId!, days),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * The tracking has no current price: it's the last snapshot of the history
 * (guide A1). Uses the 7-day history, shared between the list and the detail.
 */
export function useLatestSnapshot(productId: string | undefined) {
  return useQuery({
    queryKey: trackingKeys.history(productId ?? '', 7),
    queryFn: () => trackingApi.priceHistory(productId!, 7),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    select: (snapshots: PriceSnapshot[]) => snapshots.at(-1) ?? null,
  })
}

/** Pause / resume / edit threshold / unfollow, keeping list and detail caches in sync. */
export function useTrackingActions() {
  const queryClient = useQueryClient()

  const store = (tracking: TrackedProduct) => {
    queryClient.setQueryData(trackingKeys.detail(tracking.id), tracking)
    queryClient.setQueryData<TrackedProduct[]>(trackingKeys.list, (list) =>
      list?.map((t) => (t.id === tracking.id ? tracking : t)),
    )
  }
  const onError = (error: unknown) => toast.error(errorMessage(error))

  const pause = useMutation({
    mutationFn: (id: string) => trackingApi.pause(id),
    onSuccess: (tracking) => {
      store(tracking)
      toast.success('Seguimiento pausado')
    },
    onError,
  })

  const resume = useMutation({
    mutationFn: (id: string) => trackingApi.resume(id),
    onSuccess: (tracking) => {
      store(tracking)
      toast.success('Seguimiento reanudado')
    },
    onError,
  })

  const updateThreshold = useMutation({
    mutationFn: ({ id, threshold }: { id: string; threshold: Threshold }) => trackingApi.updateThreshold(id, threshold),
    onSuccess: (tracking) => {
      store(tracking)
      toast.success('Umbral actualizado')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => trackingApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<TrackedProduct[]>(trackingKeys.list, (list) => list?.filter((t) => t.id !== id))
      queryClient.removeQueries({ queryKey: trackingKeys.detail(id) })
      // Its alerts are deleted too.
      queryClient.invalidateQueries({ queryKey: alertKeys.all })
      toast.success('Dejaste de seguir este producto')
    },
    onError,
  })

  return { pause, resume, updateThreshold, remove }
}
