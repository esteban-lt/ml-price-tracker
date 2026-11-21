import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { Field, FormAlert, PasswordInput, PasswordRequirements } from '@/components/common/form-field'
import { useAuth } from '@/features/auth/auth-context'
import { isStrongPassword } from '@/features/auth/password'
import { ApiError } from '@/lib/api/client'
import { authApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/errors'

/** A7 · Cambiar contraseña */
export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, startSession, logout } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const change = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: current, newPassword: next }),
    // All sessions are closed and a new one is returned: keep the user signed in here.
    onSuccess: (session) => {
      startSession(session)
      toast.success('Contraseña actualizada')
      navigate('/cuenta', { replace: true })
    },
  })

  const wrongCurrent = change.error instanceof ApiError && change.error.status === 403
  const errors = {
    current: !current ? 'Escribe tu contraseña actual.' : null,
    next: !isStrongPassword(next) ? 'La contraseña no cumple los requisitos.' : null,
    confirm: confirm !== next ? 'Las contraseñas no coinciden.' : null,
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (errors.current || errors.next || errors.confirm) return
    change.mutate()
  }

  async function forgotCurrent() {
    const email = user?.email
    try {
      await logout()
    } finally {
      navigate('/recuperar-contrasena', { state: { email } })
    }
  }

  const generalError =
    change.isError && !wrongCurrent
      ? change.error instanceof ApiError && change.error.status === 429
        ? 'Demasiados intentos. Espera un minuto.'
        : errorMessage(change.error)
      : null

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-5 px-4 py-8 sm:px-6 sm:py-9">
      <Breadcrumbs items={[{ label: 'Mi cuenta', to: '/cuenta' }, { label: 'Cambiar contraseña' }]} />
      <div>
        <h1 className="m-0 font-display text-[clamp(28px,5vw,34px)] font-extrabold">Cambiar contraseña</h1>
        <p className="m-0 mt-1 text-muted-foreground">Cerraremos tu sesión en los demás dispositivos.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4 rounded-[20px] border border-border bg-card p-5 sm:p-6"
      >
        <Field
          label="Contraseña actual"
          error={wrongCurrent ? 'La contraseña actual no es correcta.' : submitted && errors.current}
        >
          {(props) => (
            <PasswordInput
              {...props}
              value={current}
              onChange={(e) => {
                setCurrent(e.target.value)
                if (wrongCurrent) change.reset()
              }}
              autoComplete="current-password"
              autoFocus
            />
          )}
        </Field>
        <Field
          label="Contraseña nueva"
          after={<PasswordRequirements id="change-pw-reqs" password={next} showErrors={submitted} />}
        >
          {(props) => (
            <PasswordInput
              {...props}
              aria-describedby="change-pw-reqs"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
            />
          )}
        </Field>
        <Field label="Confirmar contraseña nueva" error={submitted && errors.confirm}>
          {(props) => (
            <PasswordInput
              {...props}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          )}
        </Field>

        {generalError && <FormAlert>{generalError}</FormAlert>}

        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button asChild variant="outline">
            <Link to="/cuenta">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={change.isPending}>
            {change.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
            Guardar
          </Button>
        </div>
      </form>

      <button
        type="button"
        onClick={forgotCurrent}
        className="self-center text-sm font-semibold text-accent-foreground hover:underline"
      >
        ¿No recuerdas tu contraseña actual?
      </button>
    </div>
  )
}
