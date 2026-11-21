import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FormAlert, PasswordInput } from '@/components/common/form-field'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError } from '@/lib/api/client'
import { authApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/errors'

/** A8 · Eliminar cuenta (permanent; asks for the password). */
export function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const { clearSession } = useAuth()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const remove = useMutation({
    mutationFn: () => authApi.deleteAccount(password),
    onSuccess: () => {
      clearSession()
      navigate('/', { replace: true })
      toast.success('Tu cuenta se eliminó')
    },
  })

  const wrongPassword = remove.error instanceof ApiError && remove.error.status === 403
  const passwordError =
    submitted && !password ? 'Escribe tu contraseña.' : wrongPassword ? 'La contraseña no es correcta.' : null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!password) return
    remove.mutate()
  }

  function handleOpenChange(next: boolean) {
    if (remove.isPending) return // can't close while deleting
    if (!next) {
      setPassword('')
      setSubmitted(false)
      remove.reset()
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        showCloseButton={!remove.isPending}
        onOpenAutoFocus={(e) => {
          // Default focus on "Cancelar" for a destructive action.
          e.preventDefault()
          cancelRef.current?.focus()
        }}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <DialogHeader className="gap-2 pr-10 text-left">
            <span className="flex size-11 items-center justify-center rounded-full bg-destructive-soft text-destructive-soft-foreground">
              <TriangleAlert aria-hidden="true" className="size-5" />
            </span>
            <DialogTitle className="font-display text-[22px] font-bold">Eliminar tu cuenta</DialogTitle>
            <DialogDescription asChild>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[15px] text-muted-foreground">
                <li>Se borran tus seguimientos, tus alertas y tu historial de avisos.</li>
                <li>Se cierra tu sesión en todos los dispositivos.</li>
                <li>
                  <b className="text-foreground">No se puede deshacer.</b>
                </li>
              </ul>
            </DialogDescription>
          </DialogHeader>

          <Field label="Escribe tu contraseña para confirmar" error={passwordError}>
            {(props) => (
              <PasswordInput
                {...props}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (remove.isError) remove.reset()
                }}
                autoComplete="current-password"
              />
            )}
          </Field>

          {remove.isError && !wrongPassword && <FormAlert>{errorMessage(remove.error)}</FormAlert>}

          <DialogFooter className="flex-col-reverse gap-2.5 sm:flex-row">
            <Button
              ref={cancelRef}
              type="button"
              variant="outline"
              disabled={remove.isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={remove.isPending}>
              {remove.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {remove.isPending ? 'Eliminando…' : 'Eliminar mi cuenta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
