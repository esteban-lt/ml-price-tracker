import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { alertsApi } from '@/lib/api/endpoints'
import type { AlertList } from '@/lib/api/types'
import { errorMessage } from '@/lib/errors'
import { useAuth } from '@/features/auth/auth-context'

export const ALERTS_PAGE_SIZE = 20

export const alertKeys = {
  all: ['me', 'alerts'] as const,
  list: (unread: boolean) => ['me', 'alerts', 'list', unread ? 'unread' : 'all'] as const,
  unreadCount: ['me', 'alerts', 'unread-count'] as const,
}

/** Unread alerts for the bell. Refreshed on page load and every 5 minutes (no real-time). */
export function useUnreadAlertsCount() {
  const { status } = useAuth()
  return useQuery({
    queryKey: alertKeys.unreadCount,
    queryFn: alertsApi.unreadCount,
    enabled: status === 'authenticated',
    refetchInterval: 5 * 60 * 1000,
    select: (data) => data.count,
  })
}

/** Alerts inbox, 20 per page with "Cargar más". */
export function useAlerts(unread: boolean) {
  return useInfiniteQuery({
    queryKey: alertKeys.list(unread),
    queryFn: ({ pageParam }) =>
      alertsApi.list({ page: pageParam, limit: ALERTS_PAGE_SIZE, unread: unread || undefined }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    // The inbox is refreshed every time it's opened.
    staleTime: 0,
  })
}

export function useAlertActions() {
  const queryClient = useQueryClient()

  const markRead = useMutation({
    mutationFn: (id: string) => alertsApi.markRead(id),
    onMutate: (id) => {
      // Optimistic: mark it read in the "Todas" list and lower the bell counter.
      const now = new Date().toISOString()
      for (const unread of [false, true]) {
        queryClient.setQueryData<InfiniteData<AlertList>>(alertKeys.list(unread), (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.map((a) => (a.id === id && !a.readAt ? { ...a, readAt: now } : a)),
                })),
              }
            : data,
        )
      }
      queryClient.setQueryData<{ count: number }>(alertKeys.unreadCount, (data) =>
        data ? { count: Math.max(0, data.count - 1) } : data,
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.unreadCount })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => alertsApi.markAllRead(),
    onSuccess: () => {
      queryClient.setQueryData(alertKeys.unreadCount, { count: 0 })
      queryClient.invalidateQueries({ queryKey: alertKeys.all })
      toast.success('Marcaste todas como leídas')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return { markRead, markAllRead }
}
