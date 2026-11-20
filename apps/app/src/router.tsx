import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { AuthLayout } from '@/components/layout/auth-layout'
import { RequireAuth, RequireGuest } from '@/features/auth/route-guards'
import { ForgotPasswordPage } from '@/pages/auth/forgot-password-page'
import { LoginPage } from '@/pages/auth/login-page'
import { RegisterPage } from '@/pages/auth/register-page'
import { ResetPasswordPage } from '@/pages/auth/reset-password-page'
import { UnsubscribePage } from '@/pages/auth/unsubscribe-page'
import { VerifyEmailPage } from '@/pages/auth/verify-email-page'
import { AccountPage } from '@/pages/account-page'
import { AdminMercadoLibrePage } from '@/pages/admin-mercado-libre-page'
import { AlertsPage } from '@/pages/alerts-page'
import { BestSellersPage } from '@/pages/best-sellers-page'
import { ChangePasswordPage } from '@/pages/change-password-page'
import { CategoriesPage } from '@/pages/categories-page'
import { HomePage } from '@/pages/home-page'
import { SearchPage } from '@/pages/search-page'
import { TrackingDetailPage } from '@/pages/tracking-detail-page'
import { TrackingsPage } from '@/pages/trackings-page'
import { NotFoundPage } from '@/pages/not-found-page'

// Route names follow the screens guide. /reset-password and /unsubscribe are
// fixed: the API's emails link to them.
export const router = createBrowserRouter([
  // Account screens: minimal layout, no search or menus.
  {
    element: <AuthLayout />,
    children: [
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/unsubscribe', element: <UnsubscribePage /> },
      {
        element: <RequireGuest />,
        children: [
          { path: '/registro', element: <RegisterPage /> },
          { path: '/iniciar-sesion', element: <LoginPage /> },
          { path: '/verificar-correo', element: <VerifyEmailPage /> },
          { path: '/recuperar-contrasena', element: <ForgotPasswordPage /> },
        ],
      },
    ],
  },

  {
    element: <AppLayout />,
    children: [
      // Public
      { path: '/', element: <HomePage /> },
      { path: '/categorias', element: <CategoriesPage /> },
      { path: '/categorias/:slug', element: <BestSellersPage /> },
      { path: '/buscar', element: <SearchPage /> },

      // With a session
      {
        element: <RequireAuth />,
        children: [
          { path: '/seguimientos', element: <TrackingsPage /> },
          { path: '/seguimientos/:id', element: <TrackingDetailPage /> },
          { path: '/alertas', element: <AlertsPage /> },
          { path: '/cuenta', element: <AccountPage /> },
          { path: '/cuenta/contrasena', element: <ChangePasswordPage /> },
          { path: '/admin/mercado-libre', element: <AdminMercadoLibrePage /> },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
