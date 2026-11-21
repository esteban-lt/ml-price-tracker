import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BadgeCheck, ChevronRight, KeyRound, Loader2, LogOut, MonitorSmartphone, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DeleteAccountDialog } from '@/features/account/delete-account-dialog'
import { useAuth } from '@/features/auth/auth-context'
import { authApi, usersApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { cn, initials } from '@/lib/utils'

function Section({
  title,
  description,
  children,
  danger,
}: {
  title: string
  description: string
  children: ReactNode
  danger?: boolean
}) {
  return (
    <section
      className={cn(
        'grid gap-4 rounded-[20px] border bg-card p-5 sm:p-6 md:grid-cols-[240px_1fr] md:gap-8',
        danger ? 'border-destructive/30' : 'border-border',
      )}
    >
      <div>
        <h2 className={cn('m-0 font-display text-lg font-bold', danger && 'text-destructive')}>{title}</h2>
        <p className="m-0 mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

/** A6 · Mi cuenta */
export function AccountPage() {
  const navigate = useNavigate()
  const { user: sessionUser, updateUser, logout, logoutAll } = useAuth()
  const profile = useQuery({ queryKey: ['me', 'profile'], queryFn: authApi.me })
  const user = profile.data ?? sessionUser
  const [logoutAllOpen, setLogoutAllOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const notifications = useMutation({
    mutationFn: (enabled: boolean) => usersApi.setEmailNotifications(enabled),
    onSuccess: (updated) => {
      updateUser(updated)
      profile.refetch()
      toast.success(
        updated.emailNotifications ? 'Activaste las alertas por correo' : 'Desactivaste las alertas por correo',
      )
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const closeAll = useMutation({
    mutationFn: logoutAll,
    onSuccess: () => {
      navigate('/', { replace: true })
      toast.success('Cerraste sesión en todos tus dispositivos')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const closeThis = useMutation({
    mutationFn: logout,
    onSettled: () => {
      navigate('/', { replace: true })
      toast.success('Cerraste sesión')
    },
  })

  if (!user) return null
  const emailEnabled = notifications.isPending ? notifications.variables : user.emailNotifications

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-5 px-4 py-8 sm:px-6 sm:py-9">
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-success-soft text-lg font-bold text-success-soft-foreground">
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <h1 className="m-0 font-display text-[clamp(28px,5vw,34px)] font-extrabold">Mi cuenta</h1>
          <p className="m-0 truncate text-muted-foreground">
            {user.name} · {user.email}
          </p>
        </div>
      </div>

      <Section title="Datos" description="Tu información de registro.">
        <dl className="m-0 grid gap-3 sm:grid-cols-[140px_1fr]">
          <dt className="text-sm text-muted-foreground">Nombre</dt>
          <dd className="m-0 font-medium">{user.name}</dd>
          <dt className="text-sm text-muted-foreground">Correo</dt>
          <dd className="m-0 flex flex-wrap items-center gap-2 font-medium break-all">
            {user.email}
            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success-soft-foreground">
              <BadgeCheck aria-hidden="true" className="size-3.5" />
              Verificado
            </span>
          </dd>
          <dt className="text-sm text-muted-foreground">Miembro desde</dt>
          <dd className="m-0 font-medium">{formatDate(user.createdAt)}</dd>
        </dl>
      </Section>

      <Section title="Notificaciones" description="Cómo quieres enterarte de las bajas de precio.">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="email-notifications" className="cursor-pointer font-semibold">
            Recibir alertas por correo
          </label>
          <div className="flex items-center gap-2">
            {notifications.isPending && (
              <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              id="email-notifications"
              checked={emailEnabled}
              disabled={notifications.isPending}
              onCheckedChange={(checked) => notifications.mutate(checked)}
              aria-describedby="email-notifications-note"
              className="origin-right scale-[1.35]"
            />
          </div>
        </div>
        <p id="email-notifications-note" className="m-0 mt-2 text-sm text-muted-foreground">
          Las alertas siempre aparecen en la app.
        </p>
      </Section>

      <Section title="Seguridad" description="Tu contraseña y las sesiones abiertas.">
        <div className="flex flex-col divide-y divide-border">
          <Link
            to="/cuenta/contrasena"
            className="flex items-center gap-3 py-3 font-semibold text-foreground no-underline first:pt-0 hover:text-primary"
          >
            <KeyRound aria-hidden="true" className="size-5 text-muted-foreground" />
            <span className="flex-1">Cambiar contraseña</span>
            <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
          </Link>
          <button
            type="button"
            onClick={() => setLogoutAllOpen(true)}
            className="flex items-center gap-3 py-3 text-left font-semibold hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <MonitorSmartphone aria-hidden="true" className="size-5 text-muted-foreground" />
            <span className="flex-1">Cerrar sesión en todos los dispositivos</span>
            <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
          </button>
        </div>
      </Section>

      <Section title="Sesión" description="Cierra la sesión en este navegador.">
        <Button variant="outline" onClick={() => closeThis.mutate()} disabled={closeThis.isPending}>
          {closeThis.isPending ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <LogOut aria-hidden="true" />
          )}
          Cerrar sesión
        </Button>
      </Section>

      <Section title="Zona de peligro" description="Acciones que no se pueden deshacer." danger>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 max-w-sm text-sm text-muted-foreground">
            Elimina tu cuenta, tus seguimientos y tus alertas de forma permanente.
          </p>
          <Button
            variant="destructive-ghost"
            className="border border-destructive/40"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 aria-hidden="true" />
            Eliminar cuenta
          </Button>
        </div>
      </Section>

      <AlertDialog open={logoutAllOpen} onOpenChange={(open) => !closeAll.isPending && setLogoutAllOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader className="items-start text-left">
            <AlertDialogTitle className="font-display text-xl font-bold">
              ¿Cerrar sesión en todos los dispositivos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se cerrará tu sesión en todos los navegadores y teléfonos, incluido este.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closeAll.isPending}>Cancelar</AlertDialogCancel>
            <Button onClick={() => closeAll.mutate()} disabled={closeAll.isPending}>
              {closeAll.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
              Cerrar todas las sesiones
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  )
}
