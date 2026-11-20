import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { RequireAuth, RequireGuest } from '@/features/auth/route-guards'
import { HomePage } from '@/pages/home-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { PlaceholderPage } from '@/pages/placeholder-page'

// Route names follow the screens guide. /reset-password and /unsubscribe are
// fixed: the API's emails link to them.
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      // Public
      { path: '/', element: <HomePage /> },
      { path: '/categorias', element: <PlaceholderPage code="P2" title="Categorías" /> },
      { path: '/categorias/:slug', element: <PlaceholderPage code="P3" title="Más vendidos" /> },
      { path: '/buscar', element: <PlaceholderPage code="P4" title="Resultados de búsqueda" /> },
      { path: '/reset-password', element: <PlaceholderPage code="C5" title="Restablecer contraseña" /> },
      { path: '/unsubscribe', element: <PlaceholderPage code="C6" title="Baja de alertas por correo" /> },
      { path: '/verificar-correo', element: <PlaceholderPage code="C2" title="Verificar correo" /> },

      // Only without a session
      {
        element: <RequireGuest />,
        children: [
          { path: '/registro', element: <PlaceholderPage code="C1" title="Crear cuenta" /> },
          { path: '/iniciar-sesion', element: <PlaceholderPage code="C3" title="Iniciar sesión" /> },
          { path: '/recuperar-contrasena', element: <PlaceholderPage code="C4" title="Olvidé mi contraseña" /> },
        ],
      },

      // With a session
      {
        element: <RequireAuth />,
        children: [
          { path: '/seguimientos', element: <PlaceholderPage code="A1" title="Mis seguimientos" /> },
          { path: '/seguimientos/:id', element: <PlaceholderPage code="A3" title="Detalle del seguimiento" /> },
          { path: '/alertas', element: <PlaceholderPage code="A5" title="Alertas" /> },
          { path: '/cuenta', element: <PlaceholderPage code="A6" title="Mi cuenta" /> },
          { path: '/cuenta/contrasena', element: <PlaceholderPage code="A7" title="Cambiar contraseña" /> },
          { path: '/admin/mercado-libre', element: <PlaceholderPage code="X1" title="Conexión con Mercado Libre" /> },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
