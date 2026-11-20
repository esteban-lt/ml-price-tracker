import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'
import { AuthProvider } from '@/features/auth/auth-context'
import { ResponsiveToaster } from '@/components/layout/responsive-toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { router } from './router'
import './index.css'

// Follow the system light/dark preference (dark mode is "deseable" in the guide).
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
const applyTheme = () => document.documentElement.classList.toggle('dark', darkQuery.matches)
applyTheme()
darkQuery.addEventListener('change', applyTheme)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry client errors (404, 401, 429…) or Mercado Libre outages: the user gets "Reintentar".
      retry: (failureCount, error) => failureCount < 1 && (!(error instanceof ApiError) || error.isNetworkError),
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
          <ResponsiveToaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
