import { useLocation, useNavigate } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuth } from './auth-context'

/** S2 · Sesión expirada */
export function SessionExpiredDialog() {
  const { sessionExpired, dismissSessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <AlertDialog open={sessionExpired} onOpenChange={(open) => !open && dismissSessionExpired()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl">Tu sesión terminó</AlertDialogTitle>
          <AlertDialogDescription>Inicia sesión de nuevo para continuar.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              dismissSessionExpired()
              navigate('/')
            }}
          >
            Ir al inicio
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              dismissSessionExpired()
              navigate('/iniciar-sesion', { state: { from: location.pathname + location.search } })
            }}
          >
            Iniciar sesión
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
