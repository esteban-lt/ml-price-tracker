import { useQuery } from '@tanstack/react-query'
import { alertsApi } from '@/lib/api/endpoints'
import { useAuth } from '@/features/auth/auth-context'

export const alertKeys = {
  all: ['me', 'alerts'] as const,
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
